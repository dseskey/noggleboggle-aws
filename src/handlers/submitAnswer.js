

const db = require("../db");
const ws = require("../websocket-client");
const sanitize = require("sanitize-html");
"use strict";
const MongoClient = require('mongodb').MongoClient;
const MONGODB_URI = ''; 

let cachedDb = null;
const wsClient = new ws.Client();

const success = {
    statusCode: 200
};

const fail500 = {
    statusCode: 500
};



function connectToDatabase (uri) {
    console.log('Connect to mongo database');

    if (cachedDb) {
        console.log('Using cached database instance');
        return Promise.resolve(cachedDb);
    }

    return MongoClient.connect(MONGODB_URI)
        .then(db => {
            console.log('Successful connect');
            cachedDb = db;
            return cachedDb;
        }).catch(err => {
            console.log('Connection error occurred: ', err);
            callback(err);
        });
}


async function submit(event, context, callback) {


    // {"questionId":0, "answer":1, "type": "multipleChoice"}
    const body = JSON.parse(event.body);
    const payload = body.payload;

    try {    
        console.log('=> preparing to connect to db')
        const mongoDb = await connectToDatabase(MONGODB_URI);
        console.log("Mongo connected");
        const userData = await queryDatabase(mongoDb);
        console.log('+> RETURNING DATA');
        console.log(userData);
        // const result = await insertUser(db, email);
        // console.log("Mongo insert succeeded", result);
        return success;
      } catch(err) {
        console.error(err);
      }

    // context.callbackWaitsForEmptyEventLoop = true;

    // console.log('event: ', event);

    // connectToDatabase(MONGODB_URI)
    //     .then(db => queryDatabase(db))
    //     .then(result => {
    //         console.log('=> returning result: ', result);
    //          callback(result);
    //     })
    //     .catch(err => {
    //         console.log('=> an error occurred: ', err);
    //         return err;
    //     });

    //     return success;

    // save message in database for later
    //TEst mongo
    // var MongoClient = require('mongodb').MongoClient;
    // MongoClient.connect('mongodb+srv://noggleBoggleServer-dev:19SkCxi6II7L0Xth@noggleboggleeast.uppax.mongodb.net/test', function (err, mongoDb) {
    //     if (err) {
    //         console.log('ERRORORS');
    //         console.log(err);
    //         return fail500;


    //     } else {
    //         console.log('hihihih')
    //         // let connection = mongoDb.db('noggle-boggle-trivia-dev');
    //         // console.log(connection);
    //         // mongoCollection = connection;
    //         return success;
    //     }
    // });
}


function connectToDatabase(uri) {
    return new Promise((resolve,reject) => {
        if (cachedDb) {
            console.log('=> using cached database instance');
            resolve(cachedDb);
        }
    
        MongoClient.connect('', function (err, mongoDb) {
            if (err) {
                console.log('ERRORORS');
                console.log(err);
                reject(err);
    
    
            } else {
                console.log('hihihih')
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

function queryDatabase(mongoDb) {
    console.log('=> query database');

    return mongoDb.collection('users').find({}).toArray()
        .then((users) => { 
            console.log("=> USERS");
            return { statusCode: 200, body: users }; 
        })
        .catch(err => {
            console.log('=> an error occurred: ', err);
            return { statusCode: 500, body: 'error' };
        });
}


module.exports = {
    submit
};


