export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface WebSocketMessage<T = unknown> {
  action: string;
  data?: T;
  requestId?: string;
  timestamp: number;
}

export interface WebSocketResponse<T = unknown> {
  event: string;
  data?: T;
  error?: string;
  requestId?: string;
  timestamp: number;
}

export type EntityStatus = 'active' | 'inactive' | 'deleted';

export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: EntityStatus;
}

export interface DynamoDBKeys {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
}