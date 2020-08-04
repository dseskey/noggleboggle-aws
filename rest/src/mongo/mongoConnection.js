const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI = 'mongodb+srv://lambdauser:aOd6g1w3nOsA8NYb@noggleboggleeast.uppax.mongodb.net/<dbname>?retryWrites=true&w=majority';

let cachedDb = null;

async function connectToDatabase() {
  
        if (cachedDb) {
            return ({status: 200, db: cachedDb});
        }
        
        MongoClient.connect(MONGODB_URI, function (err, mongoDb) {
            if (err) {
                console.log(err);
                return({status: 500, message: err});


            } else {
                // let connection = mongoDb.db('noggle-boggle-trivia-dev');
                console.log('=> connectingNonCached to database');
                cachedDb = mongoDb.db('noggle-boggle-trivia-dev');;
                return ({status: 200, db: cachedDb});
            }
        });
   
    // return MongoClient.connect(uri)
    //     .then(db => {
    // console.log('=> connectingNonCached to database');
    // cachedDb = db;
    // return cachedDb;
    //     });
}

module.exports = {
    connectToDatabase
};


