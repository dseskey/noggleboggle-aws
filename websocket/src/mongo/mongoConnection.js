const MongoClient = require('mongodb').MongoClient;
require('dotenv').config()
const {informational, error, warning}  = require('../logging/log');

let cachedDb = null;

function connectToDatabase() {
    return new Promise((resolve, reject) => {
        if (cachedDb) {
            informational('mongo/mongoConnection','connectToDatabase','promise','Using Cached MongoDB Connection.')
            resolve(cachedDb);
        }

        MongoClient.connect(process.env.MONGODB_URI, function (err, mongoDb) {
            if (err) {
                error('mongo/mongoConnection','connectToDatabase', 'MongoClient.Connect', err);
                reject(err);
            } else {
                // let connection = mongoDb.db('noggle-boggle-trivia-dev');
                informational('mongo/mongoConnection','connectToDatabase','promise','Using NON-Cached MongoDB Connection.')
                cachedDb = mongoDb.db(process.env.MONGODB_TABLE_NAME);;
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


