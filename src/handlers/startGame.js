

const db = require("../db");
const ws = require("../websocket-client");
const sanitize = require("sanitize-html");
"use strict";
const mongoConnection = require('../mongo/mongoConnection').connectToDatabase;
const openGame = require('../mongo/mongoActions').openGame;

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
    const gameId = body.gameId;
    try {
        const mongoDb = await mongoConnection();
        const openedGame = await openGame(mongoDb, gameId);

        let payload = {"status": openedGame.status, "question": openedGame.question};
        return wsClient.send(event, {
            event: "game-status-success",
            channelId: body.channelId,
            payload
        });
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


