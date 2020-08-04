
const Bluebird = require("bluebird");
const fetch = require("node-fetch");
fetch.Promise = Bluebird;
const mongoose = require('mongoose');
const validator = require('validator');
const UserModel = require('../model/User.js');
let addUser = require('../mongo/mongoActions').createUser;
const mongoConnection = require('../mongo/mongoConnection').connectToDatabase;
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
const mongoString = '';
const dbExecute = (db, fn) => db.then(fn).finally(() => db.close());

function dbConnectAndExecute(dbUrl, fn) {
  return dbExecute(mongoose.connect(dbUrl), fn);
}

module.exports.setupUser = (event, context, callback) => {
  const data = JSON.parse(event.body);
  let token = event.headers.Authorization;

  if (!token) {
    callback(null, createErrorResponse(401, 'Unauthorized'));
  } else {
    const keys_url =
      "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_jL1h2S3Px/.well-known/jwks.json";

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
        console.log(decryptedToken);
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





    // let cognitoUserName = decryptedToken['cognito:username'];


  };
}
/*async function setupUser(event, context, callback) {
  //Check get token from authorization header
  let body = JSON.parse(event.body);
  let token = event.headers.Authorization;
  if (!token) {
    callback(null, createErrorResponse(401, 'Unauthorized'));
  } else {
    const keys_url =
      "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_jL1h2S3Px/.well-known/jwks.json";

    let decryptedToken;
    const rawRes = await fetch(keys_url);
    const keyResponse = await rawRes.json();

    var jwt = require('jsonwebtoken');
    var jwkToPem = require('jwk-to-pem');
    var pem = jwkToPem(keyResponse.keys[0]);

    decryptedToken = jwt.verify(token, pem, { algorithms: ['RS256'] }, function (err, decodedToken) {
      if (err) {
        return undefined;
      }
      return decodedToken;
    });


    if (decryptedToken == undefined) {
      console.log("Token Not Present");
      callback(null, createErrorResponse(401, 'Unauthorized'));
    }

    let cognitoUserName = decryptedToken['cognito:username'];
    let userObjectForMongo = {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      displayName: body.displayName,
      nickname: body.nickname,
      userId: cognitoUserName
    };


    try {
      let mongoDb;
      try {
        let moment = require('moment');
        console.log('=>Start');
        console.log(moment().format('hh:mm:ss'))
        mongoDb = await mongoConnection();
        console.log('=>End');
        console.log(mongoDb)
        console.log(moment().format('hh:mm:ss'))
        console.log('HERE33333');
        callback(null, createErrorResponse(201, "Error Connecting to the Trivia Database"))
      } catch (error) {
        console.log('==> Error connecting to MongoDb: ' + JSON.stringify(error));
        callback(null, createErrorResponse(500, "Error Connecting to the Trivia Database"));
      }
    } catch (error) {
      console.log("=>error");
      console.log(error);
    }

    // let userStorageStatus = await addUser(mongoDb, userObjectForMongo);
    // console.log(userStorageStatus);

    // if (userStorageStatus.status != 201) {
    //   console.log('=> ERROR2')
    //   callback(null, createErrorResponse(userStorageStatus.status, userStorageStatus.message));

    // } else {
    //   // callback(null, { statusCode: 201, body: JSON.stringify('Ok') }))
    //   callback(null, { statusCode: 201, body: JSON.stringify('Ok') });
    //   return;
  }
  // }catch(error){
  //   console.log("=>error");
  //   console.log(error);
  // }
}
*/
