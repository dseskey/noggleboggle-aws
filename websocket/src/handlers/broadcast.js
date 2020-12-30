const db = require("../db");
const ws = require("../websocket-client");
const {BadRequest, Unauthorized, InternalServerError} = require('../httpResponseSturctures');

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


// oh my... this got out of hand refactor for sanity
async function broadcaster(event, context) {
  // info from table stream, we'll learn about connections
  // disconnections, messages, etc
  // get all connections for channel of interest
  // broadcast the news
  
  const results = event.Records.map(async record => {
    let connectionId = null; //Used if and only if this is a first connection attempt.
    switch (record.dynamodb.Keys[db.Primary.Key].S.split("|")[0]) {
      // Connection entities
      case db.Connection.Entity:
        break;

      // Channel entities (most stuff)
      case db.Channel.Entity:
        // figure out what to do based on full entity model

        // get secondary ENTITY| type by splitting on | and looking at first part
        switch (record.dynamodb.Keys[db.Primary.Range].S.split("|")[0]) {
          // if we are a CONNECTION
          case db.Connection.Entity: {
            let eventType = "sub";
            connectionId = event.Records[0].dynamodb.Keys.sk.S.split("|")[1];
            if (record.eventName === "REMOVE") {
              eventType = "unsub";
            } else if (record.eventName === "UPDATE") {
              // currently not possible, and not handled
              break;
            }

            // A connection event on the channel
            // let all users know a connection was created or dropped
            const channelId = db.parseEntityId(
              record.dynamodb.Keys[db.Primary.Key].S
            );
            const subscribers = await db.fetchChannelSubscriptions(channelId);
           
            const results = subscribers.map(async subscriber => {
              const subscriberId = db.parseEntityId(
                subscriber[db.Channel.Connections.Range]
              );
              
              return wsClient.send(
                (connectionId != null ? connectionId : subscriberId), // really backwards way of getting connection id
                {
                  event: `subscriber_${eventType}`,
                  channelId,
                  // sender of message "from id"
                  subscriberId: db.parseEntityId(
                    record.dynamodb.Keys[db.Primary.Range].S
                  )
                }
              );
            });

            await Promise.all(results);
            break;
          }

          // If we are a MESSAGE
          case db.Message.Entity: {
            if (record.eventName !== "INSERT") {
              return success;
            }

            // We could do interesting things like see if this was a bot
            // or other system directly adding messages to the dynamodb table
            // then send them out, otherwise assume it was already blasted out on the sockets
            // and no need to send it again!
            break;
          }
          default:
            break;
        }

        break;
      default:
        break;
    }
  });

  await Promise.all(results);
  return success;
}

// module.exports.loadHistory = async (event, context) => {
//   // only allow firs

module.exports = {
  broadcaster
};
