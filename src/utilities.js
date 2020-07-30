function processGameState(gameDetails) {
    if (!gameDetails.isOpen) {
        //return the game isn't started
        return { 'gameStatus': "not-open" } ;
    }
    if (gameDetails.isComplete) {
        //return the game isn't started
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

module.exports = {
    processGameState
}