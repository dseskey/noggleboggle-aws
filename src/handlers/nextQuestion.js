

const db = require("../db");
const ws = require("../websocket-client");
const sanitize = require("sanitize-html");
"use strict";
const mongoConnection = require('../mongo/mongoConnection').connectToDatabase;
const incrementQuestion = require('../mongo/mongoActions').incrementQuestion;
const getGameIdFromConnection =  require('../utilities').getGameIdFromConnection;
let cachedDb = null;
const wsClient = new ws.Client();

const success = {
    statusCode: 200
};

const fail500 = {
    statusCode: 500
};



async function next(event, context, callback) {


    const body = JSON.parse(event.body);
    try {
        let gameId;
        const gameIdFromConnectionResult = await getGameIdFromConnection(event);
        if(gameIdFromConnectionResult.status == 'error'){
            let message= gameIdFromConnectionResult.message;

            return wsClient.send(event, {
                event: "game-status-error",
                channelId: body.channelId,
                message
            });
        }else{
            gameId = gameIdFromConnectionResult.gameId;
        }
        const mongoDb = await mongoConnection();
        const incrementStatus = await incrementQuestion(mongoDb, gameId);
        let payload;
        if(incrementStatus.status == "CONTINUE"){
            payload = {"status": incrementStatus.status, "question": incrementStatus.question}
        }else{
            payload = {"status": incrementStatus.status, "message": incrementStatus.message}
        }
        return wsClient.send(event, {
            event: "game-status-success",
            channelId: body.channelId,
            payload
        });
    } catch (err) {
        console.error(err);
        let message = "There was an error incrementing the question, please try again."
        return wsClient.send(event, {
            event: "game-status-error",
            channelId: body.channelId,
            message
        });
    }
}



module.exports = {
    next
};


