import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export interface LambdaHandler<TEvent = APIGatewayProxyEvent, TResult = APIGatewayProxyResult> {
  (event: TEvent, context: Context): Promise<TResult>;
}

export interface WebSocketEvent {
  requestContext: {
    routeKey: string;
    connectionId: string;
    requestId: string;
    apiId: string;
    stage: string;
    domainName: string;
    requestTime: string;
    requestTimeEpoch: number;
    identity: {
      sourceIp: string;
    };
    authorizer?: {
      [key: string]: string;
    };
  };
  body?: string;
  headers?: { [key: string]: string };
  queryStringParameters?: { [key: string]: string };
  pathParameters?: { [key: string]: string };
}

export interface WebSocketResponse {
  statusCode: number;
  headers?: { [key: string]: string };
  body?: string;
}

export interface HttpError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  connectionId?: string;
  userAgent?: string;
  sourceIp: string;
  timestamp: number;
}

export interface AuthContext {
  userId: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
  subscription?: {
    type: string;
    status: string;
  };
}