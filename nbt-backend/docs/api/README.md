# NBT Backend API Documentation

## Overview

The NBT Backend provides both REST API endpoints and WebSocket connections for real-time trivia gaming. This document outlines all available endpoints, their parameters, and expected responses.

## Base URLs

- **Development**: `https://api-dev.nbt.example.com`
- **Production**: `https://api.nbt.example.com`
- **WebSocket**: `wss://ws.nbt.example.com/{stage}`

## Authentication

### JWT Token Authentication
Most endpoints require a JWT token obtained from the authentication endpoints.

**Header Format:**
```
Authorization: Bearer <jwt_token>
```

### WebSocket Authentication
WebSocket connections require token authentication via query parameters:
```
wss://ws.nbt.example.com/dev?token=<jwt_token>
```

## API Endpoints

### Authentication Service

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "player123",
  "password": "SecurePass123!",
  "displayName": "Player Name"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "username": "player123",
    "requiresVerification": true
  },
  "message": "User registered successfully"
}
```

**Error Responses:**
- `400`: Invalid email format, weak password, username taken
- `500`: Internal server error

#### POST /auth/login
Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_token_here",
    "idToken": "id_token_here",
    "refreshToken": "refresh_token_here",
    "expiresIn": 3600,
    "user": {
      "userId": "uuid",
      "email": "user@example.com",
      "username": "player123",
      "displayName": "Player Name",
      "avatar": "https://..."
    }
  }
}
```

**Error Responses:**
- `401`: Invalid credentials, unverified email
- `429`: Too many login attempts
- `500`: Internal server error

#### GET /auth/profile
Get current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "username": "player123",
    "displayName": "Player Name",
    "avatar": "https://...",
    "preferences": {
      "notifications": {
        "email": true,
        "push": true,
        "gameInvites": true
      },
      "privacy": {
        "profileVisibility": "public",
        "showOnlineStatus": true
      }
    },
    "stats": {
      "totalGamesPlayed": 25,
      "totalGamesWon": 15,
      "totalPoints": 12500,
      "currentStreak": 3
    }
  }
}
```

#### PUT /auth/profile
Update user profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "displayName": "New Display Name",
  "avatar": "https://new-avatar-url.com",
  "preferences": {
    "notifications": {
      "email": false,
      "push": true
    }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Updated user profile
  },
  "message": "Profile updated successfully"
}
```

### Question Service

#### POST /questions
Create a new trivia question.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "text": "What is the capital of France?",
  "type": "multiple-choice",
  "category": "Geography",
  "difficulty": "easy",
  "points": 100,
  "timeLimit": 30,
  "options": [
    {"text": "London", "isCorrect": false},
    {"text": "Berlin", "isCorrect": false},
    {"text": "Paris", "isCorrect": true},
    {"text": "Madrid", "isCorrect": false}
  ],
  "correctAnswer": "Paris",
  "explanation": "Paris has been the capital of France since...",
  "tags": ["europe", "capitals"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "question_uuid",
    "text": "What is the capital of France?",
    "type": "multiple-choice",
    "category": "Geography",
    "difficulty": "easy",
    "points": 100,
    "timeLimit": 30,
    "options": [...],
    "explanation": "Paris has been the capital...",
    "tags": ["europe", "capitals"],
    "createdAt": 1640995200000
  }
}
```

#### GET /questions
List questions with optional filtering.

**Query Parameters:**
- `category` (optional): Filter by category
- `difficulty` (optional): Filter by difficulty (easy/medium/hard)
- `userId` (optional): Get questions created by specific user
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "question_uuid",
      "text": "What is the capital of France?",
      "type": "multiple-choice",
      "category": "Geography",
      "difficulty": "easy",
      "points": 100,
      "timeLimit": 30,
      "tags": ["europe", "capitals"],
      "createdAt": 1640995200000
      // Note: correctAnswer is not included in list view
    }
  ]
}
```

#### POST /questions/generate
Generate questions using AI.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "topic": "World History",
  "difficulty": "medium",
  "type": "multiple-choice",
  "count": 5,
  "categories": ["History"],
  "customPrompt": "Generate questions about ancient civilizations"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "generated_question_uuid",
        "text": "Which ancient civilization built Machu Picchu?",
        "type": "multiple-choice",
        "category": "History",
        "difficulty": "medium",
        "points": 150,
        "timeLimit": 30,
        "options": [...],
        "correctAnswer": "Inca",
        "explanation": "Machu Picchu was built by the Inca civilization...",
        "source": {
          "type": "ai-generated",
          "aiModel": "claude-3-haiku",
          "createdBy": "user_uuid"
        }
      }
    ],
    "usage": {
      "promptTokens": 150,
      "completionTokens": 800,
      "totalTokens": 950
    },
    "model": "anthropic.claude-3-haiku-20240307-v1:0",
    "generatedAt": 1640995200000
  }
}
```

**Error Responses:**
- `400`: Invalid parameters, missing required fields
- `429`: Rate limit exceeded
- `402`: AI service quota exceeded
- `500`: AI generation failed

## WebSocket Events

### Connection Management

#### connect
Establish WebSocket connection.

**Query Parameters:**
```
?token=<jwt_token>
```

**Server Response:**
```json
{
  "event": "connected",
  "data": {
    "connectionId": "connection_uuid",
    "userId": "user_uuid",
    "timestamp": 1640995200000
  }
}
```

#### disconnect
Connection closed (automatic).

### Game Events

#### createGame
Create a new game session.

**Client Message:**
```json
{
  "action": "createGame",
  "data": {
    "token": "jwt_token",
    "gameData": {
      "title": "Friday Night Trivia",
      "description": "Weekly trivia night",
      "gameMode": "classic",
      "maxParticipants": 20,
      "questionTimeLimit": 30,
      "difficulty": "medium",
      "categories": ["Science", "History"],
      "isPrivate": false,
      "requirePassword": false
    }
  },
  "requestId": "client_request_uuid"
}
```

**Server Response:**
```json
{
  "event": "game-created",
  "data": {
    "game": {
      "id": "game_uuid",
      "gameCode": "ABC123",
      "title": "Friday Night Trivia",
      "state": "created",
      "ownerId": "user_uuid",
      "settings": {
        "maxParticipants": 20,
        "questionTimeLimit": 30,
        "difficulty": "medium"
      }
    }
  },
  "requestId": "client_request_uuid",
  "timestamp": 1640995200000
}
```

#### joinGame
Join an existing game.

**Client Message:**
```json
{
  "action": "joinGame",
  "data": {
    "token": "jwt_token",
    "gameCode": "ABC123",
    "password": "optional_password",
    "role": "player"
  },
  "requestId": "client_request_uuid"
}
```

**Server Response (Success):**
```json
{
  "event": "game-joined",
  "data": {
    "game": {
      "id": "game_uuid",
      "gameCode": "ABC123",
      "title": "Friday Night Trivia",
      "state": "waiting",
      "currentQuestionIndex": -1,
      "participant": {
        "userId": "user_uuid",
        "displayName": "Player Name",
        "role": "player",
        "joinedAt": 1640995200000,
        "isReady": false,
        "currentScore": 0
      }
    }
  },
  "requestId": "client_request_uuid",
  "timestamp": 1640995200000
}
```

**Broadcast to Other Participants:**
```json
{
  "event": "participant-joined",
  "data": {
    "participant": {
      "userId": "user_uuid",
      "displayName": "Player Name",
      "role": "player",
      "joinedAt": 1640995200000
    },
    "participantCount": 5
  },
  "timestamp": 1640995200000
}
```

#### startGame
Start the game (owner only).

**Client Message:**
```json
{
  "action": "startGame",
  "data": {
    "token": "jwt_token",
    "gameId": "game_uuid"
  },
  "requestId": "client_request_uuid"
}
```

**Server Response:**
```json
{
  "event": "game-start-initiated",
  "data": {
    "gameId": "game_uuid",
    "countdown": 5
  },
  "requestId": "client_request_uuid",
  "timestamp": 1640995200000
}
```

**Broadcast to All Participants:**
```json
{
  "event": "game-starting",
  "data": {
    "countdown": 5,
    "message": "Game starting soon..."
  },
  "timestamp": 1640995200000
}
```

**After Countdown:**
```json
{
  "event": "game-started",
  "data": {
    "currentQuestionIndex": 0,
    "question": {
      "id": "question_uuid",
      "text": "What is the capital of France?",
      "type": "multiple-choice",
      "category": "Geography",
      "difficulty": "easy",
      "points": 100,
      "timeLimit": 30,
      "options": [
        {"id": "opt1", "text": "London"},
        {"id": "opt2", "text": "Berlin"},
        {"id": "opt3", "text": "Paris"},
        {"id": "opt4", "text": "Madrid"}
      ]
      // Note: correctAnswer is not included
    }
  },
  "timestamp": 1640995200000
}
```

#### submitAnswer
Submit answer to current question.

**Client Message:**
```json
{
  "action": "submitAnswer",
  "data": {
    "token": "jwt_token",
    "gameId": "game_uuid",
    "questionId": "question_uuid",
    "answer": "Paris",
    "submittedAt": 1640995205000
  },
  "requestId": "client_request_uuid"
}
```

**Server Response:**
```json
{
  "event": "answer-submitted",
  "data": {
    "questionId": "question_uuid",
    "isCorrect": true,
    "pointsAwarded": 125,
    "timeToAnswer": 5000,
    "correctAnswer": "Paris",
    "explanation": "Paris has been the capital of France since...",
    "currentScore": 125,
    "position": 1
  },
  "requestId": "client_request_uuid",
  "timestamp": 1640995205000
}
```

### Error Events

**Error Response Format:**
```json
{
  "event": "error",
  "error": "Error message here",
  "requestId": "client_request_uuid",
  "timestamp": 1640995200000
}
```

**Common Error Types:**
- `"Authentication required"` - Missing or invalid token
- `"Game not found"` - Invalid game code
- `"Game is full"` - Maximum participants reached
- `"Only the game owner can start the game"` - Permission denied
- `"Invalid password"` - Wrong game password
- `"Game has ended"` - Cannot join finished game

## Rate Limits

- **Authentication endpoints**: 10 requests per minute per IP
- **Question creation**: 30 requests per minute per user
- **AI generation**: 5 requests per minute per user
- **WebSocket messages**: 100 messages per minute per connection

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "details": {
    // Additional error details when available
  }
}
```

## SDK and Client Libraries

### JavaScript/TypeScript
```bash
npm install @nbt/client-sdk
```

```typescript
import { NBTClient } from '@nbt/client-sdk';

const client = new NBTClient({
  apiUrl: 'https://api.nbt.example.com',
  wsUrl: 'wss://ws.nbt.example.com/prod'
});

// Authenticate
const session = await client.auth.login(email, password);

// Join a game
await client.game.join('ABC123');

// Listen for events
client.on('game-started', (data) => {
  console.log('Game started!', data);
});
```

### React Hooks
```bash
npm install @nbt/react-hooks
```

```typescript
import { useGame, useAuth } from '@nbt/react-hooks';

function GameComponent() {
  const { user, login } = useAuth();
  const { game, joinGame, submitAnswer } = useGame();
  
  // Component logic
}
```

## Testing

### Postman Collection
Import the Postman collection from `/docs/api/postman/NBT-Backend.postman_collection.json`

### Sample Requests
See `/docs/api/examples/` for complete request/response examples for each endpoint.

## Support

For API support or questions:
- **Documentation**: https://docs.nbt.example.com
- **Support Email**: api-support@nbt.example.com
- **Discord**: https://discord.gg/nbt-dev