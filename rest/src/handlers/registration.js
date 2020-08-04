
const validator = require('validator');
const Bluebird = require("bluebird");
const fetch = require("node-fetch");
fetch.Promise = Bluebird;
let addUser = require('../mongo/mongoActions').createUser;
const mongoConnection = require('../mongo/mongoConnection').connectToDatabase;

const mongoString = ''; // MongoDB Url

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

const dbExecute = (db, fn) => db.then(fn).finally(() => db.close());

function dbConnectAndExecute(dbUrl, fn) {
  return dbExecute(mongoose.connect(dbUrl, { useMongoClient: true }), fn);
}

async function setupUser(event, context, callback) {
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
    let mongoDb;
    try {
      mongoDb = await mongoConnection();
    } catch (error) {
      console.log('==> Error connecting to MongoDb: ' + JSON.stringify(error));
      callback(null, createErrorResponse(500, "Error Connecting to the Trivia Database"));
    }

    let userStorageStatus = await addUser(mongoDb, userObjectForMongo);
    console.log(userStorageStatus);
    //   mongoDb = await mongoConnection();
    // } catch (error) {
    //     console.log('==> Error connecting to MongoDb: ' + JSON.stringify(error));
    //     return ({ status: 500, message: 'Error connecting to the Trivia Database' });
    // }

    // mongoDb.collection('users').insertOne(userObject, function (err, res) {
    //     if (err) {
    //         console.log('==> Error inserting new user: ' + JSON.stringify(error));
    //         return ({ status: 500, message: 'Could not add the user.' });
    //     }
    //     return ({ status: 200, message: 'Successfully added user to the database.' })
    // })
    if (userStorageStatus.status != 201) {
      callback(null, createErrorResponse(userStorageStatus.status, userStorageStatus.message));

    } else {
      callback(null, createSuccessResponse(201, "The user was successfully added to the database."));
    }
  }
}

module.exports = {
  setupUser
}