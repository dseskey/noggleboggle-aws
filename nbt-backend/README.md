# NBT Backend - Noggle Boggle Trivia

A modern, scalable trivia platform built on AWS serverless architecture with real-time multiplayer capabilities.

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 20.x with TypeScript
- **Framework**: AWS Serverless Framework v4
- **Database**: DynamoDB single-table design
- **WebSocket**: AWS API Gateway WebSocket API
- **Authentication**: AWS Cognito User Pools
- **AI Services**: AWS Bedrock (Claude/GPT)
- **Infrastructure**: Infrastructure as Code (IaC)

### Microservices
```
├── services/
│   ├── auth/          # User authentication & profile management
│   ├── game/          # Game sessions & WebSocket infrastructure
│   ├── question/      # Question management & AI generation
│   ├── score/         # Scoring & leaderboards (planned)
│   ├── tournament/    # Tournament management (planned)
│   └── social/        # Social features & chat (planned)
├── shared/
│   ├── types/         # TypeScript type definitions
│   ├── database/      # DynamoDB utilities & table design
│   └── utils/         # Common utilities
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- AWS CLI configured
- Serverless Framework v4
- TypeScript

### Installation
```bash
# Clone and install dependencies
git clone <repository>
cd nbt-backend
npm install

# Install dependencies for all services
npm run build
```

### Local Development
```bash
# Start offline development server
npm run local

# Run tests
npm test

# Lint code
npm run lint
```

### Deployment
```bash
# Deploy to development
serverless deploy --stage dev

# Deploy to production
serverless deploy --stage prod
```

## 📊 Database Design

### DynamoDB Single-Table Design
The application uses a single DynamoDB table with the following access patterns:

#### Primary Key Patterns:
- **Users**: `PK: USER#userId, SK: USER#userId`
- **Games**: `PK: GAME#gameId, SK: GAME#gameId`
- **Questions**: `PK: QUESTION#questionId, SK: QUESTION#questionId`
- **Game Participants**: `PK: GAME#gameId, SK: PARTICIPANT#userId`
- **WebSocket Sessions**: `PK: SESSION#gameId, SK: SESSION#connectionId`

#### Global Secondary Indexes:
- **GSI1**: User lookup by email, game lookup by owner
- **GSI2**: Username lookup, question lookup by category

## 🔧 API Documentation

### REST Endpoints
```
POST   /auth/register          # User registration
POST   /auth/login             # User authentication
GET    /auth/profile           # Get user profile
PUT    /auth/profile           # Update user profile
POST   /questions              # Create question
GET    /questions              # List questions
POST   /questions/generate     # AI question generation
```

### WebSocket Events
```
# Connection Management
connect                    # Client connects to WebSocket
disconnect                 # Client disconnects

# Game Management
createGame                 # Create new game
joinGame                   # Join existing game
startGame                  # Start game (owner only)
nextQuestion               # Advance to next question
submitAnswer               # Submit answer to question

# Real-time Events (server to client)
game-created               # Game successfully created
game-joined                # Successfully joined game
participant-joined         # New participant joined
game-starting              # Game countdown started
game-started               # Game active with first question
question-revealed          # New question displayed
answer-submitted           # Answer recorded
leaderboard-updated        # Score updates
game-finished              # Game completed
```

## 🔐 Security

### Authentication
- AWS Cognito User Pools for user management
- JWT tokens for API authentication
- WebSocket authentication via query string tokens

### Authorization
- Role-based access control (owner, player, spectator)
- Game-specific permissions
- Rate limiting on AI generation endpoints

### Data Protection
- PII encryption at rest and in transit
- Input validation and sanitization
- CORS configuration for web clients

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run tests for specific service
cd services/auth && npm test

# Watch mode for development
npm run test:watch
```

### Integration Tests
```bash
# Run integration tests (planned)
npm run test:integration
```

## 📈 Monitoring & Observability

### AWS CloudWatch
- Lambda function metrics and logs
- DynamoDB performance metrics
- WebSocket connection metrics
- Custom business metrics

### Error Handling
- Centralized error logging
- Dead letter queues for failed events
- Automatic retry mechanisms
- Circuit breaker patterns

## 🚦 Performance

### Optimization Features
- Provisioned concurrency for critical Lambda functions
- DynamoDB single-table design for optimal query patterns
- WebSocket connection pooling
- Caching strategies for frequently accessed data

### Scalability
- Auto-scaling DynamoDB capacity
- Lambda concurrent execution limits
- WebSocket connection limits per game
- Rate limiting for AI services

## 🔄 Development Workflow

### Git Workflow
- `main` branch for production releases
- `develop` branch for development
- Feature branches for new functionality
- Pull request reviews required

### CI/CD Pipeline
1. **Test**: Lint, unit tests, build validation
2. **Deploy Dev**: Automatic deployment to development environment
3. **Deploy Prod**: Manual approval for production deployment
4. **Smoke Tests**: Post-deployment validation

## 📝 Environment Variables

### Required Environment Variables
```bash
# AWS Configuration
AWS_REGION=us-east-1
DYNAMODB_TABLE=nbt-main-table-{stage}

# Cognito Configuration
COGNITO_USER_POOL_ID={auto-generated}
COGNITO_USER_POOL_CLIENT_ID={auto-generated}

# WebSocket Configuration
WEBSOCKET_API_ENDPOINT={auto-generated}

# Feature Flags
ENABLE_AI_GENERATION=true
ENABLE_TOURNAMENT_MODE=false
```

## 🎯 Roadmap

### Phase 1 (Completed)
- ✅ User authentication and profiles
- ✅ WebSocket infrastructure
- ✅ Basic game management
- ✅ Question creation and AI generation

### Phase 2 (In Progress)
- 🔄 Advanced game controls
- 🔄 Real-time scoring system
- 🔄 Mobile application support

### Phase 3 (Planned)
- ⏳ Tournament system
- ⏳ Social features and chat
- ⏳ Advanced admin tools

### Phase 4 (Future)
- ⏳ Premium subscriptions
- ⏳ Advertisement integration
- ⏳ Advanced analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For questions or support, please contact the development team or create an issue in the repository.