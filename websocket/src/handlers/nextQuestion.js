

const db = require("../db");
const ws = require("../websocket-client");
const sanitize = require("sanitize-html");
"use strict";
const mongoConnection = require('../mongo/mongoConnection').connectToDatabase;
const incrementQuestion = require('../mongo/mongoActions').incrementQuestion;
const getUserAndGameIdFromConnection = require('../utilities').getUserAndGameIdFromConnection;

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
    let gameAndUserIdStatus = await getUserAndGameIdFromConnection(event);
    if (!gameAndUserIdStatus.status == 'success') {
        let message = gameAndUserIdStatus.message;
        console.log('==> Error getting user ID and game ID ' + JSON.stringify(error));
        return wsClient.send(event, {
            event: "game-status-error",
            channelId: body.channelId,
            message
        });
    } else {
        let { userId, gameId } = gameAndUserIdStatus;
        try {

            const mongoDb = await mongoConnection();
            const incrementStatus = await incrementQuestion(mongoDb, gameId, userId);
            let payload;
            if (incrementStatus.status == "CONTINUE") {
                payload = { "status": incrementStatus.status, "question": incrementStatus.question }
            } else {
                payload = { "status": incrementStatus.status, "message": incrementStatus.message }
            }
            return wsClient.send(event, {
                event: "game-status-success",
                channelId: gameId,
                payload
            });
        } catch (err) {
            console.error(err);
            let message = "There was an error incrementing the question, please try again."
            return wsClient.send(event, {
                event: "game-status-error",
                channelId: gameId,
                message
            });
        }
    }

}

module.exports = {
    next
};

