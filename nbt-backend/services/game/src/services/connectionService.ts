import { getDynamoClient, TABLE_NAME, KeyPatterns } from '@nbt/database';
import { GameSession, DynamoDBKeys } from '@nbt/types';
import { PutCommand, DeleteCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = getDynamoClient();

interface ConnectionData {
  connectionId: string;
  userId: string;
  connectedAt: number;
  lastActivity: number;
  gameId: string | null;
  role: 'owner' | 'player' | 'spectator' | null;
}

export async function createConnection(connectionData: ConnectionData): Promise<void> {
  const item: ConnectionData & DynamoDBKeys = {
    ...connectionData,
    PK: `CONNECTION#${connectionData.connectionId}`,
    SK: `CONNECTION#${connectionData.connectionId}`,
    GSI1PK: `USER#${connectionData.userId}`,
    GSI1SK: `CONNECTION#${connectionData.connectedAt}`,
  };

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: item,
  }));
}

export async function removeConnection(connectionId: string): Promise<void> {
  // Get connection data first to handle game cleanup
  const connection = await getConnection(connectionId);
  
  if (connection && connection.gameId) {
    // Remove from game session if user was in a game
    await removeFromGameSession(connection.gameId, connectionId);
    
    // Notify other players in the game
    await notifyGameParticipants(connection.gameId, {
      event: 'player-disconnected',
      data: {
        userId: connection.userId,
        connectionId,
      },
      timestamp: Date.now(),
    });
  }

  // Delete the connection record
  await dynamoClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `CONNECTION#${connectionId}`,
      SK: `CONNECTION#${connectionId}`,
    },
  }));
}

export async function getConnection(connectionId: string): Promise<ConnectionData | null> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `CONNECTION#${connectionId}`,
    },
    Limit: 1,
  }));

  return result.Items?.[0] as ConnectionData || null;
}

export async function updateConnectionActivity(connectionId: string): Promise<void> {
  await dynamoClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `CONNECTION#${connectionId}`,
      SK: `CONNECTION#${connectionId}`,
    },
    UpdateExpression: 'SET lastActivity = :timestamp',
    ExpressionAttributeValues: {
      ':timestamp': Date.now(),
    },
  }));
}

export async function joinGameSession(gameId: string, connectionId: string, userId: string, role: 'owner' | 'player' | 'spectator'): Promise<void> {
  const sessionKeys = KeyPatterns.gameSession(gameId, connectionId);
  const userSessionKeys = KeyPatterns.userSession(userId, gameId);

  const sessionItem: GameSession & DynamoDBKeys = {
    gameId,
    connectionId,
    userId,
    role,
    joinedAt: Date.now(),
    lastActivity: Date.now(),
    ...sessionKeys,
    ...userSessionKeys,
  };

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: sessionItem,
  }));

  // Update connection with game info
  await dynamoClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `CONNECTION#${connectionId}`,
      SK: `CONNECTION#${connectionId}`,
    },
    UpdateExpression: 'SET gameId = :gameId, #role = :role, lastActivity = :timestamp',
    ExpressionAttributeNames: {
      '#role': 'role',
    },
    ExpressionAttributeValues: {
      ':gameId': gameId,
      ':role': role,
      ':timestamp': Date.now(),
    },
  }));
}

export async function removeFromGameSession(gameId: string, connectionId: string): Promise<void> {
  await dynamoClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `SESSION#${gameId}`,
      SK: `SESSION#${connectionId}`,
    },
  }));

  // Clear game info from connection
  await dynamoClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `CONNECTION#${connectionId}`,
      SK: `CONNECTION#${connectionId}`,
    },
    UpdateExpression: 'SET gameId = :null, #role = :null, lastActivity = :timestamp',
    ExpressionAttributeNames: {
      '#role': 'role',
    },
    ExpressionAttributeValues: {
      ':null': null,
      ':timestamp': Date.now(),
    },
  }));
}

export async function getGameConnections(gameId: string): Promise<GameSession[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `SESSION#${gameId}`,
    },
  }));

  return result.Items as GameSession[] || [];
}

export async function getUserConnections(userId: string): Promise<ConnectionData[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
    },
  }));

  return result.Items as ConnectionData[] || [];
}

// Helper function to notify game participants
async function notifyGameParticipants(gameId: string, message: unknown): Promise<void> {
  const { sendToGameParticipants } = await import('../utils/websocket');
  await sendToGameParticipants(gameId, message);
}