

const db = require("../db");
const ws = require("../websocket-client");
const sanitize = require("sanitize-html");
"use strict";
const mongoConnection = require('../mongo/mongoConnection').connectToDatabase;
const openGame = require('../mongo/mongoActions').openGame;
const getUserAndGameIdFromConnection = require('../utilities').getUserAndGameIdFromConnection;
let cachedDb = null;
const wsClient = new ws.Client();

const success = {
    statusCode: 200
};

const fail500 = {
    statusCode: 500
};



async function start(event, context, callback) {

    const body = JSON.parse(event.body);

    try {
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
            const mongoDb = await mongoConnection();
            const openedGame = await openGame(mongoDb, gameId);

            let payload = { "status": openedGame.status, "question": openedGame.question };
            return wsClient.send(event, {
                event: "game-status-success",
                channelId: gameId,
                payload
            });
        }
    } catch (err) {
        console.error(err);
        let message = err.message;
        return wsClient.send(event, {
            event: "game-status-error",
            channelId: body.channelId,
            message
        });
    }
}



module.exports = {
    start
};


