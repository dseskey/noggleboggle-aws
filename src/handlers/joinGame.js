

const db = require("../db");
const ws = require("../websocket-client");
const sanitize = require("sanitize-html");
const mongoConnection = require('../mongo/mongoConnection').connectToDatabase;
const processGameState = require('../utilities').processGameState;
const addUserToGame = require('../mongo/mongoActions').addUserToGame;

"use strict";

const wsClient = new ws.Client();

const success = {
    statusCode: 200
};

const fail500 = {
    statusCode: 500
};


async function join(event, context, callback) {

    const body = JSON.parse(event.body);
    let gameCode = body.payload.gameId;
    let userId = body.payload.userId; //Note this will be replaced with cognito
    await wsClient._setupClient(event);

    //Get Collection to validate game code.
    //If user is in game, return the game details for the question, else add, update the game details, and return the game
    try {
        const mongoDb = await mongoConnection();
        const gameDetails = await queryDatabaseForGameCode(mongoDb, gameCode);
        if (gameDetails.statusCode) {
            //Don't register user
        } else {
            //Subscribe to the channel
            await subscribeChannel(
                {
                    ...event,
                    body: JSON.stringify({
                        action: "subscribe",
                        channelId: gameCode
                    })
                },
                context
            );

            const gameStatusForUser = await getGameStatus(mongoDb, gameDetails, userId);
            try {
                return wsClient.send(event, {
                    event: "game-status",
                    channelId: body.channelId,
                    gameStatusForUser
                });
               
            }catch(error){
                console.log('=> ERROR CALLING');
                console.log(error);
            }
        }
    } catch (err) {
        console.error(err);
    }
    return success;


}

async function getGameStatus(mongoDb, gameDetails, userId){
    if (gameDetails.statusCode) {
        //Don't register user
    } else {
        //Subscribe to the channel
        let processedGameState = {};
        let foundUser = gameDetails.players.filter(player => player.playerId == userId);
        if (foundUser < 1) {
            //If the user doesn't exist in the game yet, register them.
            gameDetails.players.push({ playerId: userId, totalPoints: 0, answers: [] });
            try {
                let addUserStatus = await addUserToGame(mongoDb, gameDetails);
                console.log("=> ADD USER");
                console.log(addUserStatus);
                processedGameState = processGameState(gameDetails);
                return processedGameState;
                
            } catch (error) {
                console.log('=>error 1')
                console.log(error)
                return {"status": "error", "message":"There was an error adding you to the game. Please try again."} 
            }
        } else {
            //If the user exists, return the game
            processedGameState = processGameState(gameDetails);
            return processedGameState;
        }
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


