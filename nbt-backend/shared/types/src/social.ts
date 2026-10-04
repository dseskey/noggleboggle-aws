import { BaseEntity } from './common';

export interface Friendship extends BaseEntity {
  userId1: string;
  userId2: string;
  status: FriendshipStatus;
  requestedBy: string;
  requestedAt: number;
  acceptedAt?: number;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked' | 'declined';

export interface ChatMessage extends BaseEntity {
  gameId?: string;
  channelId?: string;
  senderId: string;
  senderName: string;
  content: string;
  type: MessageType;
  replyTo?: string;
  reactions: MessageReaction[];
  isEdited: boolean;
  editedAt?: number;
}

export type MessageType = 'text' | 'system' | 'emoji' | 'sticker' | 'game-event';

export interface MessageReaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface ChatChannel extends BaseEntity {
  name: string;
  type: ChannelType;
  gameId?: string;
  tournamentId?: string;
  participants: ChannelParticipant[];
  lastMessage?: ChatMessage;
  messageCount: number;
  settings: ChannelSettings;
}

export type ChannelType = 'game' | 'tournament' | 'private' | 'public' | 'system';

export interface ChannelParticipant {
  userId: string;
  role: 'owner' | 'moderator' | 'member';
  joinedAt: number;
  lastRead?: number;
  isMuted: boolean;
}

export interface ChannelSettings {
  allowReactions: boolean;
  slowMode: number; // seconds between messages
  maxMessageLength: number;
  allowFiles: boolean;
  moderationLevel: 'none' | 'basic' | 'strict';
}

export interface SpectatorSession {
  userId: string;
  gameId: string;
  joinedAt: number;
  preferences: SpectatorPreferences;
}

export interface SpectatorPreferences {
  showLeaderboard: boolean;
  showQuestions: boolean;
  showAnswers: boolean;
  autoFollowPlayer?: string;
  soundEnabled: boolean;
}

export interface SocialActivity {
  id: string;
  userId: string;
  type: ActivityType;
  data: ActivityData;
  timestamp: number;
  visibility: ActivityVisibility;
}

export type ActivityType = 
  | 'game-won' 
  | 'achievement-unlocked' 
  | 'high-score' 
  | 'tournament-joined' 
  | 'tournament-won' 
  | 'friend-joined' 
  | 'streak-milestone';

export interface ActivityData {
  gameId?: string;
  tournamentId?: string;
  achievementId?: string;
  score?: number;
  streak?: number;
  friendId?: string;
  metadata?: { [key: string]: unknown };
}

export type ActivityVisibility = 'public' | 'friends' | 'private';

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  gameId?: string;
  lastSeen: number;
  platform: 'web' | 'ios' | 'android';
}

export type PresenceStatus = 'online' | 'away' | 'in-game' | 'offline';

export interface ShareableContent {
  type: ShareType;
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
  metadata: ShareMetadata;
}

export type ShareType = 'game-result' | 'achievement' | 'high-score' | 'tournament-win' | 'invitation';

export interface ShareMetadata {
  gameId?: string;
  tournamentId?: string;
  achievementId?: string;
  score?: number;
  userId: string;
  timestamp: number;
}