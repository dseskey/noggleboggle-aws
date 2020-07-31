

const db = require("../db");
const ws = require("../websocket-client");
const sanitize = require("sanitize-html");
"use strict";
const mongoConnection = require('../mongo/mongoConnection').connectToDatabase;
const incrementQuestion = require('../mongo/mongoActions').incrementQuestion;

let cachedDb = null;
const wsClient = new ws.Client();

const success = {
    statusCode: 200
};

const fail500 = {
    statusCode: 500
};



async function next(event, context, callback) {


    // {"questionId":0, "answer":1, "type": "multipleChoice"}
    const body = JSON.parse(event.body);
    const gameId = body.gameId;
    try {
        const mongoDb = await mongoConnection();
        const incrementStatus = await incrementQuestion(mongoDb, gameId);
        return wsClient.send(event, {
            event: "game-status",
            channelId: body.channelId,
            incrementStatus
        });
    } catch (err) {
        console.error(err);
        let response = {"status":"error","message":"There was an error incrementing the question, please try again."}
        return wsClient.send(event, {
            event: "game-status",
            channelId: body.channelId,
            response
        });
    }
}



module.exports = {
    next
};


