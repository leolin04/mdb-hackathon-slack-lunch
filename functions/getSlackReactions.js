exports = function(ts, channel){
  const TOKEN = context.values.get("SLACK_API_TOKEN");
  return context.services.get("http-service").get({
    url: "https://slack.com/api/reactions.get?channel="+channel+"&timestamp="+ts,
    headers: { Authorization: ["Bearer "+TOKEN], "Content-Type": ["application/json"] }
  });
};