# NBT Backend Architecture Documentation

## Overview

The NBT (Noggle Boggle Trivia) Backend is a modern, serverless, microservices-based architecture built on AWS. It provides a scalable, real-time trivia gaming platform with AI-powered content generation, real-time multiplayer capabilities, and comprehensive user management.

## Architecture Principles

### 1. Serverless-First
- **No server management**: Focus on business logic, not infrastructure
- **Auto-scaling**: Automatic scaling based on demand
- **Pay-per-use**: Cost-effective pricing model
- **High availability**: Built-in redundancy and failover

### 2. Microservices Architecture
- **Service isolation**: Independent deployment and scaling
- **Technology diversity**: Each service can use optimal technologies
- **Fault tolerance**: Service failures don't cascade
- **Team autonomy**: Different teams can own different services

### 3. Event-Driven Design
- **Loose coupling**: Services communicate through events
- **Asynchronous processing**: Non-blocking operations
- **Scalability**: Easy to add new event consumers
- **Auditability**: Complete event history

### 4. API-First Development
- **Contract-driven**: APIs designed before implementation
- **Documentation**: Comprehensive API documentation
- **Testing**: API contracts enable better testing
- **Integration**: Easier client integration

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client  │    │  Admin Panel    │
│   (React)       │    │ (React Native)  │    │   (React)       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │  (REST + WS)    │
                    └─────────┬───────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐    ┌────────▼────────┐    ┌─────▼─────┐
    │   Auth    │    │      Game       │    │ Question  │
    │ Service   │    │    Service      │    │ Service   │
    │(Cognito)  │    │  (WebSocket)    │    │(AI + DB)  │
    └─────┬─────┘    └────────┬────────┘    └─────┬─────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │     EventBridge   │
                    │  (Event Router)   │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
        │   Score   │   │Tournament │   │  Social   │
        │ Service   │   │ Service   │   │ Service   │
        │(Future)   │   │(Future)   │   │(Future)   │
        └───────────┘   └───────────┘   └───────────┘
                              │
                    ┌─────────▼─────────┐
                    │     DynamoDB      │
                    │ (Single Table)    │
                    └───────────────────┘
```

### Technology Stack

#### Infrastructure Layer
- **AWS Lambda**: Serverless compute for all business logic
- **AWS API Gateway**: HTTP REST APIs and WebSocket APIs
- **AWS DynamoDB**: NoSQL database with single-table design
- **AWS EventBridge**: Event routing and processing
- **AWS CloudWatch**: Monitoring, logging, and alerting
- **AWS X-Ray**: Distributed tracing and performance monitoring

#### Application Layer
- **Node.js 20.x**: JavaScript runtime
- **TypeScript**: Type-safe development
- **Serverless Framework v4**: Infrastructure as Code
- **AWS SDK v3**: AWS service integration

#### External Services
- **AWS Cognito**: User authentication and management
- **AWS Bedrock**: AI/ML services for question generation
- **AWS S3 + CloudFront**: Static asset storage and CDN

## Service Architecture

### 1. Authentication Service

**Purpose**: User management, authentication, and authorization

**Components**:
- **User Registration**: Account creation with email verification
- **User Authentication**: Login/logout with JWT tokens
- **Profile Management**: User preferences and statistics
- **Social Login**: Integration with Google, Apple, Amazon

**Technology Stack**:
- AWS Cognito User Pools
- Lambda functions for custom logic
- DynamoDB for extended user data

**Key Features**:
- Secure password policies
- Multi-factor authentication support
- Social provider integration
- Profile customization
- Privacy controls

### 2. Game Service

**Purpose**: Real-time game management and WebSocket communication

**Components**:
- **WebSocket Management**: Connection handling and routing
- **Game Session Management**: Game creation, joining, and lifecycle
- **Real-time Communication**: Live messaging and updates
- **Game State Management**: Tracking game progress and participants

**Technology Stack**:
- AWS API Gateway WebSocket API
- Lambda functions for game logic
- DynamoDB for session storage
- EventBridge for game events

**Key Features**:
- Real-time multiplayer support
- Game master controls
- Spectator mode
- Connection management
- State synchronization

### 3. Question Service

**Purpose**: Question management and AI-powered content generation

**Components**:
- **Question CRUD**: Create, read, update, delete questions
- **AI Generation**: Automated question creation using LLMs
- **Content Management**: Categorization and difficulty management
- **Quality Control**: Validation and feedback systems

**Technology Stack**:
- AWS Bedrock for AI services
- Lambda functions for business logic
- DynamoDB for question storage
- S3 for media assets

**Key Features**:
- Multiple question types
- AI-powered generation
- Category and difficulty management
- Usage analytics
- Content moderation

## Data Architecture

### DynamoDB Single-Table Design

The system uses a single DynamoDB table with multiple access patterns supported through primary keys and Global Secondary Indexes (GSIs).

#### Table Structure

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | String | Partition Key - Entity type + ID |
| SK | String | Sort Key - Entity type + ID or relationship |
| GSI1PK | String | GSI1 Partition Key - Secondary access pattern |
| GSI1SK | String | GSI1 Sort Key - Secondary access pattern |
| GSI2PK | String | GSI2 Partition Key - Additional access pattern |
| GSI2SK | String | GSI2 Sort Key - Additional access pattern |

#### Access Patterns

**Users**:
```
PK: USER#userId          SK: USER#userId          (Get user)
GSI1PK: USER#email       GSI1SK: USER#userId     (Login by email)
GSI2PK: USER#username    GSI2SK: USER#userId     (Search by username)
```

**Games**:
```
PK: GAME#gameId          SK: GAME#gameId          (Get game)
GSI1PK: GAME#ownerId     GSI1SK: GAME#createdAt  (Owner's games)
GSI2PK: GAME#gameCode    GSI2SK: GAME#gameId     (Join by code)
```

**Game Participants**:
```
PK: GAME#gameId          SK: PARTICIPANT#userId   (Game participants)
GSI1PK: USER#userId      GSI1SK: PARTICIPANT#gameId (User's games)
```

**Questions**:
```
PK: QUESTION#questionId  SK: QUESTION#questionId  (Get question)
GSI1PK: QUESTION#cat     GSI1SK: QUESTION#diff    (Browse by category)
GSI2PK: QUESTION#owner   GSI2SK: QUESTION#created (Owner's questions)
```

### Data Consistency Model

#### Strong Consistency
- User authentication data
- Game state during active play
- Financial transactions (future)
- Admin operations

#### Eventual Consistency
- User statistics and leaderboards
- Question usage analytics
- Social interactions
- Non-critical notifications

## Security Architecture

### Authentication & Authorization

#### Multi-Layer Security
```
┌─────────────────┐
│   Client App    │ ← JWT Token Validation
└─────────┬───────┘
          │
┌─────────▼───────┐
│  API Gateway    │ ← Rate Limiting, CORS
└─────────┬───────┘
          │
┌─────────▼───────┐
│ Lambda Function │ ← Business Logic Validation
└─────────┬───────┘
          │
┌─────────▼───────┐
│   DynamoDB      │ ← IAM Policies, Encryption
└─────────────────┘
```

#### Security Layers

1. **Client Security**
   - HTTPS/WSS only
   - JWT token storage
   - Certificate pinning
   - Input validation

2. **API Gateway Security**
   - AWS WAF integration
   - Rate limiting
   - CORS configuration
   - Request/response validation

3. **Lambda Security**
   - Minimal IAM permissions
   - Environment variable encryption
   - VPC isolation (where needed)
   - Runtime security scanning

4. **Database Security**
   - Encryption at rest
   - Encryption in transit
   - Fine-grained access control
   - Audit logging

### Data Protection

#### Encryption Strategy
- **At Rest**: DynamoDB encryption with AWS KMS
- **In Transit**: TLS 1.3 for all communications
- **Application Level**: Sensitive PII fields encrypted

#### Privacy Controls
- GDPR compliance features
- Data retention policies
- User data export/deletion
- Audit trail maintenance

## Performance Architecture

### Scalability Patterns

#### Horizontal Scaling
- Lambda auto-scaling based on concurrency
- DynamoDB on-demand scaling
- API Gateway automatic scaling
- WebSocket connection distribution

#### Performance Optimization
- Cold start mitigation with provisioned concurrency
- Connection pooling for external services
- Caching strategies at multiple layers
- Optimized database access patterns

### Monitoring & Observability

#### Application Performance Monitoring (APM)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudWatch    │    │     X-Ray       │    │  Custom Metrics │
│   (Metrics)     │    │   (Tracing)     │    │  (Business)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     Monitoring           │
                    │     Dashboard            │
                    └──────────────────────────┘
```

#### Key Metrics
- **Latency**: API response times, WebSocket message latency
- **Throughput**: Requests per second, concurrent users
- **Error Rates**: HTTP errors, Lambda failures, timeout rates
- **Business Metrics**: Games played, questions generated, user engagement

## Integration Architecture

### Event-Driven Integration

#### Event Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Service   │───▶│ EventBridge │───▶│   Service   │
│ (Producer)  │    │ (Router)    │    │ (Consumer)  │
└─────────────┘    └─────────────┘    └─────────────┘
```

#### Event Types
- **User Events**: Registration, login, profile updates
- **Game Events**: Creation, start, end, participant actions
- **System Events**: Errors, performance alerts, maintenance

#### Benefits
- **Loose Coupling**: Services don't need direct knowledge of each other
- **Reliability**: Event replay and dead letter queues
- **Scalability**: Asynchronous processing
- **Auditability**: Complete event history

### API Integration

#### External Service Integration
- **AWS Bedrock**: AI model access
- **Social Providers**: OAuth integration
- **Payment Processors**: Subscription management (future)
- **Analytics Services**: User behavior tracking

#### Rate Limiting & Circuit Breakers
- Exponential backoff for retries
- Circuit breaker pattern for external services
- Graceful degradation when services are unavailable

## Deployment Architecture

### Environment Strategy

#### Multi-Environment Setup
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Development │    │   Staging   │    │ Production  │
│   (dev)     │    │   (stage)   │    │   (prod)    │
└─────────────┘    └─────────────┘    └─────────────┘
```

#### Environment Isolation
- Separate AWS accounts for production
- Independent infrastructure stacks
- Environment-specific configuration
- Isolated data and secrets

### CI/CD Pipeline

#### Deployment Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Git Push  │───▶│   Build     │───▶│    Test     │───▶│   Deploy    │
│ (Trigger)   │    │ (Compile)   │    │ (Validate)  │    │ (Release)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

#### Quality Gates
- Automated testing (unit, integration, e2e)
- Security scanning
- Performance testing
- Code quality checks

## Disaster Recovery

### Backup Strategy

#### Data Backup
- DynamoDB point-in-time recovery (35 days)
- Cross-region backup for critical data
- Infrastructure as Code for quick recovery
- Configuration backup in version control

#### Recovery Objectives
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Data Retention**: 7 years for compliance

### Business Continuity

#### Failure Scenarios
1. **Single AZ Failure**: Automatic failover
2. **Regional Failure**: Manual failover to backup region
3. **Service Degradation**: Graceful degradation mode
4. **Data Corruption**: Point-in-time recovery

## Future Architecture Considerations

### Planned Enhancements

#### Phase 2: Advanced Gaming
- Real-time voice chat integration
- Video streaming for tournaments
- Advanced analytics and ML insights
- Mobile-optimized protocols

#### Phase 3: Scale & Performance
- Multi-region deployment
- Edge computing for low latency
- Advanced caching strategies
- GraphQL API layer

#### Phase 4: Enterprise Features
- Multi-tenancy support
- Advanced security features
- Compliance certifications
- Enterprise integrations

### Technology Evolution

#### Emerging Technologies
- **Edge Computing**: AWS Lambda@Edge for global performance
- **ML/AI**: Enhanced personalization and content generation
- **Blockchain**: Potential for digital rewards and NFTs
- **IoT**: Integration with smart devices and displays

## Architecture Decision Records (ADRs)

### ADR-001: Serverless Architecture Choice
**Decision**: Use AWS Lambda for all compute workloads
**Rationale**: Cost efficiency, auto-scaling, reduced operational overhead
**Consequences**: Vendor lock-in, cold start considerations

### ADR-002: Single-Table DynamoDB Design
**Decision**: Use single table instead of multiple tables
**Rationale**: Better performance, cost efficiency, simplified operations
**Consequences**: Complex data modeling, requires careful planning

### ADR-003: WebSocket for Real-time Communication
**Decision**: Use API Gateway WebSocket API
**Rationale**: Native AWS integration, auto-scaling, cost-effective
**Consequences**: AWS-specific implementation, limited customization

### ADR-004: TypeScript for Type Safety
**Decision**: Use TypeScript throughout the codebase
**Rationale**: Better developer experience, fewer runtime errors
**Consequences**: Additional build step, learning curve

## Architecture Review Process

### Regular Reviews
- **Monthly**: Performance and cost optimization
- **Quarterly**: Security and compliance review
- **Annually**: Full architecture assessment

### Decision Criteria
- **Performance**: Latency, throughput, scalability requirements
- **Cost**: Development, operational, and infrastructure costs
- **Security**: Data protection, compliance, risk assessment
- **Maintainability**: Code quality, documentation, team expertise

## Conclusion

The NBT Backend architecture provides a solid foundation for a scalable, real-time trivia gaming platform. The serverless, microservices approach enables rapid development, cost-effective scaling, and high availability while maintaining security and performance standards.

The architecture is designed to evolve with the product requirements, supporting the planned roadmap from MVP to enterprise-scale platform.