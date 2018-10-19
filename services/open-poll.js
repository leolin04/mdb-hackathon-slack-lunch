// Try running in the console below.
const MONGO_HQ_ADDRESS = '1633 Broadway,10019';

function getRestaurants(address, channel, next) {
  const EMOJIS = context.values.get("EMOJIS");
  context.functions.execute("searchNearbyRestaurants", address, function(restaurants) {
    if(restaurants && restaurants.length !== 0) {
      // assign an emoji to each one
      for(var i = 0; i < restaurants.length; i++) {
        restaurants[i].emoji = EMOJIS[i];
      }
      next(restaurants);
    } else {
      context.functions.execute("postSlackMessage", channel, "No restaurants found nearby!");
    }
  });
}

function getPollsCollection() {
   return context.functions.execute("getPollsCollection");
}

function generatePollString(restaurants) {
  return "What's for lunch?  Use emoji to vote!  /eat to close the poll.\n"+restaurants.map(function(r) {return "> :"+r.emoji+": "+generateRestaurantString(r)}).join("\n");
}

function generateRestaurantString(restaurant) {
  var s = restaurant.name;
  if (restaurant.rating) {
    const rating = Math.round(restaurant.rating);
    s += " ";
    for (var i = 0; i < rating; i++) {
      s += ":star:";
    }
  }
  if (restaurant.price_level) {
    s += " ";
    for (var i = 0; i < restaurant.price_level; i++) {
      s += ":heavy_dollar_sign:";
    }
  }
  return s;
}

function createPoll(channel, address) {
  const polls = getPollsCollection();
  address = address || MONGO_HQ_ADDRESS;
  
  getRestaurants(address, channel, function(restaurants) {
    const poll = generatePollString(restaurants);
    context.functions.execute("postSlackMessage", channel, poll).then(function(response) {
      if(response.statusCode === 200) {
        const body = JSON.parse(response.body.text());
        // store poll in database
        polls.insertOne({
          _id: body.ts, // Slack message ID
          channel: body.channel,
          restaurants: restaurants,
          status: "open"
        });
      } else {
        console.log("Unable to create Slack poll: "+response.body);
      }
    });
  });
}
  
exports = function(payload) {
  const polls = getPollsCollection();
  const channel = payload.query.channel_id || context.values.get("SLACK_CHANNEL");
  const address = payload.query.text;
  polls.findOne({status: "open", channel: channel}).then(exists => {
    if (exists) {
      context.functions.execute("postSlackMessage", channel, "Lunch poll already open!");
    } else {
      context.functions.execute("postSlackMessage", channel, "Looking for a place to eat...");
      createPoll(channel, address);
    }
  });
};