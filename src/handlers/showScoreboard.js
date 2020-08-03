

const db = require("../db");
const ws = require("../websocket-client");
const sanitize = require("sanitize-html");
"use strict";
const mongoConnection = require('../mongo/mongoConnection').connectToDatabase;
const getDetailsForScoreboard = require('../mongo/mongoActions').getDetailsForScoreboard;
const getGameIdFromConnection = require('../utilities').getGameIdFromConnection;

let cachedDb = null;
const wsClient = new ws.Client();

const success = {
    statusCode: 200
};

const fail500 = {
    statusCode: 500
};



async function show(event, context, callback) {

    const body = JSON.parse(event.body);
    try {
        let gameId;
        const gameIdFromConnectionResult = await getGameIdFromConnection(event);
        if (gameIdFromConnectionResult.status == 'error') {
            let message = gameIdFromConnectionResult.message;

            return wsClient.send(event, {
                event: "game-status-error",
                channelId: body.channelId,
                message
            });
        } else {
            gameId = gameIdFromConnectionResult.gameId;
        }
        const mongoDb = await mongoConnection();
        const usersAndPlayersScores = await getDetailsForScoreboard(mongoDb, gameId);
        let usersFromDb = usersAndPlayersScores.usersFromDb;
        let playersAndScores = usersAndPlayersScores.playersAndScores.sort((a, b) => (a.totalPoints > b.totalPoints) ? -1 : ((b.totalPoints > a.totalPoints) ? 1 : 0));
        let scoreboard = playersAndScores.map((player) => {
            let user = usersFromDb.find((user) => user._id == player.playerId);
            return ({ playerId: player.playerId, totalScore: player.totalPoints, displayName: user.displayName })
        });

        let payload = scoreboard;
        return wsClient.send(event, {
            event: "game-status-success",
            channelId: body.channelId,
            payload
        });
    } catch (err) {
        console.error(err);
        let message = "There was an error generating the scoreboard."
        return wsClient.send(event, {
            event: "game-status-error",
            channelId: body.channelId,
            message
        });
    }
}



module.exports = {
    show
};

