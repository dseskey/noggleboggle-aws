import { APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '@nbt/types';

export function formatApiResponse<T = unknown>(
  statusCode: number,
  data: ApiResponse<T>,
  headers: Record<string, string> = {}
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
    body: JSON.stringify(data),
  };
}

export function formatSuccessResponse<T = unknown>(
  data: T,
  message?: string,
  statusCode: number = 200
): APIGatewayProxyResult {
  return formatApiResponse(statusCode, {
    success: true,
    data,
    message,
  });
}

export function formatErrorResponse(
  error: string,
  statusCode: number = 500,
  details?: unknown
): APIGatewayProxyResult {
  return formatApiResponse(statusCode, {
    success: false,
    error,
    ...(details && { details }),
  });
}

export function formatValidationErrorResponse(
  errors: Array<{ field: string; message: string }>,
  statusCode: number = 400
): APIGatewayProxyResult {
  return formatApiResponse(statusCode, {
    success: false,
    error: 'Validation failed',
    details: errors,
  });
}