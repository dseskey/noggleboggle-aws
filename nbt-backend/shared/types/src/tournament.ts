import { BaseEntity } from './common';

export interface Tournament extends BaseEntity {
  name: string;
  description?: string;
  format: TournamentFormat;
  state: TournamentState;
  settings: TournamentSettings;
  ownerId: string;
  participants: TournamentParticipant[];
  rounds: TournamentRound[];
  prizes: TournamentPrize[];
  schedule: TournamentSchedule;
  results?: TournamentResults;
}

export type TournamentFormat = 'single-elimination' | 'double-elimination' | 'round-robin' | 'swiss' | 'ladder';

export type TournamentState = 'draft' | 'open' | 'closed' | 'started' | 'active' | 'finished' | 'cancelled';

export interface TournamentSettings {
  maxParticipants: number;
  minParticipants: number;
  entryFee?: number;
  isPrivate: boolean;
  requireApproval: boolean;
  gameSettings: {
    questionsPerRound: number;
    timePerQuestion: number;
    categories: string[];
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  };
  advancement: {
    playersPerRound: number;
    tiebreaker: 'time' | 'sudden-death' | 'score';
  };
}

export interface TournamentParticipant {
  userId: string;
  displayName: string;
  avatar?: string;
  registeredAt: number;
  status: 'registered' | 'confirmed' | 'active' | 'eliminated' | 'withdrawn';
  currentRound?: number;
  totalScore: number;
  rankings: TournamentRanking[];
  seed?: number;
}

export interface TournamentRound {
  roundNumber: number;
  name: string;
  state: 'pending' | 'active' | 'completed';
  matches: TournamentMatch[];
  startTime?: number;
  endTime?: number;
}

export interface TournamentMatch {
  matchId: string;
  participants: string[];
  gameId?: string;
  state: 'pending' | 'active' | 'completed' | 'cancelled';
  winner?: string;
  scores: { [userId: string]: number };
  startTime?: number;
  endTime?: number;
}

export interface TournamentRanking {
  roundNumber: number;
  position: number;
  score: number;
  opponent?: string;
  result: 'win' | 'loss' | 'draw';
}

export interface TournamentPrize {
  position: number;
  type: 'cash' | 'points' | 'badge' | 'title' | 'item';
  value: string | number;
  description: string;
}

export interface TournamentSchedule {
  registrationStart: number;
  registrationEnd: number;
  tournamentStart: number;
  tournamentEnd?: number;
  timezone: string;
  rounds: {
    roundNumber: number;
    startTime: number;
    estimatedDuration: number;
  }[];
}

export interface TournamentResults {
  winner: string;
  finalRankings: TournamentFinalRanking[];
  statistics: TournamentStatistics;
  completedAt: number;
}

export interface TournamentFinalRanking {
  userId: string;
  displayName: string;
  finalPosition: number;
  totalScore: number;
  roundsWon: number;
  roundsLost: number;
  averageScore: number;
  prize?: TournamentPrize;
}

export interface TournamentStatistics {
  totalParticipants: number;
  completionRate: number;
  averageScore: number;
  totalRounds: number;
  tournamentDuration: number;
  mostActivePlayers: string[];
  popularCategories: string[];
}