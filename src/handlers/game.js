

const db = require("../db");
const ws = require("../websocket-client");
const sanitize = require("sanitize-html");
"use strict";
const mongoConnection = require('../mongo/mongoConnection').connectToDatabase;

const wsClient = new ws.Client();

const success = {
    statusCode: 200
};

const fail500 = {
    statusCode: 500
};


async function currentGameStatus(event, context, callback) {

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
            let processedGameState = {};
            let foundUser = gameDetails.players.filter(player => player.playerId == userId);
            if (foundUser < 1) {
                //If the user doesn't exist in the game yet, register them.
                gameDetails.players.push({ playerId: userId, totalPoints: 0, answers: [] });
                try {
                    let addedUser = await updateGameDetails(mongoDb, gameDetails);
                    processedGameState = processGameState(gameDetails);
                    wsClient.send(event.requestContext.connectionId, {
                        event: "game-status",
                        channelId: body.channelId,
                        processedGameState
                    });
                } catch (error) {
                    console.log('=>error 1')
                    console.log(error)
                    reject({ mongoMessage: error.message, message: "Error: failed to update user." });
                }
            } else {
                //If the user exists, return the game
                processedGameState = processGameState(gameDetails);
                try {
                    return wsClient.send(event, {
                        event: "game-status",
                        channelId: body.channelId,
                        processedGameState
                    });
                   
                }catch(error){
                    console.log('=> ERROR CALLING');
                    console.log(error);
                }
            }
        }
    } catch (err) {
        console.error(err);
        console.log('=>error 2')
                    console.log(error)
    }

}


function connectToDatabase(uri) {
    return new Promise((resolve, reject) => {
        if (cachedDb) {
            resolve(cachedDb);
        }

        MongoClient.connect(uri, function (err, mongoDb) {
            if (err) {
                console.log(err);
                reject(err);


            } else {
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


function updateGameDetails(mongoDb, gameDetails) {
    console.log('=> updating database');

    return mongoDb.collection('games').updateOne({ _id: gameDetails._id }, { $set: { players: gameDetails.players } })
        .then((gameDetail) => {
            return true;
        })
        .catch(error => {
            return { statusCode: 500, message: "There was an error updating the games collection for adding the player" };
        });
}

function processGameState(gameDetails) {
    if (!gameDetails.isOpen) {
        //return the game isn't started
        return ({ emitEvent: "game-status", data: { 'gameStatus': "not-open" } });
    }
    if (gameDetails.isComplete) {
        //return the game isn't started
        return ({ emitEvent: "game-status", data: { 'gameStatus': "complete" } });
    }
    if (gameDetails.isOpen && !gameDetails.isComplete) {
        let gameResponse = {};
        if (gameDetails.isStarted) {
            gameResponse.question = gameDetails.questionDetail.questions[gameDetails.questionDetail.currentQuestion];
            delete gameResponse.question.answerId;
            return ({ emitEvent: "game-status", data: { 'gameStatus': "in-progress", question: gameResponse.question } });

        } else {
            return ({ emitEvent: "game-status", data: { 'gameStatus': "in-progress", message: "Please Wait" } });

        }
    }
}


module.exports = {
    currentGameStatus
};