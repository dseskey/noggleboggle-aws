"use strict";

const db = require("../../db");
const ws = require("../../websocket-client");
const sanitize = require("sanitize-html");
const mongoConnection = require('../../mongo/mongoConnection').connectToDatabase;
const incrementQuestion = require('../../mongo/mongoActions').incrementQuestion;
const { getGameIdFromConnection } = require("../../utilities");

let cachedDb = null;
const wsClient = new ws.Client();

const success = {
    statusCode: 200
};

const fail500 = {
    statusCode: 500
};



async function next(event, context, callback) {

    /*--
        -Get connection from event.body.
        -Use connection ID or username to get channel (use connection ID if a user can only play one game at a time)
        -Use channel ID (which is game ID to get game status and increment question)
        -
    --*/
    const body = JSON.parse(event.body);
    let gameId = await getGameIdFromConnection(event);
    let userId = event.requestContext.authorizer['cognito:username'];
    console.log("GAME ID:")
    console.log(gameId);
    if (!gameId || gameId === '\'\'') {
        let message = "You have not joined a game, please join a game and try again!."
        return wsClient.send(event, {
            event: "game-status-error",
            channelId: gameId,
            message
        });
    } else {
        try {

            const mongoDb = await mongoConnection();
            const incrementStatus = await incrementQuestion(mongoDb, gameId, userId);
            let payload;
            if (incrementStatus.status == "CONTINUE") {
                payload = { "status": incrementStatus.status, "question": incrementStatus.question }
            } else {
                payload = { "status": incrementStatus.status, "message": incrementStatus.message }
            }
            // sendMessage(event, "game-status-success", gameId, payload);
            const subscribers = await db.fetchChannelSubscriptions(gameId);
            const results = subscribers.map(async subscriber => {
                const subscriberId = subscriber.pk.replace(db.Connection.Prefix, '');
                // const subscriberId = db.parseEntityId(
                //     subscriber[db.Channel.Connections.Range]
                // );
                return wsClient.send(subscriberId, {
                    event: "game-status-success",
                    channelId: gameId,
                    payload
                });
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
    // if (!gameAndUserIdStatus.status == 'success') {
    //     let message = gameAndUserIdStatus.message;
    //     console.log('==> Error getting user ID and game ID ' + JSON.stringify(error));
    //     return wsClient.send(event, {
    //         event: "game-status-error",
    //         channelId: body.channelId,
    //         message
    //     });
    // } else {
    //     let { userId, gameId } = gameAndUserIdStatus;
    //     try {

    //         const mongoDb = await mongoConnection();
    //         const incrementStatus = await incrementQuestion(mongoDb, gameId, userId);
    //         let payload;
    //         if (incrementStatus.status == "CONTINUE") {
    //             payload = { "status": incrementStatus.status, "question": incrementStatus.question }
    //         } else {
    //             payload = { "status": incrementStatus.status, "message": incrementStatus.message }
    //         }
    //         // sendMessage(event, "game-status-success", gameId, payload);
    //         const subscribers = await db.fetchChannelSubscriptions(gameId);
    //         console.log("=> SUBSCRIBERS");
    //         console.log(subscribers);
    //         const results = subscribers.map(async subscriber => {
    //             const subscriberId = db.parseEntityId(
    //                 subscriber[db.Channel.Connections.Range]
    //             );
    //             return wsClient.send(subscriberId, {
    //                 event: "game-status-success",
    //                 channelId: gameId,
    //                 payload
    //             });
    //         });
    //     } catch (err) {
    //         console.error(err);
    //         let message = "There was an error incrementing the question, please try again."
    //         return wsClient.send(event, {
    //             event: "game-status-error",
    //             channelId: gameId,
    //             message
    //         });
    //     }
    // }

}
async function sendMessage(event, eventResponseType, gameId, payload) {
    // save message for future history
    // saving with timestamp allows sorting
    // maybe do ttl?



    await Promise.all(results);
    return success;
}
module.exports = {
    next
};


