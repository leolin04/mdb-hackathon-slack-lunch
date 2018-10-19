const GOOGLE_PLACE_API_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?" +
                             "location={lat},{lng}" +
                             "&radius=200" +
                             "&types=food|restaurant" +
                             "&key={key}";
const GOOGLE_GEOCODE_URL="https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={key}";
const MONGO_HQ_ADDRESS = '1633%20Broadway,10019';
const NUM_PLACES_TO_RETURN = 4;

function transformGooglePlaces(result) {
  return result.results.map(place => {
    const transformed = {};
    transformed.name = place.name;
    transformed.place_id = place.place_id;
    transformed.rating = place.rating;
    transformed.price_level = place.price_level;
    transformed.vicinity = place.vicinity;
    return transformed;
  });
}

function getRandomSubarray(arr, size) {
    var shuffled = arr.slice(0), i = arr.length, temp, index;
    while (i--) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(0, size);
}

function randomSelectPlace(places) {
  return getRandomSubarray(places, NUM_PLACES_TO_RETURN);
}

function geolookup(address){
  const http = context.services.get("http-service");
  return http
      .get({ url: GOOGLE_GEOCODE_URL.replace("{address}", encodeURI(address)).replace("{key}", context.values.get("GOOGLE_GEOCODE_API_KEY")) })
      .then(resp => {
        return EJSON.parse(resp.body.text()).results[0].geometry.location;
      });
}

function search(searchURL) {
  const http = context.services.get("http-service");
  return http
      .get({ url: searchURL })
      .then(resp => {
        const searchResults = EJSON.parse(resp.body.text());
        //console.log("searchResults:", JSON.stringify(searchResults));
        if (!searchResults|| searchResults.results.length === 0) {
          return [];
        }
        const transformedPlaces = transformGooglePlaces(searchResults);
        return transformedPlaces;
      })
      .catch(e => {
        return [];
      });
}

function lunchPlaces(address, next){
  address = address || MONGO_HQ_ADDRESS;
  
  const result = geolookup(address)
    .then(location => {
      const searchURL = GOOGLE_PLACE_API_URL.replace("{lat}", location.lat)
                                            .replace("{lng}", location.lng)
                                            .replace("{key}", context.values.get("GOOGLE_PLACE_API_KEY"));
      
      return search(searchURL)
        .then(places => {
          return next(randomSelectPlace(places));
          // const promises = [];
          // const randomPlaces = randomSelectPlace(places);
          // randomPlaces.map(place => {
          //   const yelpInfoPromise = yelpLookup(place);
          //   promises.push(yelpInfoPromise);
          // });
          
          // return Promise.all(promises)
          //   .then(placesWithYelpInfo => {
          //     return next(placesWithYelpInfo);
          //   });
        });
    });
  return result;
}

exports = function(address, next){
  address = address || MONGO_HQ_ADDRESS;
  lunchPlaces(address, next);
};