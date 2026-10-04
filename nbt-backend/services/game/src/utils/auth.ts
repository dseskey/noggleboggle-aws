import jwt from 'jsonwebtoken';
import { AuthContext } from '@nbt/types';

interface JWTPayload {
  sub: string;
  email: string;
  'cognito:username': string;
  'custom:display_name'?: string;
  exp: number;
  iat: number;
}

export async function verifyWebSocketToken(token: string): Promise<AuthContext | null> {
  try {
    // In a real implementation, you would:
    // 1. Get the JWT public key from Cognito
    // 2. Verify the token signature
    // 3. Check token expiration
    
    // For now, we'll decode without verification (NOT for production)
    const decoded = jwt.decode(token) as JWTPayload;
    
    if (!decoded || !decoded.sub || !decoded.email) {
      return null;
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      return null;
    }

    return {
      userId: decoded.sub,
      email: decoded.email,
      username: decoded['cognito:username'] || decoded.email,
      roles: ['user'], // Default role
      permissions: ['game:join', 'game:play'], // Default permissions
    };

  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export async function extractUserFromToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    
    if (!decoded || !decoded.sub || !decoded.email) {
      return null;
    }

    return {
      userId: decoded.sub,
      email: decoded.email,
    };

  } catch (error) {
    console.error('Token extraction error:', error);
    return null;
  }
}

export function hasPermission(authContext: AuthContext, permission: string): boolean {
  return authContext.permissions.includes(permission) || authContext.roles.includes('admin');
}

export function isGameOwner(authContext: AuthContext, ownerId: string): boolean {
  return authContext.userId === ownerId || authContext.roles.includes('admin');
}