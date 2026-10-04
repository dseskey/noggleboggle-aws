import { getDynamoClient, TABLE_NAME, KeyPatterns } from '@nbt/database';
import { User, DynamoDBKeys } from '@nbt/types';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = getDynamoClient();

export async function createUser(userData: User): Promise<User> {
  const userKeys = KeyPatterns.user(userData.id);
  const emailKeys = KeyPatterns.userByEmail(userData.email, userData.id);
  const usernameKeys = KeyPatterns.userByUsername(userData.username, userData.id);

  const userItem: User & DynamoDBKeys = {
    ...userData,
    ...userKeys,
    ...emailKeys,
    ...usernameKeys,
  };

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: userItem,
    ConditionExpression: 'attribute_not_exists(PK)',
  }));

  return userData;
}

export async function getUserById(userId: string): Promise<User | null> {
  const keys = KeyPatterns.user(userId);
  
  const result = await dynamoClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: keys,
  }));

  return result.Item as User || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :email',
    ExpressionAttributeValues: {
      ':email': `USER#${email}`,
    },
    Limit: 1,
  }));

  return result.Items?.[0] as User || null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :username',
    ExpressionAttributeValues: {
      ':username': `USER#${username}`,
    },
    Limit: 1,
  }));

  return result.Items?.[0] as User || null;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
  const keys = KeyPatterns.user(userId);
  
  // Build update expression dynamically
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id' && value !== undefined) {
      const attrName = `#${key}`;
      const attrValue = `:${key}`;
      
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
    }
  });

  // Always update the updatedAt timestamp
  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = Date.now();

  const result = await dynamoClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: keys,
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes as User;
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  const keys = KeyPatterns.user(userId);
  
  await dynamoClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: keys,
    UpdateExpression: 'SET lastLoginAt = :timestamp, updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':timestamp': Date.now(),
    },
  }));
}

export async function updateUserStats(userId: string, statsUpdate: Partial<User['stats']>): Promise<void> {
  const keys = KeyPatterns.user(userId);
  
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(statsUpdate).forEach(([key, value]) => {
    if (value !== undefined) {
      const attrName = `#stats_${key}`;
      const attrValue = `:stats_${key}`;
      
      updateExpressions.push(`stats.${attrName.replace('#stats_', '#')} = ${attrValue}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[attrValue] = value;
    }
  });

  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = Date.now();

  await dynamoClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: keys,
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  }));
}

export async function deactivateUser(userId: string): Promise<void> {
  await updateUser(userId, { status: 'inactive' });
}

export async function deleteUser(userId: string): Promise<void> {
  await updateUser(userId, { status: 'deleted' });
}