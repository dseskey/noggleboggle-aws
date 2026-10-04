# Development Workflow Documentation

## Overview

This document outlines the development workflow, coding standards, and best practices for the NBT Backend project. It covers everything from setting up your development environment to deploying code to production.

## Development Environment Setup

### Prerequisites

Before contributing to the project, ensure you have:

- **Node.js 20.x** (use nvm for version management)
- **npm 10.x** or higher
- **Git** with SSH keys configured
- **AWS CLI** configured (for deployment)
- **Docker** (for local DynamoDB)
- **VS Code** (recommended IDE)

### Initial Setup

```bash
# Clone the repository
git clone git@github.com:your-org/nbt-backend.git
cd nbt-backend

# Use correct Node.js version
nvm use

# Install dependencies
npm install

# Install global tools
npm install -g serverless@4 dynamodb-local

# Set up pre-commit hooks
npm run setup:hooks

# Create local environment file
cp .env.example .env.local
```

### IDE Configuration

#### VS Code Extensions (Recommended)
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-jest",
    "amazonwebservices.aws-toolkit-vscode",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-python.python",
    "ms-vscode.vscode-docker"
  ]
}
```

#### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "eslint.workingDirectories": ["./"],
  "jest.autoRun": "watch"
}
```

## Git Workflow

### Branch Strategy

We follow **GitFlow** with some modifications:

```
main          ← Production releases
├── develop   ← Development integration
    ├── feature/NBT-123-user-auth
    ├── feature/NBT-124-websocket-fix
    ├── hotfix/NBT-125-critical-bug
    └── release/v1.2.0
```

#### Branch Types

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/**: New features or improvements
- **hotfix/**: Critical production fixes
- **release/**: Release preparation
- **bugfix/**: Non-critical bug fixes

### Branch Naming Convention

```bash
# Feature branches
feature/NBT-123-short-description
feature/NBT-124-add-user-authentication

# Bug fixes
bugfix/NBT-125-fix-websocket-connection
hotfix/NBT-126-critical-security-patch

# Release branches
release/v1.2.0
release/v1.2.1-hotfix
```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Commit Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or modifying tests
- **chore**: Maintenance tasks

#### Examples
```bash
feat(auth): add social login support

- Integrate Google OAuth 2.0
- Add Apple Sign-In
- Update user registration flow

Closes #NBT-123

fix(websocket): resolve connection timeout issue

The WebSocket connections were timing out due to
incorrect heartbeat implementation.

Breaking Change: WebSocket client library must be updated
```

### Development Workflow

#### 1. Start New Work
```bash
# Sync with latest changes
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/NBT-123-user-profiles

# Set up tracking
git push -u origin feature/NBT-123-user-profiles
```

#### 2. Daily Development
```bash
# Make changes and commit frequently
git add .
git commit -m "feat(auth): add user profile validation"

# Push changes regularly
git push origin feature/NBT-123-user-profiles

# Sync with develop periodically
git checkout develop
git pull origin develop
git checkout feature/NBT-123-user-profiles
git rebase develop
```

#### 3. Code Review Process
```bash
# Before creating PR, ensure code is ready
npm run lint
npm run test
npm run build

# Create Pull Request through GitHub UI
# Include:
# - Clear description of changes
# - Link to ticket/issue
# - Screenshots if UI changes
# - Testing instructions
```

#### 4. Merge to Develop
```bash
# After approval, squash and merge
# Delete feature branch after merge
git checkout develop
git pull origin develop
git branch -d feature/NBT-123-user-profiles
```

## Coding Standards

### TypeScript Guidelines

#### File Structure
```typescript
// services/auth/src/handlers/register.ts

// 1. External imports
import { APIGatewayProxyHandler } from 'aws-lambda';
import { validate } from 'joi';

// 2. Internal imports (shared)
import { User, ApiResponse } from '@nbt/types';
import { createUser } from '@nbt/database';

// 3. Local imports
import { validateRegistration } from '../utils/validation';
import { formatResponse } from '../utils/response';

// 4. Types and interfaces
interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

// 5. Constants
const MAX_USERNAME_LENGTH = 30;

// 6. Main handler function
export const handler: APIGatewayProxyHandler = async (event) => {
  // Implementation
};

// 7. Helper functions
function sanitizeInput(input: string): string {
  // Implementation
}
```

#### Naming Conventions
```typescript
// Variables and functions: camelCase
const userProfile = getUserProfile();
function calculateScore(answer: Answer): number { }

// Types and interfaces: PascalCase
interface UserProfile { }
type GameState = 'active' | 'paused' | 'finished';

// Constants: SCREAMING_SNAKE_CASE
const MAX_PLAYERS_PER_GAME = 50;
const API_ENDPOINTS = {
  AUTH: '/auth',
  GAMES: '/games'
} as const;

// Files and directories: kebab-case
user-service.ts
game-management/
websocket-handlers.ts
```

#### Type Safety
```typescript
// Use strict typing
interface User {
  id: string;
  email: string;
  username: string;
  preferences: UserPreferences;
}

// Avoid 'any' type
// ❌ Don't do this
function processData(data: any): any {
  return data.someProperty;
}

// ✅ Do this
function processData<T extends { someProperty: string }>(data: T): string {
  return data.someProperty;
}

// Use utility types
type PartialUser = Partial<User>;
type RequiredEmail = Required<Pick<User, 'email'>>;
type UserWithoutId = Omit<User, 'id'>;
```

#### Error Handling
```typescript
// Use custom error types
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Consistent error handling pattern
export async function registerUser(userData: RegisterRequest): Promise<ApiResponse<User>> {
  try {
    // Validation
    const validationResult = validateRegistration(userData);
    if (!validationResult.isValid) {
      throw new ValidationError('Invalid input', validationResult.field);
    }

    // Business logic
    const user = await createUser(userData);
    
    return {
      success: true,
      data: user,
      message: 'User registered successfully'
    };

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof ValidationError) {
      return {
        success: false,
        error: error.message,
        details: { field: error.field, code: error.code }
      };
    }
    
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}
```

### AWS Lambda Best Practices

#### Handler Structure
```typescript
import { APIGatewayProxyHandler } from 'aws-lambda';
import { Logger } from '@nbt/utils';

const logger = new Logger('auth-register');

export const handler: APIGatewayProxyHandler = async (event, context) => {
  // Initialize
  const correlationId = context.awsRequestId;
  logger.setCorrelationId(correlationId);
  
  try {
    // Input validation
    const body = JSON.parse(event.body || '{}');
    
    // Business logic
    const result = await processRegistration(body);
    
    // Success response
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId
      },
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    logger.error('Handler error', { error: error.message, stack: error.stack });
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        correlationId
      })
    };
  }
};
```

#### Performance Optimization
```typescript
// Connection reuse (outside handler)
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  maxAttempts: 3
});

// Environment variable caching
const TABLE_NAME = process.env.DYNAMODB_TABLE!;
const STAGE = process.env.STAGE!;

export const handler: APIGatewayProxyHandler = async (event, context) => {
  // Use cached connections and variables
  const result = await dynamoClient.send(command);
  return response;
};
```

### Database Patterns

#### Data Access Layer
```typescript
// services/auth/src/data/userRepository.ts

import { getDynamoClient, TABLE_NAME, KeyPatterns } from '@nbt/database';
import { User } from '@nbt/types';

export class UserRepository {
  private dynamoClient = getDynamoClient();

  async createUser(user: User): Promise<User> {
    const keys = KeyPatterns.user(user.id);
    
    await this.dynamoClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...user, ...keys },
      ConditionExpression: 'attribute_not_exists(PK)'
    }));
    
    return user;
  }

  async getUserById(userId: string): Promise<User | null> {
    const keys = KeyPatterns.user(userId);
    
    const result = await this.dynamoClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys
    }));
    
    return result.Item as User || null;
  }
}
```

#### Transaction Patterns
```typescript
// Use transactions for related operations
async function updateGameScore(
  gameId: string, 
  userId: string, 
  score: number
): Promise<void> {
  const timestamp = Date.now();
  
  await this.dynamoClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Update: {
          TableName: TABLE_NAME,
          Key: KeyPatterns.game(gameId),
          UpdateExpression: 'SET lastUpdated = :timestamp',
          ExpressionAttributeValues: { ':timestamp': timestamp }
        }
      },
      {
        Update: {
          TableName: TABLE_NAME,
          Key: KeyPatterns.gameParticipant(gameId, userId),
          UpdateExpression: 'SET currentScore = :score, lastUpdated = :timestamp',
          ExpressionAttributeValues: { ':score': score, ':timestamp': timestamp }
        }
      }
    ]
  }));
}
```

## Testing Standards

### Test Structure

```
tests/
├── unit/                 # Unit tests
│   ├── auth/
│   ├── game/
│   └── question/
├── integration/          # Integration tests
│   ├── api/
│   └── websocket/
├── e2e/                  # End-to-end tests
│   ├── game-flow/
│   └── user-journey/
├── load/                 # Load tests
│   ├── auth-load.yml
│   └── websocket-load.yml
└── fixtures/             # Test data
    ├── users.json
    └── games.json
```

### Unit Testing

#### Test File Naming
```
src/handlers/register.ts    → tests/unit/handlers/register.test.ts
src/services/userService.ts → tests/unit/services/userService.test.ts
src/utils/validation.ts     → tests/unit/utils/validation.test.ts
```

#### Test Structure
```typescript
// tests/unit/handlers/register.test.ts

import { handler } from '../../../src/handlers/register';
import { createUser } from '../../../src/services/userService';
import { validateRegistration } from '../../../src/utils/validation';

// Mock dependencies
jest.mock('../../../src/services/userService');
jest.mock('../../../src/utils/validation');

const mockCreateUser = createUser as jest.MockedFunction<typeof createUser>;
const mockValidateRegistration = validateRegistration as jest.MockedFunction<typeof validateRegistration>;

describe('Register Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when valid input is provided', () => {
    it('should create user and return success response', async () => {
      // Arrange
      const event = createMockAPIGatewayEvent({
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePass123!'
        })
      });

      mockValidateRegistration.mockReturnValue({ isValid: true });
      mockCreateUser.mockResolvedValue(mockUser);

      // Act
      const result = await handler(event, mockContext, mockCallback);

      // Assert
      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: expect.objectContaining({
          email: 'test@example.com',
          username: 'testuser'
        })
      });
    });
  });

  describe('when invalid input is provided', () => {
    it('should return validation error', async () => {
      // Arrange
      const event = createMockAPIGatewayEvent({
        body: JSON.stringify({
          email: 'invalid-email',
          username: 'a',
          password: '123'
        })
      });

      mockValidateRegistration.mockReturnValue({
        isValid: false,
        field: 'email',
        message: 'Invalid email format'
      });

      // Act
      const result = await handler(event, mockContext, mockCallback);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Invalid email format'
      });
    });
  });
});
```

### Integration Testing

#### API Integration Tests
```typescript
// tests/integration/api/auth.test.ts

import { setupTestEnvironment, teardownTestEnvironment } from '../helpers/setup';
import { createTestUser, deleteTestUser } from '../helpers/testData';
import { apiClient } from '../helpers/apiClient';

describe('Authentication API Integration', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe('POST /auth/register', () => {
    it('should register new user successfully', async () => {
      const userData = {
        email: 'integration-test@example.com',
        username: 'integrationtest',
        password: 'SecurePass123!'
      };

      const response = await apiClient.post('/auth/register', userData);

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.email).toBe(userData.email);

      // Cleanup
      await deleteTestUser(response.data.data.userId);
    });
  });
});
```

### WebSocket Testing

```typescript
// tests/integration/websocket/game.test.ts

import WebSocket from 'ws';
import { setupTestEnvironment } from '../helpers/setup';
import { createTestGame, createTestUser } from '../helpers/testData';

describe('WebSocket Game Integration', () => {
  let ws: WebSocket;
  let authToken: string;
  let gameCode: string;

  beforeAll(async () => {
    await setupTestEnvironment();
    const { token } = await createTestUser();
    authToken = token;
  });

  beforeEach(async () => {
    ws = new WebSocket(`ws://localhost:3001?token=${authToken}`);
    await waitForConnection(ws);
  });

  afterEach(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  it('should create and join game successfully', async () => {
    // Create game
    const createGameMessage = {
      action: 'createGame',
      data: {
        gameData: {
          title: 'Test Game',
          maxParticipants: 10
        }
      }
    };

    const gameCreated = await sendMessageAndWaitForResponse(ws, createGameMessage, 'game-created');
    gameCode = gameCreated.data.game.gameCode;

    expect(gameCreated.data.game.title).toBe('Test Game');

    // Join game (second connection)
    const ws2 = new WebSocket(`ws://localhost:3001?token=${authToken}`);
    await waitForConnection(ws2);

    const joinGameMessage = {
      action: 'joinGame',
      data: { gameCode }
    };

    const gameJoined = await sendMessageAndWaitForResponse(ws2, joinGameMessage, 'game-joined');
    expect(gameJoined.data.game.gameCode).toBe(gameCode);

    ws2.close();
  });
});
```

### Testing Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run load tests
npm run test:load

# Run specific test file
npm test -- register.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create user"
```

## Code Quality

### Linting and Formatting

#### ESLint Configuration
```json
// .eslintrc.js
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    'prefer-const': 'error',
    'no-console': 'warn'
  }
};
```

#### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

#### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,js}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ],
    "*.{json,md}": [
      "prettier --write",
      "git add"
    ]
  }
}
```

### Code Review Guidelines

#### Pull Request Checklist

**Author Checklist:**
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No secrets or sensitive data
- [ ] Performance impact considered
- [ ] Breaking changes documented

**Reviewer Checklist:**
- [ ] Code is readable and maintainable
- [ ] Logic is correct and efficient
- [ ] Tests are comprehensive
- [ ] Security best practices followed
- [ ] Error handling is appropriate
- [ ] Documentation is clear

#### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Peer Review**: At least one team member approval
3. **Security Review**: For security-sensitive changes
4. **Performance Review**: For performance-critical changes

## Documentation Standards

### Code Documentation

#### Function Documentation
```typescript
/**
 * Registers a new user in the system.
 * 
 * @param userData - The user registration data
 * @param userData.email - User's email address (must be unique)
 * @param userData.username - User's username (3-30 characters)
 * @param userData.password - User's password (min 8 characters)
 * @returns Promise resolving to the created user object
 * 
 * @throws {ValidationError} When input validation fails
 * @throws {DuplicateEmailError} When email already exists
 * 
 * @example
 * ```typescript
 * const user = await registerUser({
 *   email: 'john@example.com',
 *   username: 'johndoe',
 *   password: 'SecurePass123!'
 * });
 * ```
 */
export async function registerUser(userData: RegisterRequest): Promise<User> {
  // Implementation
}
```

#### API Documentation
```typescript
/**
 * @api {post} /auth/register Register User
 * @apiName RegisterUser
 * @apiGroup Authentication
 * @apiVersion 1.0.0
 * 
 * @apiDescription Register a new user account with email verification.
 * 
 * @apiParam {String} email User's email address
 * @apiParam {String} username Unique username (3-30 characters)
 * @apiParam {String} password Password (minimum 8 characters)
 * @apiParam {String} [displayName] Display name for the user
 * 
 * @apiSuccess {Boolean} success Indicates if registration was successful
 * @apiSuccess {Object} data User data object
 * @apiSuccess {String} data.userId Unique user identifier
 * @apiSuccess {String} data.email User's email address
 * @apiSuccess {String} data.username User's username
 * @apiSuccess {Boolean} data.requiresVerification Whether email verification is needed
 * 
 * @apiError (400) ValidationError Invalid input data
 * @apiError (409) EmailExistsError Email already registered
 * @apiError (500) InternalServerError Server error occurred
 */
```

### README Documentation

Each service should have its own README:

```markdown
# Authentication Service

## Overview
Handles user registration, authentication, and profile management.

## Features
- User registration with email verification
- JWT-based authentication
- Social login integration
- Profile management

## API Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - Authenticate user
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

## Environment Variables
- `COGNITO_USER_POOL_ID` - AWS Cognito User Pool ID
- `COGNITO_USER_POOL_CLIENT_ID` - AWS Cognito Client ID
- `JWT_SECRET` - JWT signing secret

## Testing
```bash
npm run test:auth
```

## Deployment
```bash
serverless deploy --stage dev
```
```

## Performance Guidelines

### Lambda Optimization

#### Cold Start Mitigation
```typescript
// Minimize imports
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'; // Specific imports

// Initialize outside handler
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION
});

// Use provisioned concurrency for critical functions
// serverless.yml
functions:
  auth-login:
    handler: src/handlers/login.handler
    provisionedConcurrency: 5 # For critical auth functions
```

#### Memory and Timeout Optimization
```yaml
# serverless.yml
functions:
  auth-register:
    handler: src/handlers/register.handler
    memorySize: 512    # Right-size based on profiling
    timeout: 10        # Set appropriate timeouts
    
  game-websocket:
    handler: src/handlers/websocket.handler
    memorySize: 1024   # Higher memory for WebSocket handling
    timeout: 30
```

### Database Optimization

#### Query Patterns
```typescript
// ✅ Good: Use partition key + sort key
const user = await dynamoClient.get({
  TableName: TABLE_NAME,
  Key: { PK: 'USER#123', SK: 'USER#123' }
});

// ✅ Good: Use GSI for alternate access patterns
const userByEmail = await dynamoClient.query({
  TableName: TABLE_NAME,
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :email',
  ExpressionAttributeValues: { ':email': 'EMAIL#user@example.com' }
});

// ❌ Avoid: Table scans
const allUsers = await dynamoClient.scan({
  TableName: TABLE_NAME,
  FilterExpression: 'contains(email, :domain)',
  ExpressionAttributeValues: { ':domain': '@example.com' }
});
```

#### Batch Operations
```typescript
// Use batch operations for multiple items
const batchGetParams = {
  RequestItems: {
    [TABLE_NAME]: {
      Keys: [
        { PK: 'USER#1', SK: 'USER#1' },
        { PK: 'USER#2', SK: 'USER#2' },
        { PK: 'USER#3', SK: 'USER#3' }
      ]
    }
  }
};

const result = await dynamoClient.batchGet(batchGetParams);
```

## Security Guidelines

### Input Validation
```typescript
import Joi from 'joi';

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  displayName: Joi.string().max(100).optional()
});

export function validateRegistration(data: unknown): ValidationResult {
  const { error, value } = registerSchema.validate(data);
  
  if (error) {
    return {
      isValid: false,
      field: error.details[0].path[0] as string,
      message: error.details[0].message
    };
  }
  
  return { isValid: true, data: value };
}
```

### Secrets Management
```typescript
// ❌ Don't hardcode secrets
const apiKey = 'sk-1234567890abcdef';

// ✅ Use environment variables
const apiKey = process.env.OPENAI_API_KEY;

// ✅ Use AWS Parameter Store for sensitive data
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({ region: process.env.AWS_REGION });

async function getSecret(parameterName: string): Promise<string> {
  const command = new GetParameterCommand({
    Name: parameterName,
    WithDecryption: true
  });
  
  const result = await ssmClient.send(command);
  return result.Parameter?.Value || '';
}
```

### Data Sanitization
```typescript
import sanitizeHtml from 'sanitize-html';

export function sanitizeUserInput(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  });
}

export function sanitizeChatMessage(message: string): string {
  return sanitizeHtml(message, {
    allowedTags: ['b', 'i', 'em', 'strong'],
    allowedAttributes: {},
    textFilter: (text) => text.slice(0, 500) // Limit length
  });
}
```

## Debugging and Troubleshooting

### Logging Standards
```typescript
import { Logger } from '@nbt/utils';

const logger = new Logger('auth-service');

export const handler: APIGatewayProxyHandler = async (event, context) => {
  const correlationId = context.awsRequestId;
  logger.setCorrelationId(correlationId);
  
  try {
    logger.info('Processing registration request', {
      email: body.email,
      username: body.username,
      userAgent: event.headers['User-Agent']
    });
    
    const result = await processRegistration(body);
    
    logger.info('Registration completed successfully', {
      userId: result.userId,
      duration: Date.now() - startTime
    });
    
    return formatSuccessResponse(result);
    
  } catch (error) {
    logger.error('Registration failed', {
      error: error.message,
      stack: error.stack,
      input: { email: body.email, username: body.username }
    });
    
    return formatErrorResponse(error);
  }
};
```

### Debugging Tools
```bash
# Local debugging with VS Code
npm run debug

# View Lambda logs
serverless logs --function auth-register --stage dev --tail

# View DynamoDB operations
AWS_SDK_LOGGER=1 npm run dev

# Profile Lambda performance
npm run profile:lambda

# Load test specific endpoint
artillery run tests/load/auth-load.yml --target http://localhost:3000
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run tests
      run: npm run test:coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
    
    - name: Build TypeScript
      run: npm run build
    
    - name: Run security audit
      run: npm audit --audit-level moderate
```

### Quality Gates

#### Required Checks
- ✅ All tests pass (unit, integration)
- ✅ Code coverage > 80%
- ✅ No ESLint errors
- ✅ No TypeScript errors
- ✅ Security audit passes
- ✅ Performance benchmarks met

#### Optional Checks
- 📊 Code quality score (SonarQube)
- 📈 Bundle size analysis
- 🔍 Dependency vulnerability scan
- 📝 Documentation coverage

This development workflow ensures consistent, high-quality code while maintaining team productivity and project maintainability.