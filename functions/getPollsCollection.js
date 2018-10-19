exports = function(arg){
  const DB = context.values.get("DATABASE_NAME");
  const COLLECTION = context.values.get("POLLS_COLLECTION");
  return context.services.get("mongodb-atlas").db(DB).collection(COLLECTION);
};