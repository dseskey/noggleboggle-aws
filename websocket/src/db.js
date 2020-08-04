const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

const db = {
    Table: process.env.APPLICATION_TABLE,
    Primary: {
        Key: 'pk',
        Range: 'sk',
        User: 'tk'
    },
    Connection: {
        Primary: {
            Key: 'pk',
            Range: 'sk',
            User: 'tk'
        },
        Channels: {
            Index: 'reverse',
            Key: 'sk',
            Range: 'pk',
            User: 'tk'
        },
        Prefix: 'CONNECTION|',
        Entity: 'CONNECTION'
    },
    Channel: {
        Primary: {
            Key: 'pk',
            Range: 'sk',
            User: 'tk'
        },
        Connections: {
            Key: 'pk',
            Range: 'sk',
            User: 'tk'
        },
        Messages: {
            Key: 'pk',
            Range: 'sk',
            User: 'tk'
        },
        Prefix: 'CHANNEL|',
        Entity: 'CHANNEL'
    },
    User:{
        Primary: {
            Key: 'pk',
            Range: 'sk',
            User: 'tk'
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
function parseEntityId(target){
    console.log('ENTITY ID A ', target)

    if(typeof target === 'object'){
        // use from raw event, only needed for connectionId at the moment
        target = target.requestContext.connectionId;
    } else {
        // strip prefix if set so we always get raw id
        target = target
                .replace(channelRegex, '')
                .replace(messageRegex, '')
                .replace(connectionRegex, '').replace(userRegex, '');
    }

    return target.replace('|', ''); // why?!
}

async function fetchConnectionSubscriptions(connection){
    const connectionId = parseEntityId(connection)
    const results = await ddb.query({
        TableName: db.Table,
        IndexName: db.Connection.Channels.Index,
        KeyConditionExpression: `${
          db.Connection.Channels.Key
        } = :connectionId and begins_with(${
          db.Connection.Channels.Range
        }, :channelEntity)`,
        ExpressionAttributeValues: {
          ":connectionId": `${db.Connection.Prefix}${
            connectionId
          }`,
          ":channelEntity": db.Channel.Prefix
        }
      }).promise();

      return results.Items;
}

async function fetchChannelSubscriptions(channel){
    const channelId = parseEntityId(channel)
    const results = await ddb.query({
        TableName: db.Table,
        KeyConditionExpression: `${
          db.Channel.Connections.Key
        } = :channelId and begins_with(${
          db.Channel.Connections.Range
        }, :connectionEntity)`,
        ExpressionAttributeValues: {
          ":channelId": `${db.Channel.Prefix}${channelId}`,
          ":connectionEntity": db.Connection.Prefix
        }
      }).promise();

      return results.Items;
}


const client = {
    ...db,
    parseEntityId,
    fetchConnectionSubscriptions,
    fetchChannelSubscriptions,
    Client: ddb
}

module.exports = client