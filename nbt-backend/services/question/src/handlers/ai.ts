import { APIGatewayProxyHandler } from 'aws-lambda';
import { AIQuestionRequest, AIQuestionResponse, Question } from '@nbt/types';
import { generateQuestionsWithAI } from '../services/aiService';
import { createQuestion } from '../services/questionService';
import { formatApiResponse } from '../../auth/src/utils/response';

export const generateHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return formatApiResponse(401, { success: false, error: 'User not authenticated' });
    }

    const body: AIQuestionRequest = JSON.parse(event.body || '{}');
    
    // Validation
    if (!body.topic || body.topic.trim().length < 3) {
      return formatApiResponse(400, { success: false, error: 'Topic must be at least 3 characters' });
    }

    if (!body.difficulty || !['easy', 'medium', 'hard'].includes(body.difficulty)) {
      return formatApiResponse(400, { success: false, error: 'Invalid difficulty level' });
    }

    if (!body.type || !['multiple-choice', 'true-false', 'open-ended', 'fill-blank'].includes(body.type)) {
      return formatApiResponse(400, { success: false, error: 'Invalid question type' });
    }

    if (!body.count || body.count < 1 || body.count > 10) {
      return formatApiResponse(400, { success: false, error: 'Question count must be between 1 and 10' });
    }

    // Generate questions using AI
    const aiResponse = await generateQuestionsWithAI(body);
    
    if (!aiResponse.questions || aiResponse.questions.length === 0) {
      return formatApiResponse(500, { success: false, error: 'Failed to generate questions' });
    }

    // Save generated questions to database
    const savedQuestions: Question[] = [];
    for (const question of aiResponse.questions) {
      try {
        const savedQuestion = await createQuestion({
          ...question,
          source: {
            type: 'ai-generated',
            createdBy: userId,
            aiModel: aiResponse.model,
            prompt: body.customPrompt || `Generate ${body.count} ${body.difficulty} ${body.type} questions about ${body.topic}`,
          },
        });
        savedQuestions.push(savedQuestion);
      } catch (error) {
        console.error('Error saving generated question:', error);
        // Continue with other questions
      }
    }

    const response: AIQuestionResponse = {
      questions: savedQuestions,
      usage: aiResponse.usage,
      model: aiResponse.model,
      generatedAt: aiResponse.generatedAt,
    };

    return formatApiResponse(200, {
      success: true,
      data: response,
      message: `Generated ${savedQuestions.length} questions successfully`,
    });

  } catch (error) {
    console.error('AI question generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return formatApiResponse(429, { success: false, error: 'Rate limit exceeded. Please try again later.' });
      }
      if (error.message.includes('quota')) {
        return formatApiResponse(402, { success: false, error: 'AI service quota exceeded' });
      }
    }

    return formatApiResponse(500, { success: false, error: 'Failed to generate questions' });
  }
};