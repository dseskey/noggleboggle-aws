/**
 * NBT DynamoDB Single Table Design
 * 
 * Main Table Structure:
 * - PK (Partition Key): Entity type + ID
 * - SK (Sort Key): Entity type + ID or relationship
 * - GSI1PK/GSI1SK: Secondary access patterns
 * - GSI2PK/GSI2SK: Additional access patterns
 */

export const ENTITY_TYPES = {
  USER: 'USER',
  GAME: 'GAME',
  QUESTION: 'QUESTION',
  SCORE: 'SCORE',
  TOURNAMENT: 'TOURNAMENT',
  FRIENDSHIP: 'FRIENDSHIP',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  CHAT_CHANNEL: 'CHAT_CHANNEL',
  ACHIEVEMENT: 'ACHIEVEMENT',
  USER_ACHIEVEMENT: 'USER_ACHIEVEMENT',
  LEADERBOARD: 'LEADERBOARD',
  GAME_SESSION: 'GAME_SESSION',
  PRESENCE: 'PRESENCE',
} as const;

export const SEPARATORS = {
  ENTITY: '#',
  ATTRIBUTE: '|',
} as const;

/**
 * Key Patterns:
 * 
 * Users:
 * - PK: USER#userId, SK: USER#userId
 * - GSI1PK: USER#email, GSI1SK: USER#userId (for email lookup)
 * - GSI2PK: USER#username, GSI2SK: USER#userId (for username lookup)
 * 
 * Games:
 * - PK: GAME#gameId, SK: GAME#gameId
 * - GSI1PK: GAME#ownerId, GSI1SK: GAME#createdAt (owner's games)
 * - GSI2PK: GAME#gameCode, GSI2SK: GAME#gameId (game code lookup)
 * 
 * Game Participants:
 * - PK: GAME#gameId, SK: PARTICIPANT#userId
 * - GSI1PK: USER#userId, GSI1SK: PARTICIPANT#gameId (user's games)
 * 
 * Questions:
 * - PK: QUESTION#questionId, SK: QUESTION#questionId
 * - GSI1PK: QUESTION#category, GSI1SK: QUESTION#difficulty|createdAt
 * - GSI2PK: QUESTION#ownerId, GSI2SK: QUESTION#createdAt (user's questions)
 * 
 * Scores:
 * - PK: SCORE#gameId, SK: SCORE#userId|questionId
 * - GSI1PK: USER#userId, GSI1SK: SCORE#gameId|timestamp
 * 
 * Leaderboards:
 * - PK: LEADERBOARD#type, SK: LEADERBOARD#scope|timeframe
 * - GSI1PK: LEADERBOARD#type|scope, GSI1SK: LEADERBOARD#updatedAt
 * 
 * Friendships:
 * - PK: FRIENDSHIP#userId1, SK: FRIENDSHIP#userId2
 * - GSI1PK: FRIENDSHIP#userId2, GSI1SK: FRIENDSHIP#userId1 (reverse lookup)
 * 
 * Chat Messages:
 * - PK: CHAT#channelId, SK: MESSAGE#timestamp|messageId
 * - GSI1PK: CHAT#senderId, GSI1SK: MESSAGE#timestamp (user's messages)
 * 
 * Game Sessions (WebSocket connections):
 * - PK: SESSION#gameId, SK: SESSION#connectionId
 * - GSI1PK: SESSION#userId, GSI1SK: SESSION#gameId (user's sessions)
 * 
 * Presence:
 * - PK: PRESENCE#userId, SK: PRESENCE#userId
 * - GSI1PK: PRESENCE#status, GSI1SK: PRESENCE#lastSeen (online users)
 */

export const KeyPatterns = {
  // Users
  user: (userId: string) => ({
    PK: `${ENTITY_TYPES.USER}${SEPARATORS.ENTITY}${userId}`,
    SK: `${ENTITY_TYPES.USER}${SEPARATORS.ENTITY}${userId}`,
  }),

  userByEmail: (email: string, userId: string) => ({
    GSI1PK: `${ENTITY_TYPES.USER}${SEPARATORS.ENTITY}${email}`,
    GSI1SK: `${ENTITY_TYPES.USER}${SEPARATORS.ENTITY}${userId}`,
  }),

  userByUsername: (username: string, userId: string) => ({
    GSI2PK: `${ENTITY_TYPES.USER}${SEPARATORS.ENTITY}${username}`,
    GSI2SK: `${ENTITY_TYPES.USER}${SEPARATORS.ENTITY}${userId}`,
  }),

  // Games
  game: (gameId: string) => ({
    PK: `${ENTITY_TYPES.GAME}${SEPARATORS.ENTITY}${gameId}`,
    SK: `${ENTITY_TYPES.GAME}${SEPARATORS.ENTITY}${gameId}`,
  }),

  gameByOwner: (ownerId: string, createdAt: number) => ({
    GSI1PK: `${ENTITY_TYPES.GAME}${SEPARATORS.ENTITY}${ownerId}`,
    GSI1SK: `${ENTITY_TYPES.GAME}${SEPARATORS.ENTITY}${createdAt}`,
  }),

  gameByCode: (gameCode: string, gameId: string) => ({
    GSI2PK: `${ENTITY_TYPES.GAME}${SEPARATORS.ENTITY}${gameCode}`,
    GSI2SK: `${ENTITY_TYPES.GAME}${SEPARATORS.ENTITY}${gameId}`,
  }),

  // Game Participants
  gameParticipant: (gameId: string, userId: string) => ({
    PK: `${ENTITY_TYPES.GAME}${SEPARATORS.ENTITY}${gameId}`,
    SK: `PARTICIPANT${SEPARATORS.ENTITY}${userId}`,
  }),

  userGame: (userId: string, gameId: string) => ({
    GSI1PK: `${ENTITY_TYPES.USER}${SEPARATORS.ENTITY}${userId}`,
    GSI1SK: `PARTICIPANT${SEPARATORS.ENTITY}${gameId}`,
  }),

  // Questions
  question: (questionId: string) => ({
    PK: `${ENTITY_TYPES.QUESTION}${SEPARATORS.ENTITY}${questionId}`,
    SK: `${ENTITY_TYPES.QUESTION}${SEPARATORS.ENTITY}${questionId}`,
  }),

  questionByCategory: (category: string, difficulty: string, createdAt: number) => ({
    GSI1PK: `${ENTITY_TYPES.QUESTION}${SEPARATORS.ENTITY}${category}`,
    GSI1SK: `${ENTITY_TYPES.QUESTION}${SEPARATORS.ENTITY}${difficulty}${SEPARATORS.ATTRIBUTE}${createdAt}`,
  }),

  questionByOwner: (ownerId: string, createdAt: number) => ({
    GSI2PK: `${ENTITY_TYPES.QUESTION}${SEPARATORS.ENTITY}${ownerId}`,
    GSI2SK: `${ENTITY_TYPES.QUESTION}${SEPARATORS.ENTITY}${createdAt}`,
  }),

  // Scores
  score: (gameId: string, userId: string, questionId: string) => ({
    PK: `${ENTITY_TYPES.SCORE}${SEPARATORS.ENTITY}${gameId}`,
    SK: `${ENTITY_TYPES.SCORE}${SEPARATORS.ENTITY}${userId}${SEPARATORS.ATTRIBUTE}${questionId}`,
  }),

  userScore: (userId: string, gameId: string, timestamp: number) => ({
    GSI1PK: `${ENTITY_TYPES.USER}${SEPARATORS.ENTITY}${userId}`,
    GSI1SK: `${ENTITY_TYPES.SCORE}${SEPARATORS.ENTITY}${gameId}${SEPARATORS.ATTRIBUTE}${timestamp}`,
  }),

  // Leaderboards
  leaderboard: (type: string, scope: string, timeframe: string) => ({
    PK: `${ENTITY_TYPES.LEADERBOARD}${SEPARATORS.ENTITY}${type}`,
    SK: `${ENTITY_TYPES.LEADERBOARD}${SEPARATORS.ENTITY}${scope}${SEPARATORS.ATTRIBUTE}${timeframe}`,
  }),

  // Friendships
  friendship: (userId1: string, userId2: string) => ({
    PK: `${ENTITY_TYPES.FRIENDSHIP}${SEPARATORS.ENTITY}${userId1}`,
    SK: `${ENTITY_TYPES.FRIENDSHIP}${SEPARATORS.ENTITY}${userId2}`,
  }),

  friendshipReverse: (userId2: string, userId1: string) => ({
    GSI1PK: `${ENTITY_TYPES.FRIENDSHIP}${SEPARATORS.ENTITY}${userId2}`,
    GSI1SK: `${ENTITY_TYPES.FRIENDSHIP}${SEPARATORS.ENTITY}${userId1}`,
  }),

  // Chat Messages
  chatMessage: (channelId: string, timestamp: number, messageId: string) => ({
    PK: `CHAT${SEPARATORS.ENTITY}${channelId}`,
    SK: `MESSAGE${SEPARATORS.ENTITY}${timestamp}${SEPARATORS.ATTRIBUTE}${messageId}`,
  }),

  userMessage: (senderId: string, timestamp: number) => ({
    GSI1PK: `CHAT${SEPARATORS.ENTITY}${senderId}`,
    GSI1SK: `MESSAGE${SEPARATORS.ENTITY}${timestamp}`,
  }),

  // Game Sessions
  gameSession: (gameId: string, connectionId: string) => ({
    PK: `SESSION${SEPARATORS.ENTITY}${gameId}`,
    SK: `SESSION${SEPARATORS.ENTITY}${connectionId}`,
  }),

  userSession: (userId: string, gameId: string) => ({
    GSI1PK: `SESSION${SEPARATORS.ENTITY}${userId}`,
    GSI1SK: `SESSION${SEPARATORS.ENTITY}${gameId}`,
  }),

  // Presence
  presence: (userId: string) => ({
    PK: `${ENTITY_TYPES.PRESENCE}${SEPARATORS.ENTITY}${userId}`,
    SK: `${ENTITY_TYPES.PRESENCE}${SEPARATORS.ENTITY}${userId}`,
  }),

  presenceByStatus: (status: string, lastSeen: number) => ({
    GSI1PK: `${ENTITY_TYPES.PRESENCE}${SEPARATORS.ENTITY}${status}`,
    GSI1SK: `${ENTITY_TYPES.PRESENCE}${SEPARATORS.ENTITY}${lastSeen}`,
  }),
};