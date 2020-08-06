const Bluebird = require("bluebird");
const mongoose = require('mongoose');
mongoose.Promise = Bluebird;
const EventModel = require('../model/Event.js');
const validator = require('validator');


const createErrorResponse = (statusCode, message) => ({
    statusCode: statusCode || 501,
    headers: { 'Content-Type': 'text/plain' },
    body: message || 'Incorrect id',
});
const createSuccessResponse = (statusCode, message) => ({
    statusCode: statusCode || 204,
    headers: { 'Content-Type': 'text/plain' },
    body: message || 'No Content',
});
const mongoString = process.env.MONGO_URL;
const dbExecute = (db, fn) => db.then(fn).finally(() => db.close());

function dbConnectAndExecute(dbUrl, fn) {
    return dbExecute(mongoose.connect(dbUrl), fn);
}

module.exports.getEventsForUser = (event, context, callback) => {
    const data = JSON.parse(event.body);
    
    let token = event.headers.Authorization;

    if (!token) {
        callback(null, createErrorResponse(401, 'Unauthorized'));
    } else {
        const keys_url = process.env.COGNITO_KEYS_URL;

        const axios = require('axios').default;
        axios.get(keys_url)
            .then(function (response) {
                let keyResponse = response.data.keys;
                var jwt = require('jsonwebtoken');
                var jwkToPem = require('jwk-to-pem');
                var pem = jwkToPem(keyResponse[0]);
                let decryptedToken = jwt.verify(token, pem, { algorithms: ['RS256'] }, function (err, decodedToken) {
                    if (err) {
                        callback(null, createErrorResponse(401, 'Unauthorized'));
                    }
                    return decodedToken;
                });

                if (decryptedToken == undefined) {
                    console.log("Token Not Present");
                    callback(null, createErrorResponse(401, 'Unauthorized'));
                }
                let userId = decryptedToken['cognito:username'];

                if (!userId) {
                    callback(null, createErrorResponse(400, "Could not verify user token"));
                    return;
                }

                dbConnectAndExecute(mongoString, () => (
                    EventModel
                        .find({ $or: [{ owner: userId }, { players: { user: userId } }] })
                        .then( (events) => {
                            callback(null, { statusCode: 200, body: JSON.stringify(events) })
                        })
                        .catch(err => callback(null, createErrorResponse(err.statusCode, err.message)))
                ));
            })
            .catch(function (error) {
                // handle error
                console.log('=> Overall Catch Error:');
                console.log(error);
                callback(null, createErrorResponse(500, "There was an error getting events for the user. Please contact your trivia admin."))

            })





        // let cognitoUserName = decryptedToken['cognito:username'];


    };
}

module.exports.getEvent = (event, context, callback) => {
    const data = JSON.parse(event.body);
    let token = event.headers.Authorization;
    if (!validator.isAlphanumeric(event.pathParameters.id)) {
        callback(null, createErrorResponse(400, 'Invalid event ID provided. Please try again. '));
        return;
    }
    let eventId = event.pathParameters.id;

    if (!token) {
        callback(null, createErrorResponse(401, 'Unauthorized'));
    } else {
        const keys_url = process.env.COGNITO_KEYS_URL;

        const axios = require('axios').default;
        axios.get(keys_url)
            .then(function (response) {
                let keyResponse = response.data.keys;
                var jwt = require('jsonwebtoken');
                var jwkToPem = require('jwk-to-pem');
                var pem = jwkToPem(keyResponse[0]);
                let decryptedToken = jwt.verify(token, pem, { algorithms: ['RS256'] }, function (err, decodedToken) {
                    if (err) {
                        callback(null, createErrorResponse(401, 'Unauthorized'));
                    }
                    return decodedToken;
                });

                if (decryptedToken == undefined) {
                    console.log("Token Not Present");
                    callback(null, createErrorResponse(401, 'Unauthorized'));
                }
                let userId = decryptedToken['cognito:username'];

                if (!userId) {
                    callback(null, createErrorResponse(400, "Could not verify user token"));
                    return;
                }

                dbConnectAndExecute(mongoString, () => (
                    EventModel
                        .findOne({_id: eventId})
                        .then( (event) => {
                            callback(null, { statusCode: 200, body: JSON.stringify(event) })
                        })
                        .catch(err => callback(null, createErrorResponse(500, "There was an issue retrieving the event. Please check your Event ID and try again. If the issue persists, please contact your trivia admin.")))
                ));
            })
            .catch(function (error) {
                // handle error
                console.log('=> Overall Catch Error:');
                console.log(error);
                callback(null, createErrorResponse(500, "There was an error getting the event. Please contact your trivia admin."))

            })





        // let cognitoUserName = decryptedToken['cognito:username'];


    };
}
