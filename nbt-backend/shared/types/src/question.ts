import { BaseEntity } from './common';

export interface Question extends BaseEntity {
  text: string;
  type: QuestionType;
  category: string;
  difficulty: QuestionDifficulty;
  points: number;
  timeLimit: number;
  options?: QuestionOption[];
  correctAnswer: string | number;
  explanation?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  tags: string[];
  source: QuestionSource;
  usage: QuestionUsage;
}

export type QuestionType = 'multiple-choice' | 'true-false' | 'open-ended' | 'fill-blank';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionSource {
  type: 'manual' | 'ai-generated' | 'external-api' | 'imported';
  createdBy?: string;
  aiModel?: string;
  externalSource?: string;
  prompt?: string;
}

export interface QuestionUsage {
  timesUsed: number;
  averageCorrectRate: number;
  averageResponseTime: number;
  lastUsed?: number;
  feedback: QuestionFeedback[];
}

export interface QuestionFeedback {
  userId: string;
  rating: number;
  comment?: string;
  reportReason?: 'incorrect' | 'inappropriate' | 'unclear' | 'duplicate';
  timestamp: number;
}

export interface QuestionBank {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  isPublic: boolean;
  categories: string[];
  questionCount: number;
  averageDifficulty: number;
  createdAt: number;
  updatedAt: number;
}

export interface AIQuestionRequest {
  topic: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  count: number;
  categories?: string[];
  customPrompt?: string;
  avoidDuplicates?: boolean;
}

export interface AIQuestionResponse {
  questions: Question[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  generatedAt: number;
}