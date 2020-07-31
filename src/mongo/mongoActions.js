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

function addUserToGame(mongoDb, gameDetails) {

    return new Promise((resolve, reject) => {
        let gamesCollection = mongoDb.collection('games');

        try {
            gamesCollection.updateOne({ _id: gameDetails._id }, { $set: { players: gameDetails.players } });
            resolve({status:"success",message:"The user was added to the game successfully."});
        } catch (error) {
            console.log(error)
            reject({ status:"error", message: 'There was an error accessing the games collection for updating game details.', error: error });
        }
    })

};


function submitAnswerToDataBase(mongoDb, gameId, playerDetail) {
    return new Promise((resolve, reject) => {
        let gamesCollection = mongoDb.collection('games');

        try {
            gamesCollection.updateOne({ _id: convertToObjectId(gameId), "players.playerId": playerDetail.playerId },
                { $set: { "players.$": playerDetail } });
            resolve({ status: "success", message: "Answer Submitted. Please Wait" });
        } catch (error) {
            reject({ status: "error", message: 'There was an error updating the player\'s answers.', error: error });
        }

    })
};



module.exports = {
    queryDatabaseForGameCode,
    submitAnswerToDataBase,
    addUserToGame
}