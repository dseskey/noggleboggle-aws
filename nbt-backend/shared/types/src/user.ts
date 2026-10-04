import { BaseEntity } from './common';

export interface User extends BaseEntity {
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  socialProviders?: SocialProvider[];
  preferences: UserPreferences;
  stats: UserStats;
  subscription?: UserSubscription;
}

export interface SocialProvider {
  provider: 'google' | 'apple' | 'amazon';
  providerId: string;
  email: string;
  connectedAt: number;
}

export interface UserPreferences {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  gameSettings: GameSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  gameInvites: boolean;
  tournamentUpdates: boolean;
  friendRequests: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showOnlineStatus: boolean;
  showGameHistory: boolean;
  allowFriendRequests: boolean;
}

export interface GameSettings {
  defaultDifficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  preferredCategories: string[];
  autoJoinSpectator: boolean;
  soundEnabled: boolean;
}

export interface UserStats {
  totalGamesPlayed: number;
  totalGamesWon: number;
  totalPoints: number;
  averageScore: number;
  currentStreak: number;
  longestStreak: number;
  favoriteCategory?: string;
  rank?: number;
  achievements: string[];
}

export interface UserSubscription {
  type: 'premium' | 'pro';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate: number;
  endDate: number;
  autoRenew: boolean;
  paymentMethod?: string;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  avatar?: string;
  stats: Partial<UserStats>;
  isOnline: boolean;
  lastSeen?: number;
}