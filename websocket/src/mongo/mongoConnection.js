const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI = 'mongodb+srv://lambdauser:OV1f58N74qXv78Mw@noggleboggleeast.uppax.mongodb.net/noggle-boggle-trivia-dev?retryWrites=true&w=majority';

let cachedDb = null;

function connectToDatabase() {
    return new Promise((resolve, reject) => {
        if (cachedDb) {
            resolve(cachedDb);
        }

        MongoClient.connect(MONGODB_URI, function (err, mongoDb) {
            if (err) {
                console.log(err);
                reject(err);


            } else {
                // let connection = mongoDb.db('noggle-boggle-trivia-dev');
                console.log('=> connectingNonCached to database');
                cachedDb = mongoDb.db('noggle-boggle-trivia-dev');;
                resolve(cachedDb);
            }
        });
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


