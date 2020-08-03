

const db = require("../db");
const ws = require("../websocket-client");
const sanitize = require("sanitize-html");
const mongoConnection = require('../mongo/mongoConnection').connectToDatabase;
const processGameState = require('../utilities').processGameState;
const getUserAndGameIdFromConnection = require('../utilities').getUserAndGameIdFromConnection;

"use strict";

const wsClient = new ws.Client();

const success = {
    statusCode: 200
};

const fail500 = {
    statusCode: 500
};

/*
const getUserIdFromConnection = require('./utilities').getUserIdFromConnection;
          console.log('=> Calling get user ID from connection')
          let x = await getUserIdFromConnection(event);
          console.log("x = " + JSON.stringify(x));
          */

async function join(event, context, callback) {
    console.log(event);
    const body = JSON.parse(event.body);
    await wsClient._setupClient(event);


    //GEt Game ID and user ID from connetion
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
       let {userId, gameId} = gameAndUserIdStatus;
       console.log('=> joining game');
       console.log(userId);
       console.log(gameId);

        //Get Collection to validate game code.
        //If user is in game, return the game details for the question, else add, update the game details, and return the game
        try {
            var mongoDb;
            try {
                mongoDb = await mongoConnection();
            } catch (error) {
                let message = "Error connecting to the game database."
                console.log('==> Error connecting to MongoDb: ' + JSON.stringify(error));
                return wsClient.send(event, {
                    event: "game-status-error",
                    channelId: body.channelId,
                    message
                });
            }
            const gameDetails = await queryDatabaseForGameCode(mongoDb, gameId);
            if (gameDetails.statusCode) {
                if (gameDetails.statusCode == 400) {
                    let message = "Could not find a game with the provided game code.";
                    return wsClient.send(event, {
                        event: "game-status-error",
                        channelId: body.channelId,
                        message
                    });

                } else {
                    let message = "There was an error trying to load the game. Please try again later.";
                    return wsClient.send(event, {
                        event: "game-status-error",
                        channelId: body.channelId,
                        message
                    });
                }
            }
            else {


                var gameStatusForUser;
                try {
                    gameStatusForUser = await getGameStatus(mongoDb, gameDetails, userId);
                    if (gameStatusForUser.status) {
                        let message = gameStatusForUser.message;
                        return wsClient.send(event, {
                            event: "game-status-error",
                            channelId: gameId,
                            message
                        });
                    } else {
                        return wsClient.send(event, {
                            event: "game-status-success",
                            channelId: gameId,
                            gameStatusForUser
                        });
                    }
                } catch (error) {
                    console.log('=> ERROR GETTING GAME');
                    console.log(error);
                    let message = error.message;
                    return wsClient.send(event, {
                        event: "game-status-error",
                        channelId: gameId,
                        message
                    });
                }
            }
        } catch (err) {
            console.error(err);
        }
        // return success;
    }


}

async function getGameStatus(mongoDb, gameDetails, userId) {

    //Subscribe to the channel
    let processedGameState = {};
    let foundUser = gameDetails.players.filter(player => player.playerId == userId);
    if (foundUser < 1) {
        //If the user doesn't exist in the game yet, register them.
        gameDetails.players.push({ playerId: userId, totalPoints: 0, answers: [] });
        try {
            let addUserStatus = await addUserToGame(mongoDb, gameDetails);
            processedGameState = processGameState(gameDetails);
            return processedGameState;

        } catch (error) {
            console.log('=>error 1')
            console.log(error)
            return { "status": "error", "message": "There was an error adding you to the game. Please try again." };
        }
    } else {
        //If the user exists, return the game
        processedGameState = processGameState(gameDetails);
        return processedGameState;
    }

}

async function subscribeChannel(event, context) {
    const channelId = JSON.parse(event.body).channelId;
    await db.Client.put({
        TableName: db.Table,
        Item: {
            [db.Channel.Connections.Key]: `${db.Channel.Prefix}${channelId}`,
            [db.Channel.Connections.Range]: `${db.Connection.Prefix}${
                db.parseEntityId(event)
                }`
        }
    }).promise();

    // Instead of broadcasting here we listen to the dynamodb stream
    // just a fun example of flexible usage
    // you could imagine bots or other sub systems broadcasting via a write the db
    // and then streams does the rest
    return success;
}



var ObjectId = require('mongodb').ObjectId;

convertToObjectId = (idString) => {
    try {
        return (new ObjectId(idString));
    } catch (error) {
        console.log(error);
    }
}

function queryDatabaseForGameCode(mongoDb, gameId) {

    return mongoDb.collection('games').findOne({ _id: convertToObjectId(gameId) })
        .then((gameDetail) => {
            if (gameDetail == null) {
                return { statusCode: 400, message: "Game not found." };
            }
            return gameDetail;
        })
        .catch(error => {
            console.log('=> an error occurred: ', err);
            return { statusCode: 500, message: "There was an error accessing the games collection for pulling game details." };
        });
}


module.exports = {
    join
};


