
const db = require("./db");

function processGameState(gameDetails) {
    if (!gameDetails.isOpen) {
        //return the game isn't started
        return { 'gameStatus': "not-open" };
    }
    if (gameDetails.isComplete) {
        return { 'gameStatus': "complete" };
    }
    if (gameDetails.isOpen && !gameDetails.isComplete) {
        let gameResponse = {};
        if (gameDetails.isStarted) {
            gameResponse.question = gameDetails.questionDetail.questions[gameDetails.questionDetail.currentQuestion];
            delete gameResponse.question.answerId;
            return { 'gameStatus': "in-progress", question: gameResponse.question };

        } else {
            return { 'gameStatus': "in-progress", message: "Please Wait" };

        }
    }
}

async function getGameIdFromConnection(event) {

    const subscriptions = await db.fetchConnectionSubscriptions(event);
    console.log("HERE");
    console.log(subscriptions);
    if (subscriptions.length > 1) {
        return ({ status: "error", message: "You are currently participating in more than one game, please disconnect from all games but one to continue." })
    }else if (subscriptions.length == 0) {
        return ({ status: "error", message: "You are currently not participating in any games, please join a game to continue." })
    } else {
        const subscription = subscriptions[0];
        console.log("SUBSCRIPTIONS");
        console.log(subscription);
        return ({ status: "success", gameId: db.parseEntityId(subscription[db.Channel.Primary.Key]) });
    }


}

async function getUserIdFromConnection(event) {

    const subscriptions = await db.fetchConnectionSubscriptions(event);
    if (subscriptions.length > 1) {
        return ({ status: "error", message: "You are currently participating in more than one game, please disconnect from all games but one to continue." })
    }else if (subscriptions.length == 0) {
        return ({ status: "error", message: "You are currently not participating in any games, please join a game to continue." })
    } else {
        const subscription = subscriptions[0];
        console.log('PARSING ID')
        return ({ status: "success", userId: db.parseEntityId(subscription[db.Channel.Primary.User]) });
    }


}

async function getUserAndGameIdFromConnection(event) {

    const subscriptions = await db.fetchConnectionSubscriptions(event);
    if (subscriptions.length > 1) {
        return ({ status: "error", message: "You are currently participating in more than one game, please disconnect from all games but one to continue." })
    }else if (subscriptions.length == 0) {
        return ({ status: "error", message: "You are currently not participating in any games, please join a game to continue." })
    } else {
        const subscription = subscriptions[0];
        console.log('PARSING ID')
        return ({ status: "success", userId: db.parseEntityId(subscription[db.Channel.Primary.User]), gameId: db.parseEntityId(subscription[db.Channel.Primary.Key])});
    }


}

module.exports = {
    processGameState,
    getGameIdFromConnection,
    getUserIdFromConnection,
    getUserAndGameIdFromConnection
}