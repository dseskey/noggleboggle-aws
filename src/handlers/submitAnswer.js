

const db = require("../db");
const ws = require("../websocket-client");
const sanitize = require("sanitize-html");
"use strict";
const mongoConnection = require('../mongo/mongoConnection').connectToDatabase;
const getGameDetails = require('../mongo/mongoActions').queryDatabaseForGameCode;
const submitAnswerToDataBase = require('../mongo/mongoActions').submitAnswerToDataBase;
const incrementQuestion = require('../mongo/mongoActions').incrementQuestion;

let cachedDb = null;
const wsClient = new ws.Client();

const success = {
    statusCode: 200
};

const fail500 = {
    statusCode: 500
};



async function submit(event, context, callback) {


    // {"questionId":0, "answer":1, "type": "multipleChoice"}
    const body = JSON.parse(event.body);
    const payload = body.payload;
    const userId = body.userId;
    const gameId = body.gameId;
    const questionSubmission = payload;
    try {
        const mongoDb = await mongoConnection();
        const gameDetails = await getGameDetails(mongoDb, gameId);
        if (doesUserExistInGame(gameDetails, userId)) {
            //If the user doesn't exist in the game yet, reject
            //Build response and fail

            // reject({ message: 'User is not part of game, please join the game' });
        } else {
            if (gameDetails.questionDetail.currentQuestion != questionSubmission.questionId) {
                //Build response and fail
                let message = "The question submitted is not the current active question. Please wait for the next question."
                return wsClient.send(event, {
                    event: "game-status-error",
                    channelId: body.channelId,
                    message
                });
                // reject('This is not the current question for this game.');
            } else if (questionPreviouslyAnsweredByUser(gameDetails, userId, questionSubmission.questionId)) {
                //Build response and fail
                let message = "You have previously answered the question. Please wait for the next question."
                return wsClient.send(event, {
                    event: "game-status-error",
                    channelId: body.channelId,
                    message
                });
                // reject('This question has been previously answered by the user.');
            } else {
                let playerUpdateObject = buildGameDetailForUserAnswerUpdate(gameDetails, userId, questionSubmission);
                let storageResult = await submitAnswerToDataBase(mongoDb, gameId, playerUpdateObject);
                let message = storageResult.message;
                return wsClient.send(event, {
                    event: "game-status",
                    channelId: body.channelId,
                    message
                });


            }
        }
    } catch (err) {
        console.error(err);
        let message = "There was an error submitting your answer, please try again. If this issue continues, please contact your game master."
        return wsClient.send(event, {
            event: "game-status-error",
            channelId: body.channelId,
            message
        });
    }
}

async function nextQuestion(event, context, callback) {


    // {"questionId":0, "answer":1, "type": "multipleChoice"}
    const body = JSON.parse(event.body);
    const payload = body.payload;
    const userId = body.userId;
    const gameId = body.gameId;
    const questionSubmission = payload;
    try {
        const mongoDb = await mongoConnection();
        const incrementStatus = await incrementQuestion(mongoDb, gameId);
        return wsClient.send(event, {
            event: "game-status",
            channelId: body.channelId,
            incrementStatus
        });
    } catch (err) {
        console.error(err);
        let response = {"status":"error","message":"There was an error incrementing the question, please try again."}
        return wsClient.send(event, {
            event: "game-status",
            channelId: body.channelId,
            response
        });
    }
}


function doesUserExistInGame(gameDetails, userId) {
    let foundUser = gameDetails.players.filter(player => player.playerId == userId);
    return foundUser > 1;
}

function questionPreviouslyAnsweredByUser(gameDetails, userId, submittedId) {
    let playerDetails = gameDetails.players.filter((playerDetail) => playerDetail.playerId == userId)[0];
    if (playerDetails.answers.filter((answer) => answer.questionId == submittedId).length > 0) {
        return true;
    } else {
        return false;
    }
}

function buildGameDetailForUserAnswerUpdate(gameDetails, userId, submittedAnswer) {
    //Check if answer is right and build accordingly.
    let gameDetailQuestion = gameDetails.questionDetail.questions.find((question) => question.questionId == submittedAnswer.questionId);
    let playerDetails = gameDetails.players.find((player) => player.playerId === userId);
    let userAnswer = {};
    userAnswer.questionId = submittedAnswer.questionId;
    userAnswer.answer = submittedAnswer.answer;
    if (gameDetailQuestion.type === 'multipleChoice') {
        if (gameDetailQuestion.answerId == submittedAnswer.answer) {
            userAnswer.pointsAwarded = gameDetailQuestion.pointsAvailable;
            playerDetails.answers.push(userAnswer);
            playerDetails.totalPoints = playerDetails.totalPoints + gameDetailQuestion.pointsAvailable;
        } else {
            userAnswer.pointsAwarded = 0;
            playerDetails.answers.push(userAnswer);
            playerDetails.totalPoints = playerDetails.totalPoints + 0;
        }
    } else {

    }
    return playerDetails;

}

module.exports = {
    submit,
    nextQuestion
};


