import { getDynamoClient, TABLE_NAME, KeyPatterns } from '@nbt/database';
import { Game, GameParticipant, DynamoDBKeys } from '@nbt/types';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = getDynamoClient();

export async function createGame(gameData: Game): Promise<Game> {
  const gameKeys = KeyPatterns.game(gameData.id);
  const ownerGameKeys = KeyPatterns.gameByOwner(gameData.ownerId, gameData.createdAt);
  const gameCodeKeys = KeyPatterns.gameByCode(gameData.gameCode, gameData.id);

  const gameItem: Game & DynamoDBKeys = {
    ...gameData,
    ...gameKeys,
    ...ownerGameKeys,
    ...gameCodeKeys,
  };

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: gameItem,
    ConditionExpression: 'attribute_not_exists(PK)',
  }));

  return gameData;
}

export async function getGameById(gameId: string): Promise<Game | null> {
  const keys = KeyPatterns.game(gameId);
  
  const result = await dynamoClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: keys,
  }));

  return result.Item as Game || null;
}

export async function getGameByCode(gameCode: string): Promise<Game | null> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :gameCode',
    ExpressionAttributeValues: {
      ':gameCode': `GAME#${gameCode}`,
    },
    Limit: 1,
  }));

  return result.Items?.[0] as Game || null;
}

export async function updateGame(gameId: string, updates: Partial<Game>): Promise<Game> {
  const keys = KeyPatterns.game(gameId);
  
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

  return result.Attributes as Game;
}

export async function updateGameState(gameId: string, stateUpdate: Partial<Pick<Game, 'state' | 'startedAt' | 'endedAt' | 'currentQuestionIndex'>>): Promise<void> {
  const keys = KeyPatterns.game(gameId);
  
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(stateUpdate).forEach(([key, value]) => {
    if (value !== undefined) {
      const attrName = `#${key}`;
      const attrValue = `:${key}`;
      
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
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

export async function addParticipantToGame(gameId: string, participant: GameParticipant): Promise<void> {
  const participantKeys = KeyPatterns.gameParticipant(gameId, participant.userId);
  const userGameKeys = KeyPatterns.userGame(participant.userId, gameId);

  const participantItem = {
    ...participant,
    ...participantKeys,
    ...userGameKeys,
    entityType: 'GAME_PARTICIPANT',
  };

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: participantItem,
  }));

  // Also update the main game record to include participant count
  await dynamoClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: KeyPatterns.game(gameId),
    UpdateExpression: 'ADD participantCount :one SET updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':one': 1,
      ':timestamp': Date.now(),
    },
  }));
}

export async function updateParticipant(gameId: string, userId: string, updates: Partial<GameParticipant>): Promise<void> {
  const keys = KeyPatterns.gameParticipant(gameId, userId);
  
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const attrName = `#${key}`;
      const attrValue = `:${key}`;
      
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
    }
  });

  if (updateExpressions.length > 0) {
    await dynamoClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: keys,
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }
}

export async function getGameParticipants(gameId: string): Promise<GameParticipant[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `GAME#${gameId}`,
      ':sk': 'PARTICIPANT#',
    },
  }));

  return result.Items as GameParticipant[] || [];
}

export async function getUserGames(userId: string): Promise<Game[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'PARTICIPANT#',
    },
  }));

  // This returns participant records, we'd need to fetch the actual games
  // For now, return empty array - would need additional implementation
  return [];
}

export async function getGamesByOwner(ownerId: string, limit: number = 20): Promise<Game[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :ownerId',
    ExpressionAttributeValues: {
      ':ownerId': `GAME#${ownerId}`,
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit,
  }));

  return result.Items as Game[] || [];
}

export async function deleteGame(gameId: string): Promise<void> {
  // In a real implementation, this would be a complex operation
  // involving deleting all related records (participants, sessions, etc.)
  // For now, just mark as deleted
  await updateGameState(gameId, { state: 'cancelled' });
}