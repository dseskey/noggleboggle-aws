"use strict";

const db = require("../../db");
const ws = require("../../websocket-client");
const sanitize = require("sanitize-html");
const mongoConnection = require('../../mongo/mongoConnection').connectToDatabase;
const { queryDatabaseForGameCode } = require('../../mongo/mongoActions');
const { processGameState } = require('../../utilities');
const { addUserToGame }  = require('../../mongo/mongoActions');
const { Success, BadRequest, Unauthorized, InternalServerError } = require('../../httpResponseSturctures');
const {error} = require('../../logging/log');

const wsClient = new ws.Client();

const success = {
    statusCode: 200
};

const fail500 = {
    statusCode: 500
};

async function join(event, context, callback) {

    const body = JSON.parse(event.body);
    const gameId = body.payload.gameId;
    const userId = event.requestContext.authorizer['cognito:username'];

    try {
        var mongoDb;
        try {
            mongoDb = await mongoConnection();
        } catch (error) {
            error("joinGame", "join", "database_connection", JSON.stringify(error));
            let dbConnectionError = InternalServerError;
            dbConnectionError.message = "Error contacting the game database";
            let isMessageSent = wsClient.send(event, {
                event: "game-status-error",
                channelId: body.channelId,
                payload: dbConnectionError
            });

            if (isMessageSent) {
                return success;
            } else {
                return fail500;
            }
        }

        const gameDetails = await queryDatabaseForGameCode(mongoDb, gameId);

        if (gameDetails.statusCode) {
            if (gameDetails.statusCode == 400) {
                error("joinGame", "join", "queryForGame", "Could not find a game with the provided game code" + gameId);
                let gameNotFoundError = BadRequest;
                gameNotFoundError.message = "Could not find a game with the provided game code.";
                let isMessageSent = await wsClient.send(event, {
                    event: "game-status-error",
                    channelId: body.channelId,
                    payload: gameNotFoundError
                });

                if (isMessageSent) {
                    return success;
                } else {
                    return fail500;
                }

            } else {
                error("joinGame", "join", "queryGameProcessError", JSON.stringify(error));
                let dbProcessError = InternalServerError;
                dbProcessError.message = "There was an error trying to load the game. Please try again later.";
                let isMessageSent = await wsClient.send(event, {
                    event: "game-status-error",
                    channelId: body.channelId,
                    payload: dbProcessError
                });

                if (isMessageSent) {
                    return success;
                } else {
                    return fail500;
                }
            }
        }
        else {
            if (!(userId == gameDetails.owner)) {
                var gameStatusForUser;

                gameStatusForUser = await getGameStatusForJoining(mongoDb, gameDetails, userId);
                if (gameStatusForUser.status =='error') {
                    let isMessageSent = await wsClient.send(event, {
                        event: "game-status-error",
                        channelId: gameId,
                        data: gameStatusForUser.payload
                    });
                    if(isMessageSent){
                        return success;
                    }else{
                        return fail500;
                    }
                } else {
                    await db.updateChannelId(event,gameId);
                    let playerResponseObject = Success;
                    playerResponseObject.payload = gameStatusForUser;
                    let isMessageSent = await wsClient.send(event, {
                        event: "join-game-success",
                        channelId: gameId,
                        data: playerResponseObject
                    }, userId);

                    if(isMessageSent){
                        return success;
                    }else{
                        return fail500;
                    }
                }
            } else {
                /*--Game Master Joining--*/
                await db.updateChannelId(event,gameId);
                let gameMasterResponseObject = Success;
                gameMasterResponseObject.payload = {
                    message: "Game master has successfully joined the game.",
                    currentQuestion: gameDetails.questionDetail.currentQuestion,
                    isOpen: gameDetails.isOpen,
                    isComplete: gameDetails.isComplete,
                    isStarted: gameDetails.isStarted
                };

                let isMessageSent = await wsClient.send(event, {
                    event: "join-game-success",
                    channelId: gameId,
                    data: gameMasterResponseObject
                }, userId);
                if (isMessageSent) {
                    return success;
                } else {
                    return fail500;
                }

            }
        }
    } catch (err) {
        console.error(err);
    }

}


async function getGameStatusForJoining(mongoDb, gameDetails, userId) {

    /*--We process game state first so we don't add a user to a completed game and waste a DB I/O cycle--**/
    let processedGameState = processGameState(gameDetails);

    /*--Check if the user is already part of the game, the message shown to the end user will be different depending on status--*/
    let foundUser = gameDetails.players.filter(player => player.playerId == userId);

    if (foundUser < 1) {
        if (processedGameState.gameStatus.toLowerCase() == 'complete') {
            /*--The user was not found as a player in the game AND the game is complete, so do not add them to the game--*/
            let willNotAddUserToGamePayload = BadRequest;
            willNotAddUserToGamePayload.message = "The user cannot be added to the game as the game has completed."
            return { "status": "error", "payload": willNotAddUserToGamePayload };

        } else {
            /*--If the user was not found as a player in the game AND the game is either not started or in progress, add them to the game-- */
            try {
                await addUserToGame(mongoDb, gameDetails, userId);
                return processedGameState;

            } catch (error) {
                error("joinGame", "getGameStatusForJoining", "adding user to game", JSON.stringify(error));
                let addingUserToGameInternalServerError = InternalServerError;
                addingUserToGameInternalServerError.message = "Ther was an error adding the user to the game ."
                return { "status": "error", "payload": addingUserToGameInternalServerError };
            }
        }
    }
    else {
        processedGameState = processGameState(gameDetails);
        return processedGameState;
    }

}

module.exports = {
    join
};


