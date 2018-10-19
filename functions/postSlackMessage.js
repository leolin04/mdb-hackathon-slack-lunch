exports = function(channel ,msg, actions){
  const TOKEN = context.values.get("SLACK_API_TOKEN");
  var body = {
    channel: channel || context.values.get("SLACK_CHANNEL"),
    text: msg
  };
  if(actions) {
    body.attachments = [{fallback: "Useful links", actions:actions}];
  }
  return context.services.get("http-service").post({
    url: "https://slack.com/api/chat.postMessage",
    body: body,
    encodeBodyAsJSON: true,
    headers: { Authorization: ["Bearer "+TOKEN], "Content-Type": ["application/json"] }
  });
};