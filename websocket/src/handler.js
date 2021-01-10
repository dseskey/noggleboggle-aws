const db = require("./db");
const ws = require("./websocket-client");
const sanitize = require("sanitize-html");
const mongoConnection = require('./mongo/mongoConnection').connectToDatabase;
const addUserToGameDb = require('./mongo/mongoActions').addUserToGame;
require('dotenv').config();
const { BadRequest, Unauthorized, InternalServerError } = require('./httpResponseSturctures');
var randomstring = require("randomstring");

const wsClient = new ws.Client();

const success = {
  statusCode: 200
};


const invalidTokenResponse = {
  statusCode: 401
};

const internalServerError = {
  statusCode: 500
};

const badRequest = {
  statusCode: 400
};


async function createConnection(event, context) {

  /*--The authorizer has already obtained the Cognito info, use it to create a connection WITHOUT a channel (a channel is a game which we do not take at connect)--*/
  let userId = event.requestContext.authorizer['cognito:username'];

  // const channelId = JSON.parse(event.body).channelId;
  await db.Client.put({
    TableName: db.Table,
    Item: {
      [db.Channel.Connections.Key]: `${db.Connection.Prefix}${db.parseEntityId(event)
        }`,
      [db.Channel.Connections.Range]: `${db.User.Prefix}${userId}`,
      [db.Channel.Connections.User]: `${db.Channel.Prefix}''`
    }
  }).promise();

  // Instead of broadcasting here we listen to the dynamodb stream
  // just a fun example of flexible usage
  // you could imagine bots or other sub systems broadcasting via a write the db
  // and then streams does the rest
  return success;

  // let gameCode = queryStringParameters.GAME;
  // if (gameCode) {
  //   // let gameCode = event.headers['X-GID'];
  //   try {
  //     var mongoDb;
  //     try {
  //       mongoDb = await mongoConnection();
  //     } catch (error) {
  //       let message = "Error connecting to the game database."
  //       console.log('==> Error connecting to MongoDb: ' + JSON.stringify(error));
  //       return internalServerError;
  //     }
  //     const gameDetails = await queryDatabaseForGameCode(mongoDb, gameCode);
  //     if (gameDetails.statusCode) {
  //       if (gameDetails.statusCode == 400) {
  //         let message = "Could not find a game with the provided game code.";
  //         return invalidTokenResponse;
  //       } else {
  //         let message = "There was an error trying to load the game. Please try again later.";
  //         return internalServerError;
  //       }
  //     }
  //     else {
  //       //Add user to game, then subscribe the user to the channel
  //       let userId = event.requestContext.authorizer['cognito:username'];

  //       let addedUserToGame = await addUserToGame(mongoDb, gameDetails, userId);
  //       //Subscribe to the channel
  //       if (addedUserToGame) {
  //         await subscribeToGameChannel(
  //           {
  //             ...event,
  //             body: JSON.stringify({
  //               action: "subscribe",
  //               channelId: randomstring.generate(24)
  //             })
  //           },
  //           context,
  //           userId
  //         );
  //       } else {
  //         return internalServerError;
  //       }

  //     }
  //   } catch (err) {
  //     console.error(err);
  //   }
  // } else {
  //   return badRequest;
  // }

  // return success;
}

async function destroyConnection(event, context) {

  const item = await db.Client.delete({
    TableName: db.Table,
    Key: {
      [db.Channel.Connections.Key]: `${db.Connection.Prefix}${db.parseEntityId(event)
        }`,
      [db.Channel.Connections.Range]: `${db.User.Prefix}${event.requestContext.authorizer['cognito:username']}`
    }
  }).promise();

  return success;

}


async function connectionManager(event, context) {
  // we do this so first connect EVER sets up some needed config state in db
  // this goes away after CloudFormation support is added for web sockets
  await wsClient._setupClient(event);
  /*--End Verify Cognito Token--*/

  if (event.requestContext.eventType === "CONNECT") {

    await createConnection(event, context);
    return success;

  } else if (event.requestContext.eventType === "DISCONNECT") {
    // unsub all channels connection was in
    await destroyConnection(event, context);
    return success;
  }
}


async function defaultMessage(event, context) {
  let invalidActionTypeReponse = BadRequest;
  invalidActionTypeReponse.message = "This action is not supported."

  await wsClient.send(event, {
    event: "error",
    data: invalidActionTypeReponse
  });

  return success;
}

async function sendMessage(event, context) {
  // save message for future history
  // saving with timestamp allows sorting
  // maybe do ttl?

  const body = JSON.parse(event.body);
  const messageId = `${db.Message.Prefix}${Date.now()}`;
  const name = body.name
    .replace(/[^a-z0-9\s-]/gi, "")
    .trim()
    .replace(/\+s/g, "-");
  const content = sanitize(body.content, {
    allowedTags: ["ul", "ol", "b", "i", "em", "strike", "pre", "strong", "li"],
    allowedAttributes: {}
  });
  // save message in database for later

  const item = await db.Client.put({
    TableName: db.Table,
    Item: {
      [db.Message.Primary.Key]: `${db.Channel.Prefix}${body.channelId}`,
      [db.Message.Primary.Range]: messageId,
      ConnectionId: `${event.requestContext.connectionId}`,
      Name: name,
      Content: content,
      mongo: mongoCollection
    }
  }).promise();

  const subscribers = await db.fetchChannelSubscriptions(body.channelId);
  const results = subscribers.map(async subscriber => {
    const subscriberId = db.parseEntityId(
      subscriber[db.Channel.Connections.Range]
    );
    return wsClient.send(subscriberId, {
      event: "channel_message",
      channelId: body.channelId,
      name,
      content
    });
  });

  await Promise.all(results); t
}

async function channelManager(event, context) {
  const action = JSON.parse(event.body).action;
  switch (action) {
    case "subscribeChannel":
      await subscribeChannel(event, context);
      break;
    case "unsubscribeChannel":
      await unsubscribeChannel(event, context);
      break;
    default:
      break;
  }

  return success;
}

async function subscribeToGameChannel(event, context, userId) {
  const channelId = JSON.parse(event.body).channelId;
  await db.Client.put({
    TableName: db.Table,
    Item: {
      [db.Channel.Connections.Key]: `${db.Connection.Prefix}${db.parseEntityId(event)
        }`,
      [db.Channel.Connections.Range]: `${db.User.Prefix}${userId}`,
      [db.Channel.Connections.User]: `${db.Channel.Prefix}${channelId}`
    }
  }).promise();

  // Instead of broadcasting here we listen to the dynamodb stream
  // just a fun example of flexible usage
  // you could imagine bots or other sub systems broadcasting via a write the db
  // and then streams does the rest
  return success;
}

async function subscribeChannel(event, context) {
  const channelId = JSON.parse(event.body).channelId;
  await db.Client.put({
    TableName: db.Table,
    Item: {
      [db.Channel.Connections.Key]: `${db.Channel.Prefix}${channelId}`,
      [db.Channel.Connections.Range]: `${db.Connection.Prefix}${db.parseEntityId(event)
        }`
    }
  }).promise();

  // Instead of broadcasting here we listen to the dynamodb stream
  // just a fun example of flexible usage
  // you could imagine bots or other sub systems broadcasting via a write the db
  // and then streams does the rest
  return success;
}

async function unsubscribeChannel(event, context) {
  const channelId = JSON.parse(event.body).channelId;
  const item = await db.Client.delete({
    TableName: db.Table,
    Key: {
      [db.Channel.Connections.Key]: `${db.Channel.Prefix}${channelId}`,
      [db.Channel.Connections.Range]: `${db.Connection.Prefix}${db.parseEntityId(event)
        }`
    }
  }).promise();
  return success;
}

async function addUserToGame(mongoDb, gameDetails, userId) {

  //Subscribe to the channel
  let processedGameState = {};
  let foundUser = gameDetails.players.filter(player => player.playerId == userId);
  if (foundUser < 1) {
    //If the user doesn't exist in the game yet, register them.
    gameDetails.players.push({ playerId: userId, totalPoints: 0, answers: [] });
    try {
      let addUserStatus = await addUserToGameDb(mongoDb, gameDetails);
      return true;

    } catch (error) {
      return false;
      // return { "status": "error", "message": "There was an error adding you to the game. Please try again." };
    }
  } else {
    return true;
  }

}




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


module.exports = {
  connectionManager,
  defaultMessage,
  sendMessage,
  // broadcast,
  subscribeChannel,
  unsubscribeChannel,
  channelManager,
};
