
const Bluebird = require("bluebird");
const mongoose = require('mongoose');
const validator = require('validator');
const UserModel = require('../model/User.js');
mongoose.Promise = Bluebird;


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

module.exports.getEvents = (event, context, callback) => {
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
        let cognitoUser = decryptedToken['cognito:username'];
        const user = new UserModel({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          displayName: data.displayName,
          nickname: data.nickname,
          userId: cognitoUser
        });

        if (user.validateSync()) {
          callback(null, createErrorResponse(400, 'The correct fields to create a user were not provided.'));
          return;
        }


        dbConnectAndExecute(mongoString, () => (
          user
            .save()
            .then(() => {
              callback(null, {
                statusCode: 201,
                body: 'The user was successfully created.',

              }
              )

            }).catch(err => {

              callback(null, createErrorResponse(err.statusCode, err.message))
            })
        ));
      })
      .catch(function (error) {
        // handle error
        callback(null, createErrorResponse(500, "There was an error creating the user. Please contact your trivia admin."))

      })
  };
}