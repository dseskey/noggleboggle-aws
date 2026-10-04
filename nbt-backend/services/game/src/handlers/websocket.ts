import { APIGatewayProxyHandler } from 'aws-lambda';
import { WebSocketEvent, WebSocketResponse } from '@nbt/types';
import { createConnection, removeConnection } from '../services/connectionService';
import { verifyWebSocketToken } from '../utils/auth';
import { sendToConnection } from '../utils/websocket';

export const connectHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!;
    const token = event.queryStringParameters?.token;

    if (!token) {
      return {
        statusCode: 401,
        body: 'Unauthorized: Missing token',
      };
    }

    // Verify JWT token
    const userData = await verifyWebSocketToken(token);
    if (!userData) {
      return {
        statusCode: 401,
        body: 'Unauthorized: Invalid token',
      };
    }

    // Store connection in DynamoDB
    await createConnection({
      connectionId,
      userId: userData.userId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      gameId: null,
      role: null,
    });

    // Send welcome message
    await sendToConnection(connectionId, {
      event: 'connected',
      data: {
        connectionId,
        userId: userData.userId,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });

    return { statusCode: 200, body: 'Connected' };

  } catch (error) {
    console.error('WebSocket connect error:', error);
    return {
      statusCode: 500,
      body: 'Internal server error',
    };
  }
};

export const disconnectHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!;

    // Remove connection and handle any cleanup
    await removeConnection(connectionId);

    return { statusCode: 200, body: 'Disconnected' };

  } catch (error) {
    console.error('WebSocket disconnect error:', error);
    return {
      statusCode: 500,
      body: 'Internal server error',
    };
  }
};

export const defaultHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!;
    const body = event.body ? JSON.parse(event.body) : {};

    // Send error for unrecognized actions
    await sendToConnection(connectionId, {
      event: 'error',
      data: {
        message: `Unrecognized action: ${body.action || 'none'}`,
        requestId: body.requestId,
      },
      timestamp: Date.now(),
    });

    return { statusCode: 200, body: 'Message sent' };

  } catch (error) {
    console.error('WebSocket default handler error:', error);
    return {
      statusCode: 500,
      body: 'Internal server error',
    };
  }
};