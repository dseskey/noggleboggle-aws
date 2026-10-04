import { BaseEntity } from './common';
import { Question } from './question';

export interface Game extends BaseEntity {
  gameCode: string;
  title: string;
  description?: string;
  gameMode: GameMode;
  state: GameState;
  settings: GameSettings;
  ownerId: string;
  participants: GameParticipant[];
  questions: Question[];
  currentQuestionIndex: number;
  startedAt?: number;
  endedAt?: number;
  results?: GameResults;
}

export type GameMode = 'classic' | 'speed' | 'team' | 'elimination' | 'tournament';

export type GameState = 'created' | 'waiting' | 'starting' | 'active' | 'paused' | 'finished' | 'cancelled';

export interface GameSettings {
  maxParticipants: number;
  questionTimeLimit: number;
  betweenQuestionDelay: number;
  allowLateJoin: boolean;
  showLeaderboardDuringGame: boolean;
  randomizeQuestions: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  categories: string[];
  isPrivate: boolean;
  requirePassword?: boolean;
  password?: string;
}

export interface GameParticipant {
  userId: string;
  displayName: string;
  avatar?: string;
  role: 'player' | 'spectator';
  joinedAt: number;
  isReady: boolean;
  isConnected: boolean;
  answers: GameAnswer[];
  currentScore: number;
  position?: number;
  stats: ParticipantStats;
}

export interface GameAnswer {
  questionId: string;
  answer: string | number;
  submittedAt: number;
  timeToAnswer: number;
  isCorrect: boolean;
  pointsAwarded: number;
}

export interface ParticipantStats {
  correctAnswers: number;
  totalAnswers: number;
  averageResponseTime: number;
  currentStreak: number;
  longestStreak: number;
}

export interface GameResults {
  winners: string[];
  finalRankings: RankingEntry[];
  gameStats: GameStatistics;
}

export interface RankingEntry {
  userId: string;
  displayName: string;
  finalScore: number;
  position: number;
  correctAnswers: number;
  averageResponseTime: number;
}

export interface GameStatistics {
  totalQuestions: number;
  averageScore: number;
  fastestAnswer: number;
  slowestAnswer: number;
  mostMissedQuestion?: string;
  participantCount: number;
  completionRate: number;
}

export interface GameSession {
  gameId: string;
  connectionId: string;
  userId: string;
  role: 'owner' | 'player' | 'spectator';
  joinedAt: number;
  lastActivity: number;
}