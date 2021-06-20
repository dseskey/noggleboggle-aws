const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

const db = {
  Table: process.env.APPLICATION_TABLE,
  Primary: {
    Key: 'pk',
    Range: 'sk',
    User: 'gameId'
  },
  Connection: {
    Primary: {
      Key: 'pk',
      Range: 'sk',
      User: 'gameId'
    },
    Channels: {
      Index: 'reverse',
      Key: 'sk',
      Range: 'pk',
      User: 'gameId'
    },
    Prefix: 'CONNECTION|',
    Entity: 'CONNECTION'
  },
  Channel: {
    Primary: {
      Key: 'pk',
      Range: 'sk',
      User: 'gameId'
    },
    Connections: {
      Key: 'pk',
      Range: 'sk',
      User: 'gameId'
    },
    Messages: {
      Key: 'pk',
      Range: 'sk',
      User: 'gameId'
    },
    Prefix: 'CHANNEL|',
    Entity: 'CHANNEL'
  },
  User: {
    Primary: {
      Key: 'pk',
      Range: 'sk',
      User: 'gameId'
    },
    Prefix: 'USER|',
    Entity: 'USER'
  },
  Message: {
    Primary: {
      Key: 'pk',
      Range: 'sk'
    },
    Prefix: 'MESSAGE|',
    Entity: 'MESSAGE'
  }
}

const channelRegex = new RegExp(`^${db.Channel.Entity}\|`);
const messageRegex = new RegExp(`^${db.Message.Entity}\|`);
const connectionRegex = new RegExp(`^${db.Connection.Entity}\|`);
const userRegex = new RegExp(`^${db.User.Entity}\|`);
function parseEntityId(target) {
  console.log('ENTITY ID A ', target)

  if (typeof target === 'object') {
    // use from raw event, only needed for connectionId at the moment
    target = target.requestContext.connectionId;
  } else {
    // strip prefix if set so we always get raw id
    target = target.replace(connectionRegex, '').replace(userRegex, '')
      .replace(channelRegex, '')
      .replace(messageRegex, '');
  }

  return target.replace('|', ''); // why?!
}

async function fetchConnectionSubscriptions(connection) {
  const connectionId = parseEntityId(connection)
console.log('items');
  const results = await ddb.query({
    TableName: db.Table,
    KeyConditionExpression: `${db.Connection.Primary.Key
      } = :connectionId`,
    ExpressionAttributeValues: {
        ":connectionId": `${db.Connection.Prefix}${connectionId}`
      }
  }).promise();
  console.log(results.Items);

  return results.Items;
}

async function fetchChannelSubscriptions(channel) {

  const channelId = parseEntityId(channel);
  const results = await ddb.scan({
    TableName: db.Table,
    FilterExpression: 'gameId = :gameId',
    ExpressionAttributeValues: {
        ':gameId': `${db.Channel.Prefix}${channelId}`
    },
  }).promise();

  return results.Items;
}

async function updateChannelId(event, gameId) {
  const body = JSON.parse(event.body);
  let x = await ddb.update({
    TableName: db.Table,
    Key: {
      "pk": `${db.Connection.Prefix}${parseEntityId(event)}`,
      "sk": `${db.User.Prefix}${event.requestContext.authorizer['cognito:username']}`
    },
    UpdateExpression: "set gameId = :gameId",
    ExpressionAttributeValues: {
      ":gameId": `${db.Channel.Prefix}${gameId}`
    }
  }).promise();

  console.log(x);
  return x;
}

// [db.Channel.Connections.Key]: `${db.Connection.Prefix}${db.parseEntityId(event)
// }`,
// [db.Channel.Connections.Range]: `${db.User.Prefix}${userId}`,

async function getChannelIdFromConnection(event) {
  const body = JSON.parse(event.body);
  const results = await ddb.get({
    TableName: db.Table,
    Key: {
      "pk": `${db.Connection.Prefix}${parseEntityId(event)}`,
      "sk": `${db.User.Prefix}${event.requestContext.authorizer['cognito:username']}`
    },
  }).promise();
  return results.Item.gameId;


}

const client = {
  ...db,
  parseEntityId,
  fetchConnectionSubscriptions,
  fetchChannelSubscriptions,
  updateChannelId,
  getChannelIdFromConnection,
  Client: ddb
}

module.exports = client