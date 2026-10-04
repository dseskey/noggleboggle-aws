import { BaseEntity } from './common';

export interface Score extends BaseEntity {
  userId: string;
  gameId: string;
  questionId: string;
  points: number;
  maxPoints: number;
  timeToAnswer: number;
  isCorrect: boolean;
  bonusPoints?: number;
  multiplier?: number;
  streakBonus?: number;
}

export interface Leaderboard {
  id: string;
  type: LeaderboardType;
  scope: LeaderboardScope;
  timeframe: LeaderboardTimeframe;
  entries: LeaderboardEntry[];
  updatedAt: number;
  metadata?: {
    gameId?: string;
    tournamentId?: string;
    category?: string;
  };
}

export type LeaderboardType = 'game' | 'global' | 'category' | 'tournament' | 'weekly' | 'monthly';

export type LeaderboardScope = 'global' | 'friends' | 'local' | 'category';

export type LeaderboardTimeframe = 'all-time' | 'yearly' | 'monthly' | 'weekly' | 'daily' | 'game';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatar?: string;
  score: number;
  rank: number;
  gamesPlayed: number;
  winRate: number;
  averageScore: number;
  streak: number;
  badge?: string;
  change?: number; // Position change from previous period
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  requirements: AchievementRequirement[];
  rewards: AchievementReward[];
  isHidden: boolean;
  createdAt: number;
}

export type AchievementCategory = 'scoring' | 'streak' | 'games' | 'social' | 'special' | 'tournament';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface AchievementRequirement {
  type: 'score' | 'games_won' | 'streak' | 'category_mastery' | 'tournament_win';
  value: number;
  category?: string;
}

export interface AchievementReward {
  type: 'badge' | 'title' | 'avatar' | 'points';
  value: string | number;
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: number;
  progress?: number;
  isNew: boolean;
}

export interface ScoreCalculation {
  basePoints: number;
  timeBonus: number;
  streakBonus: number;
  difficultyMultiplier: number;
  categoryBonus: number;
  finalScore: number;
  breakdown: {
    [key: string]: number;
  };
}