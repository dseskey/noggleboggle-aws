import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AIQuestionRequest, AIQuestionResponse, Question, QuestionOption } from '@nbt/types';
import { v4 as uuidv4 } from 'uuid';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Model configurations
const MODELS = {
  'claude-3-sonnet': 'anthropic.claude-3-sonnet-20240229-v1:0',
  'claude-3-haiku': 'anthropic.claude-3-haiku-20240307-v1:0',
} as const;

const DEFAULT_MODEL = MODELS['claude-3-haiku']; // Faster and cheaper for question generation

interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export async function generateQuestionsWithAI(request: AIQuestionRequest): Promise<AIQuestionResponse> {
  const prompt = buildPrompt(request);
  
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4000,
    temperature: 0.7,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };

  try {
    const command = new InvokeModelCommand({
      modelId: DEFAULT_MODEL,
      body: JSON.stringify(payload),
      contentType: 'application/json',
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const claudeResponse: ClaudeResponse = responseBody;

    if (!claudeResponse.content || claudeResponse.content.length === 0) {
      throw new Error('Empty response from AI model');
    }

    const generatedText = claudeResponse.content[0].text;
    const questions = parseAIResponse(generatedText, request);

    return {
      questions,
      usage: {
        promptTokens: claudeResponse.usage.input_tokens,
        completionTokens: claudeResponse.usage.output_tokens,
        totalTokens: claudeResponse.usage.input_tokens + claudeResponse.usage.output_tokens,
      },
      model: DEFAULT_MODEL,
      generatedAt: Date.now(),
    };

  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error(`Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function buildPrompt(request: AIQuestionRequest): string {
  const { topic, difficulty, type, count, categories, customPrompt } = request;

  if (customPrompt) {
    return customPrompt;
  }

  let prompt = `Generate ${count} ${difficulty} difficulty ${type} trivia questions about ${topic}.`;

  if (categories && categories.length > 0) {
    prompt += ` Focus on the following categories: ${categories.join(', ')}.`;
  }

  prompt += `

Requirements:
- Each question should be clear, unambiguous, and interesting
- Questions should be appropriate for the ${difficulty} difficulty level
- Avoid overly obscure facts or trick questions
- Ensure questions are factually accurate`;

  if (type === 'multiple-choice') {
    prompt += `
- Each question should have exactly 4 answer options (A, B, C, D)
- Only one option should be correct
- Incorrect options should be plausible but clearly wrong
- Avoid "All of the above" or "None of the above" options`;
  } else if (type === 'true-false') {
    prompt += `
- Questions should have a clear true or false answer
- Avoid ambiguous statements`;
  } else if (type === 'open-ended') {
    prompt += `
- Questions should have short, specific answers (1-3 words)
- Answers should not be subjective or opinion-based`;
  }

  prompt += `

Format your response as a JSON array with the following structure:
[
  {
    "text": "Question text here",
    "type": "${type}",
    "difficulty": "${difficulty}",
    "category": "Category name",
    "points": ${getDefaultPoints(difficulty)},
    "timeLimit": ${getDefaultTimeLimit(difficulty)},`;

  if (type === 'multiple-choice') {
    prompt += `
    "options": [
      {"text": "Option A", "isCorrect": false},
      {"text": "Option B", "isCorrect": true},
      {"text": "Option C", "isCorrect": false},
      {"text": "Option D", "isCorrect": false}
    ],
    "correctAnswer": "Option B",`;
  } else {
    prompt += `
    "correctAnswer": "Correct answer here",`;
  }

  prompt += `
    "explanation": "Brief explanation of the answer",
    "tags": ["tag1", "tag2"]
  }
]

Respond only with valid JSON, no additional text or formatting.`;

  return prompt;
}

function parseAIResponse(responseText: string, request: AIQuestionRequest): Question[] {
  try {
    // Clean up the response text
    let jsonText = responseText.trim();
    
    // Remove any markdown code blocks
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Try to find JSON array in the response
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsedQuestions = JSON.parse(jsonText);
    
    if (!Array.isArray(parsedQuestions)) {
      throw new Error('Response is not an array');
    }

    const questions: Question[] = parsedQuestions.map((q, index) => {
      const questionId = uuidv4();
      const now = Date.now();

      // Process options for multiple choice
      let options: QuestionOption[] | undefined;
      if (q.type === 'multiple-choice' && q.options) {
        options = q.options.map((opt: any, optIndex: number) => ({
          id: `${questionId}-option-${optIndex}`,
          text: opt.text,
          isCorrect: opt.isCorrect,
        }));
      }

      return {
        id: questionId,
        text: q.text,
        type: q.type || request.type,
        category: q.category || request.categories?.[0] || 'General',
        difficulty: q.difficulty || request.difficulty,
        points: q.points || getDefaultPoints(request.difficulty),
        timeLimit: q.timeLimit || getDefaultTimeLimit(request.difficulty),
        options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        tags: Array.isArray(q.tags) ? q.tags : [],
        source: {
          type: 'ai-generated',
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
    });

    return questions;

  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Response text:', responseText);
    throw new Error('Failed to parse AI-generated questions');
  }
}

function getDefaultPoints(difficulty: string): number {
  switch (difficulty) {
    case 'easy': return 100;
    case 'medium': return 150;
    case 'hard': return 200;
    default: return 100;
  }
}

function getDefaultTimeLimit(difficulty: string): number {
  switch (difficulty) {
    case 'easy': return 20;
    case 'medium': return 30;
    case 'hard': return 45;
    default: return 30;
  }
}