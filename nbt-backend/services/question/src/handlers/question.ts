import { APIGatewayProxyHandler } from 'aws-lambda';
import { Question, QuestionType, QuestionDifficulty } from '@nbt/types';
import { createQuestion, getQuestionsByCategory, getUserQuestions } from '../services/questionService';
import { formatApiResponse } from '../../auth/src/utils/response';
import { v4 as uuidv4 } from 'uuid';

interface CreateQuestionRequest {
  text: string;
  type: QuestionType;
  category: string;
  difficulty: QuestionDifficulty;
  points: number;
  timeLimit: number;
  options?: Array<{ text: string; isCorrect: boolean }>;
  correctAnswer: string | number;
  explanation?: string;
  tags: string[];
}

export const createHandler: APIGatewayProxyHandler = async (event) => {
  try {
    // Extract user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return formatApiResponse(401, { success: false, error: 'User not authenticated' });
    }

    const body: CreateQuestionRequest = JSON.parse(event.body || '{}');
    
    // Validation
    if (!body.text || body.text.trim().length < 10) {
      return formatApiResponse(400, { success: false, error: 'Question text must be at least 10 characters' });
    }

    if (!body.type || !['multiple-choice', 'true-false', 'open-ended', 'fill-blank'].includes(body.type)) {
      return formatApiResponse(400, { success: false, error: 'Invalid question type' });
    }

    if (!body.category || !body.difficulty) {
      return formatApiResponse(400, { success: false, error: 'Category and difficulty are required' });
    }

    // Validate multiple choice options
    if (body.type === 'multiple-choice') {
      if (!body.options || body.options.length < 2) {
        return formatApiResponse(400, { success: false, error: 'Multiple choice questions need at least 2 options' });
      }
      
      const correctOptions = body.options.filter(opt => opt.isCorrect);
      if (correctOptions.length !== 1) {
        return formatApiResponse(400, { success: false, error: 'Multiple choice questions must have exactly one correct answer' });
      }
    }

    const questionId = uuidv4();
    const now = Date.now();

    const newQuestion: Question = {
      id: questionId,
      text: body.text.trim(),
      type: body.type,
      category: body.category,
      difficulty: body.difficulty,
      points: body.points || 100,
      timeLimit: body.timeLimit || 30,
      options: body.options?.map((opt, index) => ({
        id: `${questionId}-option-${index}`,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
      correctAnswer: body.correctAnswer,
      explanation: body.explanation,
      tags: body.tags || [],
      source: {
        type: 'manual',
        createdBy: userId,
      },
      usage: {
        timesUsed: 0,
        averageCorrectRate: 0,
        averageResponseTime: 0,
        feedback: [],
      },
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const question = await createQuestion(newQuestion);

    return formatApiResponse(201, {
      success: true,
      data: question,
      message: 'Question created successfully',
    });

  } catch (error) {
    console.error('Create question error:', error);
    return formatApiResponse(500, { success: false, error: 'Internal server error' });
  }
};

export const listHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const category = queryParams.category;
    const difficulty = queryParams.difficulty;
    const userId = queryParams.userId;
    const limit = parseInt(queryParams.limit || '20');
    const offset = parseInt(queryParams.offset || '0');

    let questions: Question[] = [];

    if (userId) {
      // Get questions created by specific user
      questions = await getUserQuestions(userId, limit);
    } else if (category) {
      // Get questions by category (and optionally difficulty)
      questions = await getQuestionsByCategory(category, difficulty, limit);
    } else {
      // Default: get recent questions (would need implementation)
      questions = [];
    }

    // Remove sensitive data before sending to client
    const sanitizedQuestions = questions.map(q => ({
      ...q,
      correctAnswer: undefined, // Don't expose correct answers in list view
    }));

    return formatApiResponse(200, {
      success: true,
      data: sanitizedQuestions,
      message: `Found ${questions.length} questions`,
    });

  } catch (error) {
    console.error('List questions error:', error);
    return formatApiResponse(500, { success: false, error: 'Internal server error' });
  }
};