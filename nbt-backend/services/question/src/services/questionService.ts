import { getDynamoClient, TABLE_NAME, KeyPatterns } from '@nbt/database';
import { Question, DynamoDBKeys } from '@nbt/types';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = getDynamoClient();

export async function createQuestion(questionData: Question): Promise<Question> {
  const questionKeys = KeyPatterns.question(questionData.id);
  const categoryKeys = KeyPatterns.questionByCategory(
    questionData.category,
    questionData.difficulty,
    questionData.createdAt
  );
  
  // If question has an owner, add owner keys
  let ownerKeys = {};
  if (questionData.source.createdBy) {
    ownerKeys = KeyPatterns.questionByOwner(questionData.source.createdBy, questionData.createdAt);
  }

  const questionItem: Question & DynamoDBKeys = {
    ...questionData,
    ...questionKeys,
    ...categoryKeys,
    ...ownerKeys,
  };

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: questionItem,
    ConditionExpression: 'attribute_not_exists(PK)',
  }));

  return questionData;
}

export async function getQuestionById(questionId: string): Promise<Question | null> {
  const keys = KeyPatterns.question(questionId);
  
  const result = await dynamoClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: keys,
  }));

  return result.Item as Question || null;
}

export async function updateQuestion(questionId: string, updates: Partial<Question>): Promise<Question> {
  const keys = KeyPatterns.question(questionId);
  
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id' && value !== undefined) {
      const attrName = `#${key}`;
      const attrValue = `:${key}`;
      
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
    }
  });

  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = Date.now();

  const result = await dynamoClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: keys,
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  }));

  return result.Attributes as Question;
}

export async function getQuestionsByCategory(
  category: string,
  difficulty?: string,
  limit: number = 20
): Promise<Question[]> {
  const gsi1PK = `QUESTION#${category}`;
  
  let keyConditionExpression = 'GSI1PK = :category';
  const expressionAttributeValues: Record<string, unknown> = {
    ':category': gsi1PK,
  };

  // If difficulty is specified, add it to the query
  if (difficulty) {
    keyConditionExpression += ' AND begins_with(GSI1SK, :difficultyPrefix)';
    expressionAttributeValues[':difficultyPrefix'] = `QUESTION#${difficulty}`;
  }

  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ScanIndexForward: false, // Most recent first
    Limit: limit,
  }));

  return result.Items as Question[] || [];
}

export async function getUserQuestions(userId: string, limit: number = 20): Promise<Question[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :userId',
    ExpressionAttributeValues: {
      ':userId': `QUESTION#${userId}`,
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit,
  }));

  return result.Items as Question[] || [];
}

export async function searchQuestions(searchParams: {
  category?: string;
  difficulty?: string;
  type?: string;
  tags?: string[];
  limit?: number;
}): Promise<Question[]> {
  const { category, difficulty, type, tags, limit = 20 } = searchParams;

  // Start with category search if provided
  if (category) {
    return await getQuestionsByCategory(category, difficulty, limit);
  }

  // For more complex searches, we'd need to implement a scan with filters
  // or use OpenSearch for better search capabilities
  // For now, return empty array for unsupported searches
  return [];
}

export async function updateQuestionUsage(
  questionId: string,
  usageUpdate: {
    timesUsed?: number;
    averageCorrectRate?: number;
    averageResponseTime?: number;
    lastUsed?: number;
  }
): Promise<void> {
  const keys = KeyPatterns.question(questionId);
  
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(usageUpdate).forEach(([key, value]) => {
    if (value !== undefined) {
      const attrName = `#usage_${key}`;
      const attrValue = `:usage_${key}`;
      
      updateExpressions.push(`usage.${key} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
    }
  });

  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = Date.now();

  await dynamoClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: keys,
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  }));
}

export async function incrementQuestionUsage(questionId: string): Promise<void> {
  const keys = KeyPatterns.question(questionId);
  
  await dynamoClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: keys,
    UpdateExpression: 'ADD usage.timesUsed :one SET usage.lastUsed = :timestamp, updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':one': 1,
      ':timestamp': Date.now(),
    },
  }));
}

export async function deleteQuestion(questionId: string): Promise<void> {
  // Mark as deleted instead of actually deleting
  await updateQuestion(questionId, { status: 'deleted' });
}

export async function getRandomQuestions(
  category?: string,
  difficulty?: string,
  count: number = 10
): Promise<Question[]> {
  // This is a simplified implementation
  // In production, you'd want a more sophisticated random selection
  const questions = category 
    ? await getQuestionsByCategory(category, difficulty, count * 2)
    : [];

  // Shuffle and return requested count
  const shuffled = questions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}