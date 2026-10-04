import { Game, Question } from '@nbt/types';

export function generateGameCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function sanitizeQuestionForClient(question: Question): Partial<Question> {
  // Remove correct answer and other sensitive data before sending to client
  const { correctAnswer, ...sanitized } = question;
  return sanitized;
}

export function calculateScore(
  isCorrect: boolean,
  timeToAnswer: number,
  questionTimeLimit: number,
  basePoints: number,
  difficulty: string
): number {
  if (!isCorrect) return 0;
  
  // Base score
  let score = basePoints;
  
  // Time bonus (faster answers get more points)
  const timeRatio = Math.max(0, (questionTimeLimit - timeToAnswer) / questionTimeLimit);
  const timeBonus = Math.floor(score * 0.5 * timeRatio); // Up to 50% bonus
  score += timeBonus;
  
  // Difficulty multiplier
  const difficultyMultipliers = {
    easy: 1.0,
    medium: 1.2,
    hard: 1.5,
  };
  
  const multiplier = difficultyMultipliers[difficulty as keyof typeof difficultyMultipliers] || 1.0;
  score = Math.floor(score * multiplier);
  
  return score;
}

export function isGameInProgress(game: Game): boolean {
  return game.state === 'active' || game.state === 'starting';
}

export function canJoinGame(game: Game, isLateJoin: boolean = false): boolean {
  if (game.state === 'finished' || game.state === 'cancelled') {
    return false;
  }
  
  if (isLateJoin && !game.settings.allowLateJoin) {
    return false;
  }
  
  const playerCount = game.participants.filter(p => p.role === 'player').length;
  return playerCount < game.settings.maxParticipants;
}

export function getGameProgress(game: Game): {
  currentQuestion: number;
  totalQuestions: number;
  percentComplete: number;
} {
  const current = Math.max(0, game.currentQuestionIndex + 1);
  const total = game.questions.length;
  
  return {
    currentQuestion: current,
    totalQuestions: total,
    percentComplete: total > 0 ? Math.floor((current / total) * 100) : 0,
  };
}

export function formatGameTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${remainingSeconds}s`;
}

export function generateLeaderboard(participants: any[]): any[] {
  return participants
    .filter(p => p.role === 'player')
    .sort((a, b) => {
      // Sort by score (descending), then by average response time (ascending)
      if (b.currentScore !== a.currentScore) {
        return b.currentScore - a.currentScore;
      }
      return a.stats.averageResponseTime - b.stats.averageResponseTime;
    })
    .map((participant, index) => ({
      ...participant,
      position: index + 1,
    }));
}