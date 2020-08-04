
const mongoConnection = require('./mongoConnection').connectToDatabase;

var ObjectId = require('mongodb').ObjectId;

convertToObjectId = (idString) => {
    try {
        return (new ObjectId(idString));
    } catch (error) {
        console.log(error);
    }
}

async function createUser(mongoDb, userObject) {
    return new Promise((resolve,reject) => {
        mongoDb.collection('users').insertOne(userObject, function (err, res) {
            if (err) {
                console.log('==> Error inserting new user: ' + JSON.stringify(error));
                reject ({ status: 500, message: 'Could not add the user.' });
            }
            resolve ({ status: 201, message: 'Successfully added user to the database.' })
        })
    })

}

module.exports = {
    createUser
}
// function queryDatabaseForGameCode(mongoDb, gameId) {

//     return mongoDb.collection('games').findOne({ _id: convertToObjectId(gameId) })
//         .then((gameDetail) => {
//             if (gameDetail == null) {
//                 return { statusCode: 400, message: "Game not found." };
//             }
//             return gameDetail;
//         })
//         .catch(error => {
//             console.log('=> an error occurred: ', err);
//             return { statusCode: 500, message: "There was an error accessing the games collection for pulling game details." };
//         });
// }

// function addUserToGame(mongoDb, gameDetails) {

//     return new Promise((resolve, reject) => {
//         let gamesCollection = mongoDb.collection('games');

//         try {
//             gamesCollection.updateOne({ _id: gameDetails._id }, { $set: { players: gameDetails.players } });
//             resolve({ status: "success", message: "The user was added to the game successfully." });
//         } catch (error) {
//             console.log(error)
//             reject({ status: "error", message: 'There was an error accessing the games collection for updating game details.', error: error });
//         }
//     })

// };


// function submitAnswerToDataBase(mongoDb, gameId, playerDetail) {
//     return new Promise((resolve, reject) => {
//         let gamesCollection = mongoDb.collection('games');

//         try {
//             gamesCollection.updateOne({ _id: convertToObjectId(gameId), "players.playerId": playerDetail.playerId },
//                 { $set: { "players.$": playerDetail } });
//             resolve({ status: "success", message: "Answer Submitted. Please Wait" });
//         } catch (error) {
//             reject({ status: "error", message: 'There was an error updating the player\'s answers.', error: error });
//         }

//     })
// };


// function incrementQuestion(mongoDb, gameId, userId) {
//     return new Promise((resolve, reject) => {
//         let gamesCollection = mongoDb.collection('games');

//         gamesCollection.findOneAndUpdate({ _id: convertToObjectId(gameId), owner: userId }, { $inc: { "questionDetail.currentQuestion": 1 } }).then((gameResult) => {
//             if (gameResult.value.questionDetail.currentQuestion + 1 < gameResult.value.questionDetail.questions.length) {
//                 let nextQuestion = gameResult.value.questionDetail.questions[gameResult.value.questionDetail.currentQuestion + 1];
//                 delete nextQuestion.answerId;
//                 resolve({ status: "CONTINUE", question: nextQuestion });
//             } else {
//                 resolve({ status: "END", message: "End of Game" })
//             }
//             resolve({ status: "success", message: "Question Succesfully incremented. " })
//         }).catch(error => {
//             reject({ status: "error", message: 'There was an error incrementing the question.', error: error });
//         });

//     });
// }


// function getDetailsForScoreboard(mongoDb, gameId, userId) {
//     return new Promise((resolve, reject) => {
//         let gamesCollection = mongoDb.collection('games');
//         let usersCollection = mongoDb.collection('users');

//         gamesCollection.findOne({ _id: convertToObjectId(gameId) , owner: userId}).then((game) => {
//             let usersInGameWithScore = game.players.map((player) => {
//                 return { playerId: player.playerId, totalPoints: player.totalPoints }
//             })

//             usersCollection.find({ _id: { $in: game.players.map(player => convertToObjectId(player.playerId)) } }).project({ _id: 1, displayName: 1 }).toArray((err, users) => {
//                 if (err) {
//                     reject({ message: 'There was an error getting the users for scoreboard.', error: error });
//                 }
//                 resolve({ usersFromDb: users, playersAndScores: usersInGameWithScore })
//             });

//         }).catch(error => {
//             reject({ status: "error", message: 'Could not get the game to generate the scoreboard.', error: error });
//         });
//     })
// };

// function openGame(mongoDb, gameId, userId) {
//     return new Promise((resolve, reject) => {
//         let gamesCollection = mongoDb.collection('games');

//         /*--Get collection and grab question list and current question, see if we have more questions--*/
//         try {
//             gamesCollection.findOneAndUpdate({ _id: convertToObjectId(gameId), owner: userId }, { $set: { isOpen: true, isStarted: true } }).then((gameResult) => {
//                 let question = gameResult.value.questionDetail.questions[gameResult.value.questionDetail.currentQuestion];
//                 delete question.answerId;
//                 resolve({ status: "CONTINUE", question: question });

//             }).catch((error) => {
//                 reject({ message: 'There was an error accessing the games collection for starting the game.', error: error });
//             });
//         } catch (error) {
//             reject({ message: 'There was an error accessing the games collection for  starting the game with the given ID', error: error });
//         }
//     });
// }

// module.exports = {
//     queryDatabaseForGameCode,
//     submitAnswerToDataBase,
//     addUserToGame,
//     incrementQuestion,
//     getDetailsForScoreboard,
//     openGame
// }