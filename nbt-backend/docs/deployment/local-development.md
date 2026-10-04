# Local Development Guide

## Overview

This guide covers setting up and running the NBT Backend locally for development purposes. The local environment simulates AWS services using serverless-offline and DynamoDB Local.

## Prerequisites

### Required Software
- **Node.js 20.x** or higher
- **npm 10.x** or higher
- **Docker** (for DynamoDB Local)
- **Java 8+** (for DynamoDB Local alternative)
- **Git**

### Optional Tools
- **AWS CLI** (for AWS service integration)
- **Postman** or **Insomnia** (for API testing)
- **WebSocket King** (for WebSocket testing)

## Setup Instructions

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd nbt-backend

# Install dependencies for all packages
npm install

# Build TypeScript
npm run build
```

### 2. Install Global Dependencies

```bash
# Install Serverless Framework
npm install -g serverless@4

# Install DynamoDB Local (Java approach)
npm install -g dynamodb-local

# Or use Docker (recommended)
docker pull amazon/dynamodb-local
```

### 3. Environment Configuration

Create a local environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```bash
# Local Development Configuration
NODE_ENV=development
STAGE=local
REGION=us-east-1
LOG_LEVEL=debug

# Local DynamoDB
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_TABLE=nbt-main-table-local

# Local API endpoints
API_ENDPOINT=http://localhost:3000
WEBSOCKET_ENDPOINT=ws://localhost:3001

# Mock AWS Services
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
AWS_SESSION_TOKEN=local

# Feature Flags
ENABLE_AI_GENERATION=false  # Disable to avoid AWS Bedrock costs
ENABLE_MOCK_AI=true         # Use mock AI responses
ENABLE_EMAIL_VERIFICATION=false  # Skip email verification locally

# Local Cognito (if using cognito-local)
COGNITO_ENDPOINT=http://localhost:9229

# Development Utilities
HOT_RELOAD=true
DEBUG_MODE=true
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

## Running Local Services

### 1. Start DynamoDB Local

#### Option A: Docker (Recommended)
```bash
# Start DynamoDB Local with Docker
docker run -d \
  --name dynamodb-local \
  -p 8000:8000 \
  amazon/dynamodb-local \
  -jar DynamoDBLocal.jar \
  -sharedDb \
  -dbPath /data

# Verify it's running
curl http://localhost:8000/shell/
```

#### Option B: Java Installation
```bash
# Start DynamoDB Local
dynamodb-local --port 8000 --sharedDb
```

### 2. Create Local Tables

```bash
# Create tables for local development
npm run setup:local

# Or manually create the main table
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --table-name nbt-main-table-local \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
    AttributeName=GSI2PK,AttributeType=S \
    AttributeName=GSI2SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    'IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
    'IndexName=GSI2,KeySchema=[{AttributeName=GSI2PK,KeyType=HASH},{AttributeName=GSI2SK,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
  --billing-mode PAY_PER_REQUEST
```

### 3. Start the Backend Services

```bash
# Start all services with hot reload
npm run dev

# Or start services individually
npm run dev:auth    # Authentication service only
npm run dev:game    # Game service only
npm run dev:question  # Question service only
```

This will start:
- HTTP API server on `http://localhost:3000`
- WebSocket server on `ws://localhost:3001`
- All Lambda functions in offline mode

### 4. Seed Development Data

```bash
# Create sample data for testing
npm run seed:local

# Create test users
npm run create-test-users

# Create sample questions
npm run create-sample-questions
```

## Local Development Workflow

### 1. File Structure

```
nbt-backend/
├── services/           # Microservices
│   ├── auth/          # Authentication service
│   ├── game/          # Game management
│   └── question/      # Question management
├── shared/            # Shared libraries
│   ├── types/         # TypeScript types
│   ├── database/      # DB utilities
│   └── utils/         # Common utilities
├── tests/             # Test files
├── docs/              # Documentation
└── scripts/           # Development scripts
```

### 2. Hot Reload Development

When you make changes to TypeScript files, the system automatically:
1. Recompiles TypeScript
2. Restarts affected Lambda functions
3. Preserves WebSocket connections where possible

### 3. Testing During Development

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run integration tests against local services
npm run test:integration:local

# Run specific service tests
cd services/auth && npm test
```

### 4. API Testing

#### Using curl
```bash
# Test user registration
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123!",
    "displayName": "Test User"
  }'

# Test question creation
curl -X POST http://localhost:3000/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "What is 2+2?",
    "type": "multiple-choice",
    "category": "Math",
    "difficulty": "easy",
    "options": [
      {"text": "3", "isCorrect": false},
      {"text": "4", "isCorrect": true},
      {"text": "5", "isCorrect": false}
    ],
    "correctAnswer": "4"
  }'
```

#### Using the Test Client
```bash
# Start the test client
npm run test-client

# This opens an interactive CLI for testing APIs
```

### 5. WebSocket Testing

#### Using WebSocket King (GUI)
1. Install WebSocket King browser extension
2. Connect to `ws://localhost:3001`
3. Send test messages:

```json
{
  "action": "createGame",
  "data": {
    "token": "mock-token-for-local-dev",
    "gameData": {
      "title": "Test Game",
      "maxParticipants": 10
    }
  }
}
```

#### Using Node.js Script
```bash
# Run WebSocket test script
npm run test:websocket:local
```

## Development Tools

### 1. Database Administration

#### Local DynamoDB Admin UI
```bash
# Install dynamodb-admin
npm install -g dynamodb-admin

# Start admin UI
dynamodb-admin --port 8001

# Open http://localhost:8001 in browser
```

#### AWS CLI with Local Endpoint
```bash
# List tables
aws dynamodb list-tables --endpoint-url http://localhost:8000

# Scan table contents
aws dynamodb scan \
  --endpoint-url http://localhost:8000 \
  --table-name nbt-main-table-local

# Query specific items
aws dynamodb query \
  --endpoint-url http://localhost:8000 \
  --table-name nbt-main-table-local \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk": {"S": "USER#test-user-id"}}'
```

### 2. Logging and Debugging

#### Console Logging
```typescript
// Use structured logging in development
console.log('[AUTH]', 'User login attempt', {
  email: user.email,
  timestamp: new Date().toISOString(),
  correlationId: 'req-123'
});
```

#### Debug Mode
```bash
# Enable debug mode
DEBUG=nbt:* npm run dev

# Or set in environment
export DEBUG=nbt:auth,nbt:game
npm run dev
```

#### VS Code Debug Configuration

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Local Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/serverless",
      "args": ["offline", "start", "--stage", "local"],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "nbt:*"
      },
      "console": "integratedTerminal",
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

### 3. Mock Services

#### Mock AI Service
When `ENABLE_MOCK_AI=true`, the AI service returns predefined responses:

```typescript
// Mock responses in development
const mockQuestions = [
  {
    text: "What is the capital of France?",
    type: "multiple-choice",
    options: [
      { text: "London", isCorrect: false },
      { text: "Paris", isCorrect: true },
      { text: "Berlin", isCorrect: false }
    ]
  }
];
```

#### Mock Cognito
For faster development without AWS Cognito:

```bash
# Install cognito-local
npm install -g cognito-local

# Start mock Cognito
cognito-local --port 9229
```

## Troubleshooting

### Common Issues

#### 1. Port Conflicts
```bash
# Check what's using port 3000
lsof -i :3000

# Kill process if needed
kill -9 $(lsof -t -i:3000)

# Use different ports
npm run dev -- --httpPort 3002 --websocketPort 3003
```

#### 2. DynamoDB Connection Issues
```bash
# Verify DynamoDB Local is running
curl http://localhost:8000/shell/

# Restart DynamoDB Local
docker restart dynamodb-local

# Check table exists
aws dynamodb describe-table \
  --endpoint-url http://localhost:8000 \
  --table-name nbt-main-table-local
```

#### 3. TypeScript Compilation Errors
```bash
# Clean and rebuild
npm run clean
npm run build

# Check TypeScript configuration
npx tsc --noEmit

# Fix import paths
npm run fix-imports
```

#### 4. WebSocket Connection Issues
```bash
# Check WebSocket server logs
DEBUG=serverless-offline:websocket npm run dev

# Test WebSocket connection
wscat -c ws://localhost:3001

# Verify no firewall blocking
telnet localhost 3001
```

### Performance Optimization

#### 1. Faster Startup
```bash
# Skip dependency installation
npm run dev:fast

# Use SWC instead of TypeScript compiler
npm install --save-dev @swc/core @swc/cli
npm run dev:swc
```

#### 2. Memory Usage
```bash
# Monitor memory usage
npm run dev:memory

# Increase Node.js memory if needed
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

## Testing Strategies

### 1. Unit Testing
```bash
# Test specific components
npm run test services/auth/src/handlers/register.test.ts

# Coverage report
npm run test:coverage

# Watch mode for TDD
npm run test:watch
```

### 2. Integration Testing
```bash
# Test API endpoints
npm run test:api:local

# Test WebSocket functionality
npm run test:websocket:local

# Test database operations
npm run test:db:local
```

### 3. Load Testing
```bash
# Install artillery
npm install -g artillery

# Run load tests against local server
artillery run tests/load/local-load-test.yml

# Monitor resource usage during load tests
htop  # or Activity Monitor on Mac
```

## Development Best Practices

### 1. Code Organization
- Keep business logic in service layer
- Use shared types for consistency
- Implement proper error handling
- Add comprehensive logging

### 2. Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make small, focused commits
git commit -m "feat: add user registration validation"

# Push and create PR
git push origin feature/new-feature
```

### 3. Environment Consistency
- Use exact Node.js version (via .nvmrc)
- Lock dependency versions (package-lock.json)
- Document environment setup
- Use Docker for external dependencies

### 4. Testing Philosophy
- Write tests first (TDD)
- Test business logic thoroughly
- Mock external dependencies
- Maintain high test coverage (>80%)

## Next Steps

Once your local environment is running:

1. **Explore the API**: Use Postman collection in `/docs/api/postman/`
2. **Run the Tutorial**: Follow `/docs/tutorials/first-game.md`
3. **Check Examples**: Review `/docs/api/examples/`
4. **Join Development**: Read `/docs/contributing.md`

## Getting Help

### Resources
- **Documentation**: `/docs/`
- **Examples**: `/examples/`
- **Tests**: `/tests/` for usage examples

### Support Channels
- **GitHub Issues**: For bugs and feature requests
- **Development Chat**: Discord/Slack channel
- **Email**: dev-support@nbt.example.com

### Useful Commands Reference

```bash
# Quick reference for common commands
npm run dev              # Start local development
npm run test             # Run all tests
npm run build            # Build TypeScript
npm run clean            # Clean build artifacts
npm run lint             # Run ESLint
npm run seed:local       # Seed local database
npm run setup:local      # Setup local environment
npm run test:api:local   # Test APIs locally
npm run logs             # View local logs
```