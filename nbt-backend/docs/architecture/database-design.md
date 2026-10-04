# Database Design Documentation

## Overview

The NBT Backend uses Amazon DynamoDB with a single-table design pattern. This approach optimizes for performance, cost-efficiency, and operational simplicity while supporting complex access patterns required by a real-time trivia gaming platform.

## Design Philosophy

### Single-Table Design Benefits

1. **Performance**: All related data in one table reduces cross-table joins
2. **Cost Efficiency**: Fewer tables mean lower provisioned capacity costs
3. **Operational Simplicity**: One table to monitor, backup, and maintain
4. **Atomic Transactions**: Related data can be updated atomically
5. **Consistent Performance**: Predictable query patterns across the application

### Trade-offs

**Advantages**:
- Optimized query performance
- Reduced operational complexity
- Cost-effective at scale
- Better data locality

**Challenges**:
- Complex data modeling
- Requires careful planning
- Limited ad-hoc querying
- Steep learning curve

## Table Structure

### Main Table: `nbt-main-table-{stage}`

#### Primary Key Schema
```
Partition Key (PK): String  # Entity type + identifier
Sort Key (SK): String       # Entity type + identifier or relationship
```

#### Global Secondary Indexes

**GSI1**: Secondary access patterns
```
GSI1PK: String  # Alternative partition key
GSI1SK: String  # Alternative sort key
```

**GSI2**: Additional access patterns
```
GSI2PK: String  # Alternative partition key
GSI2SK: String  # Alternative sort key
```

#### Attributes
```
PK          (String)    - Partition Key
SK          (String)    - Sort Key
GSI1PK      (String)    - GSI1 Partition Key
GSI1SK      (String)    - GSI1 Sort Key
GSI2PK      (String)    - GSI2 Partition Key
GSI2SK      (String)    - GSI2 Sort Key
EntityType  (String)    - Entity type identifier
Data        (Map)       - Entity-specific data
CreatedAt   (Number)    - Creation timestamp
UpdatedAt   (Number)    - Last update timestamp
TTL         (Number)    - Time to live (optional)
```

## Entity Patterns

### 1. User Entities

#### User Profile
```
PK: USER#550e8400-e29b-41d4-a716-446655440000
SK: USER#550e8400-e29b-41d4-a716-446655440000
GSI1PK: EMAIL#john.doe@example.com
GSI1SK: USER#550e8400-e29b-41d4-a716-446655440000
GSI2PK: USERNAME#johndoe2023
GSI2SK: USER#550e8400-e29b-41d4-a716-446655440000
EntityType: USER
Data: {
  email: "john.doe@example.com",
  username: "johndoe2023",
  displayName: "John Doe",
  avatar: "https://...",
  preferences: {...},
  stats: {...},
  subscription: {...}
}
```

**Access Patterns**:
- Get user by ID: `PK = USER#userId AND SK = USER#userId`
- Login by email: `GSI1PK = EMAIL#email`
- Search by username: `GSI2PK = USERNAME#username`

#### User Sessions (WebSocket connections)
```
PK: USER#550e8400-e29b-41d4-a716-446655440000
SK: SESSION#connection123
GSI1PK: SESSION#ACTIVE
GSI1SK: SESSION#2023-12-01T10:30:00.000Z
Data: {
  connectionId: "connection123",
  gameId: "game456",
  connectedAt: 1640995200000,
  lastActivity: 1640999800000
}
```

**Access Patterns**:
- Get user sessions: `PK = USER#userId AND begins_with(SK, SESSION#)`
- Get active sessions: `GSI1PK = SESSION#ACTIVE`

### 2. Game Entities

#### Game Metadata
```
PK: GAME#game456
SK: GAME#game456
GSI1PK: OWNER#550e8400-e29b-41d4-a716-446655440000
GSI1SK: CREATED#2023-12-01T10:30:00.000Z
GSI2PK: CODE#ABC123
GSI2SK: GAME#game456
EntityType: GAME
Data: {
  gameCode: "ABC123",
  title: "Friday Night Trivia",
  description: "Weekly trivia night",
  gameMode: "classic",
  state: "active",
  settings: {...},
  ownerId: "550e8400-e29b-41d4-a716-446655440000",
  questions: [...],
  currentQuestionIndex: 2,
  startedAt: 1640995200000
}
```

**Access Patterns**:
- Get game by ID: `PK = GAME#gameId AND SK = GAME#gameId`
- Get games by owner: `GSI1PK = OWNER#ownerId`
- Join game by code: `GSI2PK = CODE#gameCode`

#### Game Participants
```
PK: GAME#game456
SK: PARTICIPANT#550e8400-e29b-41d4-a716-446655440000
GSI1PK: USER#550e8400-e29b-41d4-a716-446655440000
GSI1SK: GAME#game456
EntityType: GAME_PARTICIPANT
Data: {
  userId: "550e8400-e29b-41d4-a716-446655440000",
  displayName: "John Doe",
  role: "player",
  joinedAt: 1640995200000,
  isReady: true,
  isConnected: true,
  currentScore: 150,
  answers: [...],
  stats: {...}
}
```

**Access Patterns**:
- Get game participants: `PK = GAME#gameId AND begins_with(SK, PARTICIPANT#)`
- Get user's games: `GSI1PK = USER#userId AND begins_with(GSI1SK, GAME#)`

#### Game Sessions (WebSocket)
```
PK: SESSION#game456
SK: CONNECTION#connection123
GSI1PK: USER#550e8400-e29b-41d4-a716-446655440000
GSI1SK: SESSION#game456
EntityType: GAME_SESSION
Data: {
  gameId: "game456",
  connectionId: "connection123",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  role: "player",
  joinedAt: 1640995200000,
  lastActivity: 1640999800000
}
```

**Access Patterns**:
- Get game connections: `PK = SESSION#gameId`
- Get user sessions: `GSI1PK = USER#userId AND begins_with(GSI1SK, SESSION#)`

### 3. Question Entities

#### Question Metadata
```
PK: QUESTION#question789
SK: QUESTION#question789
GSI1PK: CATEGORY#Science
GSI1SK: DIFFICULTY#medium#2023-12-01T10:30:00.000Z
GSI2PK: OWNER#550e8400-e29b-41d4-a716-446655440000
GSI2SK: CREATED#2023-12-01T10:30:00.000Z
EntityType: QUESTION
Data: {
  text: "What is the speed of light?",
  type: "multiple-choice",
  category: "Science",
  difficulty: "medium",
  points: 150,
  timeLimit: 30,
  options: [...],
  correctAnswer: "299,792,458 m/s",
  explanation: "The speed of light in vacuum...",
  tags: ["physics", "constants"],
  source: {...},
  usage: {...}
}
```

**Access Patterns**:
- Get question by ID: `PK = QUESTION#questionId AND SK = QUESTION#questionId`
- Browse by category: `GSI1PK = CATEGORY#category`
- Filter by difficulty: `GSI1PK = CATEGORY#category AND begins_with(GSI1SK, DIFFICULTY#medium)`
- Get user's questions: `GSI2PK = OWNER#ownerId`

#### Question Banks
```
PK: BANK#bank123
SK: BANK#bank123
GSI1PK: OWNER#550e8400-e29b-41d4-a716-446655440000
GSI1SK: BANK#2023-12-01T10:30:00.000Z
EntityType: QUESTION_BANK
Data: {
  name: "Science Trivia Collection",
  description: "Curated science questions",
  ownerId: "550e8400-e29b-41d4-a716-446655440000",
  isPublic: true,
  categories: ["Physics", "Chemistry", "Biology"],
  questionCount: 50,
  averageDifficulty: "medium"
}
```

#### Question Bank Relationships
```
PK: BANK#bank123
SK: QUESTION#question789
EntityType: BANK_QUESTION
Data: {
  bankId: "bank123",
  questionId: "question789",
  addedAt: 1640995200000,
  addedBy: "550e8400-e29b-41d4-a716-446655440000"
}
```

### 4. Score and Leaderboard Entities

#### Individual Scores
```
PK: SCORE#game456
SK: USER#550e8400-e29b-41d4-a716-446655440000#QUESTION#question789
GSI1PK: USER#550e8400-e29b-41d4-a716-446655440000
GSI1SK: SCORE#2023-12-01T10:35:00.000Z
EntityType: SCORE
Data: {
  userId: "550e8400-e29b-41d4-a716-446655440000",
  gameId: "game456",
  questionId: "question789",
  points: 125,
  maxPoints: 150,
  timeToAnswer: 8500,
  isCorrect: true,
  submittedAt: 1640995500000,
  bonusPoints: 25,
  streakBonus: 0
}
```

**Access Patterns**:
- Get game scores: `PK = SCORE#gameId`
- Get user score history: `GSI1PK = USER#userId AND begins_with(GSI1SK, SCORE#)`

#### Leaderboards
```
PK: LEADERBOARD#global#all-time
SK: LEADERBOARD#global#all-time
GSI1PK: LEADERBOARD#TYPE#global
GSI1SK: UPDATED#2023-12-01T10:30:00.000Z
EntityType: LEADERBOARD
Data: {
  type: "global",
  scope: "all-time",
  entries: [
    {
      userId: "user1",
      displayName: "Player One",
      score: 5000,
      rank: 1,
      gamesPlayed: 25,
      winRate: 0.8
    },
    // ... more entries
  ],
  lastUpdated: 1640995200000,
  entryCount: 100
}
```

#### Leaderboard Entries (for efficient querying)
```
PK: LEADERBOARD#global#all-time
SK: RANK#001#USER#user1
GSI1PK: USER#user1
GSI1SK: LEADERBOARD#global#all-time#RANK#001
EntityType: LEADERBOARD_ENTRY
Data: {
  userId: "user1",
  displayName: "Player One",
  score: 5000,
  rank: 1,
  gamesPlayed: 25,
  winRate: 0.8,
  change: 0,
  badge: "champion"
}
```

### 5. Social Features

#### Friendships
```
PK: FRIENDSHIP#550e8400-e29b-41d4-a716-446655440000
SK: FRIEND#friend123
GSI1PK: FRIENDSHIP#friend123
GSI1SK: FRIEND#550e8400-e29b-41d4-a716-446655440000
EntityType: FRIENDSHIP
Data: {
  userId1: "550e8400-e29b-41d4-a716-446655440000",
  userId2: "friend123",
  status: "accepted",
  requestedBy: "550e8400-e29b-41d4-a716-446655440000",
  requestedAt: 1640995200000,
  acceptedAt: 1640995800000
}
```

**Access Patterns**:
- Get user's friends: `PK = FRIENDSHIP#userId`
- Get friend requests: `GSI1PK = FRIENDSHIP#userId AND status = pending`

#### Chat Messages
```
PK: CHAT#game456
SK: MESSAGE#2023-12-01T10:35:00.000Z#msg123
GSI1PK: USER#550e8400-e29b-41d4-a716-446655440000
GSI1SK: MESSAGE#2023-12-01T10:35:00.000Z
EntityType: CHAT_MESSAGE
Data: {
  messageId: "msg123",
  gameId: "game456",
  senderId: "550e8400-e29b-41d4-a716-446655440000",
  senderName: "John Doe",
  content: "Good luck everyone!",
  type: "text",
  timestamp: 1640995500000,
  reactions: [],
  isEdited: false
}
```

**Access Patterns**:
- Get game chat: `PK = CHAT#gameId`
- Get user's messages: `GSI1PK = USER#userId AND begins_with(GSI1SK, MESSAGE#)`

### 6. System Entities

#### Achievements
```
PK: ACHIEVEMENT#achievement456
SK: ACHIEVEMENT#achievement456
EntityType: ACHIEVEMENT
Data: {
  name: "Speed Demon",
  description: "Answer 10 questions in under 5 seconds",
  icon: "🏃‍♂️",
  category: "speed",
  rarity: "rare",
  requirements: [
    { type: "answer_speed", value: 5, count: 10 }
  ],
  rewards: [
    { type: "badge", value: "speed-demon" },
    { type: "points", value: 500 }
  ]
}
```

#### User Achievements
```
PK: USER#550e8400-e29b-41d4-a716-446655440000
SK: ACHIEVEMENT#achievement456
GSI1PK: ACHIEVEMENT#achievement456
GSI1SK: USER#550e8400-e29b-41d4-a716-446655440000
EntityType: USER_ACHIEVEMENT
Data: {
  userId: "550e8400-e29b-41d4-a716-446655440000",
  achievementId: "achievement456",
  unlockedAt: 1640995200000,
  progress: 100,
  isNew: true
}
```

## Access Pattern Optimization

### Query Patterns

#### Hot Paths (High Frequency)
1. **User login**: `GSI1PK = EMAIL#email`
2. **Game state**: `PK = GAME#gameId AND SK = GAME#gameId`
3. **Game participants**: `PK = GAME#gameId AND begins_with(SK, PARTICIPANT#)`
4. **WebSocket connections**: `PK = SESSION#gameId`

#### Warm Paths (Medium Frequency)
1. **Question browsing**: `GSI1PK = CATEGORY#category`
2. **User game history**: `GSI1PK = USER#userId AND begins_with(GSI1SK, GAME#)`
3. **Leaderboard queries**: `PK = LEADERBOARD#type#scope`

#### Cold Paths (Low Frequency)
1. **Admin queries**: Various patterns for management
2. **Analytics queries**: Aggregated data access
3. **Bulk operations**: Data export/import

### Performance Considerations

#### Read Performance
- Most queries use partition key + sort key for O(1) access
- GSI queries optimized for common access patterns
- Batch operations for related data

#### Write Performance
- Distributed partition keys to avoid hot partitions
- Atomic updates using UpdateItem
- Batch writes for related operations

#### Cost Optimization
- On-demand billing for variable workloads
- Efficient projection in GSIs
- TTL for temporary data (sessions, cache)

## Data Consistency Model

### Strong Consistency Requirements
- User authentication data
- Active game state
- Financial transactions (future)
- Real-time game updates

### Eventual Consistency Acceptable
- User statistics
- Leaderboards
- Historical data
- Analytics data

### Consistency Patterns

#### Read-After-Write Consistency
For critical operations, use consistent reads:
```typescript
const result = await dynamoClient.get({
  TableName: TABLE_NAME,
  Key: { PK: "USER#123", SK: "USER#123" },
  ConsistentRead: true
});
```

#### Write-Through Pattern
Update both primary item and related items atomically:
```typescript
await dynamoClient.transactWrite({
  TransactItems: [
    {
      Update: {
        TableName: TABLE_NAME,
        Key: { PK: "GAME#456", SK: "GAME#456" },
        UpdateExpression: "SET #state = :state"
      }
    },
    {
      Update: {
        TableName: TABLE_NAME,
        Key: { PK: "GAME#456", SK: "PARTICIPANT#123" },
        UpdateExpression: "SET #score = :score"
      }
    }
  ]
});
```

## Schema Evolution

### Versioning Strategy

#### Backward Compatibility
- Add new attributes without removing old ones
- Use conditional logic for schema differences
- Migrate data lazily during reads

#### Migration Patterns
```typescript
// Handle multiple schema versions
function normalizeUserData(rawData: any): User {
  // V1 schema
  if (rawData.version === 1) {
    return {
      ...rawData,
      preferences: rawData.settings, // Rename field
      version: 2
    };
  }
  
  // V2 schema (current)
  return rawData;
}
```

### Data Migration

#### Online Migration
- Gradual migration during normal operations
- Lazy loading with write-back
- Feature flags to control rollout

#### Offline Migration
- Scheduled maintenance windows
- Bulk data processing
- Validation and rollback procedures

## Monitoring and Maintenance

### Key Metrics

#### Performance Metrics
- Read/Write latency percentiles
- Throttled request rates
- Hot partition detection
- GSI utilization

#### Cost Metrics
- Consumed capacity units
- Storage utilization
- Request patterns analysis

#### Business Metrics
- Query pattern effectiveness
- Data access frequency
- Cache hit rates

### Operational Procedures

#### Backup Strategy
- Point-in-time recovery (35 days)
- Cross-region backups for critical data
- Regular restore testing

#### Capacity Management
- Monitor consumed vs. provisioned capacity
- Auto-scaling configuration
- Burst capacity planning

#### Security Auditing
- Access pattern analysis
- Encryption key rotation
- IAM permission reviews

## Best Practices

### Design Principles

1. **Denormalize for Read Performance**: Store data in the format it will be queried
2. **Minimize Round Trips**: Fetch related data in single queries
3. **Use Sparse Indexes**: Only index when GSI attributes exist
4. **Optimize for Access Patterns**: Design keys based on query requirements

### Common Pitfalls

1. **Hot Partitions**: Avoid sequential keys or popular entities
2. **Large Items**: Keep items under 400KB, use references for large data
3. **Many GSIs**: Each GSI doubles write costs
4. **Inefficient Queries**: Avoid scans, prefer queries with partition keys

### Development Guidelines

#### Naming Conventions
- Use consistent prefixes for entity types
- Include meaningful identifiers in sort keys
- Use timestamps in sortable format (ISO 8601)

#### Testing Strategies
- Unit tests for data access layer
- Integration tests with local DynamoDB
- Performance tests with realistic data volumes
- Chaos engineering for failure scenarios

## Future Considerations

### Scaling Patterns

#### Multi-Region Setup
- Global tables for disaster recovery
- Region-specific data for compliance
- Cross-region replication strategies

#### Data Archiving
- Move old data to cheaper storage (S3)
- Implement data retention policies
- Maintain queryable historical data

### Advanced Features

#### Real-time Analytics
- DynamoDB Streams for change capture
- Integration with analytics services
- Real-time dashboards and alerts

#### Machine Learning Integration
- Feature engineering from game data
- Personalization algorithms
- Predictive analytics for user behavior

This database design provides a solid foundation for the NBT platform while maintaining flexibility for future enhancements and scale requirements.