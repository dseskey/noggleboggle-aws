import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { WebSocketResponse } from '@nbt/types';
import { getGameConnections } from '../services/connectionService';

let apiGatewayClient: ApiGatewayManagementApiClient | null = null;

function getApiGatewayClient(): ApiGatewayManagementApiClient {
  if (!apiGatewayClient) {
    const endpoint = process.env.WEBSOCKET_API_ENDPOINT?.replace('wss://', 'https://');
    
    if (!endpoint) {
      throw new Error('WEBSOCKET_API_ENDPOINT environment variable not set');
    }

    apiGatewayClient = new ApiGatewayManagementApiClient({
      endpoint,
      region: process.env.AWS_REGION,
    });
  }

  return apiGatewayClient;
}

export async function sendToConnection(connectionId: string, message: WebSocketResponse): Promise<boolean> {
  try {
    const client = getApiGatewayClient();
    
    await client.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(message),
    }));

    return true;
  } catch (error) {
    console.error(`Failed to send message to connection ${connectionId}:`, error);
    
    // Handle stale connections (410 Gone error)
    if (error instanceof Error && error.name === 'GoneException') {
      console.log(`Connection ${connectionId} is stale, removing...`);
      // Remove stale connection
      const { removeConnection } = await import('../services/connectionService');
      await removeConnection(connectionId);
    }
    
    return false;
  }
}

export async function sendToUser(userId: string, message: WebSocketResponse): Promise<number> {
  try {
    const { getUserConnections } = await import('../services/connectionService');
    const connections = await getUserConnections(userId);
    
    let successCount = 0;
    
    for (const connection of connections) {
      const sent = await sendToConnection(connection.connectionId, message);
      if (sent) successCount++;
    }
    
    return successCount;
  } catch (error) {
    console.error(`Failed to send message to user ${userId}:`, error);
    return 0;
  }
}

export async function sendToGameParticipants(
  gameId: string, 
  message: WebSocketResponse,
  excludeConnectionId?: string
): Promise<number> {
  try {
    const connections = await getGameConnections(gameId);
    let successCount = 0;
    
    for (const session of connections) {
      if (excludeConnectionId && session.connectionId === excludeConnectionId) {
        continue;
      }
      
      const sent = await sendToConnection(session.connectionId, message);
      if (sent) successCount++;
    }
    
    return successCount;
  } catch (error) {
    console.error(`Failed to send message to game ${gameId} participants:`, error);
    return 0;
  }
}

export async function broadcastToGame(
  gameId: string,
  event: string,
  data: unknown,
  excludeConnectionId?: string
): Promise<number> {
  const message: WebSocketResponse = {
    event,
    data,
    timestamp: Date.now(),
  };
  
  return await sendToGameParticipants(gameId, message, excludeConnectionId);
}

export async function sendErrorToConnection(
  connectionId: string,
  error: string,
  requestId?: string
): Promise<boolean> {
  const message: WebSocketResponse = {
    event: 'error',
    error,
    requestId,
    timestamp: Date.now(),
  };
  
  return await sendToConnection(connectionId, message);
}

export async function sendSuccessToConnection(
  connectionId: string,
  event: string,
  data: unknown,
  requestId?: string
): Promise<boolean> {
  const message: WebSocketResponse = {
    event,
    data,
    requestId,
    timestamp: Date.now(),
  };
  
  return await sendToConnection(connectionId, message);
}