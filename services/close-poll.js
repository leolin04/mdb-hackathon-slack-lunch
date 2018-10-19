// Try running in the console below.
const YELP_LOOKUP_URL = "https://api.yelp.com/v3/businesses/search?term={term}&location={location}";

function yelpLookup(place) {
  const http = context.services.get("http-service");
  return http
      .get(
        { 
          headers: {
            "Authorization" : ["Bearer " + context.values.get("YELP_API_KEY")]
          },
          url: YELP_LOOKUP_URL.replace("{term}", encodeURI(place.name)).replace("{location}", encodeURI(place.vicinity)) 
        })
      .then(resp => {
        const business = EJSON.parse(resp.body.text()).businesses[0];
        place.phone = business.phone && business.phone.replace(/^\+(\d{1})(\d{3})(\d{3})(\d{4})$/, "$2-$3-$4");
        place.url = business.url;
        return place;
      })
      .catch(e => {
        return place;
      });
}

function getPollsCollection() {
   return context.functions.execute("getPollsCollection");
}

function getRestaurantForEmoji(restaurants, emoji) {
  for(var i = 0; i < restaurants.length; i++) {
    if(restaurants[i].emoji == emoji) {
      return restaurants[i];
    }
  }
  return null;
}

function closePoll(poll) {
  const polls = getPollsCollection();
  // show poll results
  context.functions.execute("getSlackReactions", poll._id, poll.channel).then(reactions => {
    if(reactions.statusCode === 200) {
      const results = JSON.parse(reactions.body.text()).message.reactions;
      var winner = {count: 0, restaurants: []};
      if(results) {
        for(var i = 0; i < results.length; i++) {
          const emoji = results[i].name;
          const restaurant = getRestaurantForEmoji(poll.restaurants, emoji);
          if(restaurant) {
            if(results[i].count > winner.count) {
              winner = {
                count: results[i].count,
                restaurants: [restaurant]
              };
            } else if(results[i].count === winner.count) {
              winner.restaurants.push(restaurant);
            }
            // update poll entry in database with votes
            polls.updateOne(
              {_id: poll._id, restaurants: {$elemMatch: {place_id: restaurant.place_id}}},
              {$set: {"restaurants.$.votes": results[i].count}}
            );
          }
        }
      }
      var message = "Keep voting!";
      if(winner.count && winner.restaurants.length === 1) {
        // close poll
        polls.updateOne({_id: poll._id}, {"$set": {status: "closed"}});
        const restaurant = winner.restaurants[0];
        
        yelpLookup(restaurant)
          .then(restaurantWithYelpInfo => {
            let resultMessage = "Let's eat at " + restaurantWithYelpInfo.name + "!";
            if (restaurantWithYelpInfo.phone) {
              resultMessage += " Call " + restaurantWithYelpInfo.phone + " to make a reservation.";
            }
            const buttons = [
            {
              type: "button",
              text: "Directions :world_map:",
              url: "https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(restaurantWithYelpInfo.vicinity)
            },
            {
              type: "button",
              text: "Yelp :knife_fork_plate:",
              url: restaurantWithYelpInfo.url
            }
            ];
            context.functions.execute("postSlackMessage", poll.channel, resultMessage, buttons);
          })
          .catch(e=> {
            context.functions.execute("postSlackMessage", poll.channel, "Oops!");
          });

      } else {
        context.functions.execute("postSlackMessage", poll.channel, "Break the tie, keep voting!"); 
      }
    }
  });
}
  
exports = function(payload) {
  const polls = getPollsCollection();
  const channel = payload.query.channel_id || context.values.get("SLACK_CHANNEL");
  polls.findOne({status: "open", channel: channel}).then(exists => {
    if (exists) {
      closePoll(exists);
    } else {
      context.functions.execute("postSlackMessage", channel, "Use /lunch to create a poll first");
    }
  });
};