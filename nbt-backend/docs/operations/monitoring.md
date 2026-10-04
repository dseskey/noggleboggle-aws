# Monitoring and Observability Guide

## Overview

This document covers the comprehensive monitoring, logging, and observability strategy for the NBT Backend. It includes dashboards, alerts, troubleshooting procedures, and performance optimization guidelines.

## Monitoring Architecture

### Observability Stack

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───▶│   CloudWatch    │───▶│   Dashboards    │
│     Metrics     │    │     Metrics     │    │   & Alerts      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───▶│   CloudWatch    │───▶│   Log Analysis  │
│      Logs       │    │      Logs       │    │   & Search      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Distributed    │───▶│     X-Ray       │───▶│   Performance   │
│    Traces       │    │    Traces       │    │   Analysis      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

1. **CloudWatch Metrics**: System and custom application metrics
2. **CloudWatch Logs**: Centralized logging with structured data
3. **X-Ray Tracing**: Distributed request tracing and performance analysis
4. **Custom Dashboards**: Real-time visualization of key metrics
5. **Alerting**: Automated notifications for critical issues

## Metrics and KPIs

### Application Metrics

#### Authentication Service
```typescript
// Custom metrics in Lambda functions
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION });

export async function publishMetric(
  metricName: string, 
  value: number, 
  unit: string = 'Count',
  dimensions: Record<string, string> = {}
): Promise<void> {
  const params = {
    Namespace: 'NBT/Authentication',
    MetricData: [
      {
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value })),
        Timestamp: new Date()
      }
    ]
  };
  
  await cloudwatch.send(new PutMetricDataCommand(params));
}

// Usage in handlers
export const registerHandler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  
  try {
    // Business logic
    const result = await registerUser(userData);
    
    // Success metrics
    await publishMetric('UserRegistration.Success', 1);
    await publishMetric('UserRegistration.Duration', Date.now() - startTime, 'Milliseconds');
    
    return formatSuccessResponse(result);
    
  } catch (error) {
    // Error metrics
    await publishMetric('UserRegistration.Error', 1, 'Count', {
      ErrorType: error.constructor.name
    });
    
    throw error;
  }
};
```

#### Game Service Metrics
```typescript
// Game-specific metrics
const gameMetrics = {
  // Game creation and management
  'GameCreated': { namespace: 'NBT/Game', unit: 'Count' },
  'GameStarted': { namespace: 'NBT/Game', unit: 'Count' },
  'GameCompleted': { namespace: 'NBT/Game', unit: 'Count' },
  
  // WebSocket connections
  'WebSocketConnections': { namespace: 'NBT/WebSocket', unit: 'Count' },
  'MessagesSent': { namespace: 'NBT/WebSocket', unit: 'Count' },
  'MessageLatency': { namespace: 'NBT/WebSocket', unit: 'Milliseconds' },
  
  // Player engagement
  'PlayersJoined': { namespace: 'NBT/Engagement', unit: 'Count' },
  'QuestionsAnswered': { namespace: 'NBT/Engagement', unit: 'Count' },
  'GameDuration': { namespace: 'NBT/Engagement', unit: 'Seconds' }
};

// WebSocket message tracking
export async function trackWebSocketMessage(
  action: string, 
  latency: number, 
  success: boolean
): Promise<void> {
  await Promise.all([
    publishMetric('MessagesSent', 1, 'Count', { Action: action }),
    publishMetric('MessageLatency', latency, 'Milliseconds', { Action: action }),
    publishMetric(
      success ? 'MessageSuccess' : 'MessageError', 
      1, 
      'Count', 
      { Action: action }
    )
  ]);
}
```

#### Question Service Metrics
```typescript
// AI generation metrics
const questionMetrics = {
  'QuestionsGenerated': { namespace: 'NBT/AI', unit: 'Count' },
  'GenerationLatency': { namespace: 'NBT/AI', unit: 'Milliseconds' },
  'GenerationCost': { namespace: 'NBT/AI', unit: 'None' },
  'GenerationErrors': { namespace: 'NBT/AI', unit: 'Count' },
  
  'QuestionsCreated': { namespace: 'NBT/Questions', unit: 'Count' },
  'QuestionsUsed': { namespace: 'NBT/Questions', unit: 'Count' },
  'QuestionAccuracy': { namespace: 'NBT/Questions', unit: 'Percent' }
};

// AI generation tracking
export async function trackAIGeneration(
  questionCount: number,
  latency: number,
  cost: number,
  model: string
): Promise<void> {
  await Promise.all([
    publishMetric('QuestionsGenerated', questionCount, 'Count', { Model: model }),
    publishMetric('GenerationLatency', latency, 'Milliseconds', { Model: model }),
    publishMetric('GenerationCost', cost, 'None', { Model: model })
  ]);
}
```

### System Metrics

#### Lambda Function Metrics
- **Duration**: Function execution time
- **Errors**: Function error count and rate
- **Throttles**: Function throttling events
- **ConcurrentExecutions**: Concurrent function invocations
- **DeadLetterErrors**: Dead letter queue errors

#### DynamoDB Metrics
- **ConsumedReadCapacityUnits**: Read capacity consumption
- **ConsumedWriteCapacityUnits**: Write capacity consumption
- **ThrottledRequests**: Throttled request count
- **SystemErrors**: DynamoDB system errors
- **UserErrors**: User-caused errors

#### API Gateway Metrics
- **Count**: Number of API calls
- **Latency**: API response latency
- **4XXError**: Client errors
- **5XXError**: Server errors
- **CacheHitCount**: Cache hit count
- **CacheMissCount**: Cache miss count

## Logging Strategy

### Structured Logging

#### Log Format Standard
```typescript
// Structured logging utility
interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  service: string;
  correlationId: string;
  userId?: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack: string;
  };
  performance?: {
    duration: number;
    memory: number;
  };
}

export class Logger {
  constructor(private service: string) {}
  
  private correlationId: string = '';
  private userId?: string;
  
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }
  
  setUserId(id: string): void {
    this.userId = id;
  }
  
  private log(level: LogEntry['level'], message: string, data?: Record<string, unknown>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      correlationId: this.correlationId,
      userId: this.userId,
      message,
      data
    };
    
    console.log(JSON.stringify(logEntry));
  }
  
  info(message: string, data?: Record<string, unknown>): void {
    this.log('INFO', message, data);
  }
  
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('ERROR', message, {
      ...data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
  
  performance(message: string, duration: number, data?: Record<string, unknown>): void {
    this.log('INFO', message, {
      ...data,
      performance: {
        duration,
        memory: process.memoryUsage().heapUsed
      }
    });
  }
}
```

#### Service-Specific Logging

**Authentication Service**:
```typescript
const logger = new Logger('auth-service');

export const loginHandler: APIGatewayProxyHandler = async (event, context) => {
  const startTime = Date.now();
  logger.setCorrelationId(context.awsRequestId);
  
  try {
    const { email } = JSON.parse(event.body || '{}');
    
    logger.info('Login attempt started', {
      email,
      userAgent: event.headers['User-Agent'],
      sourceIp: event.requestContext.identity.sourceIp
    });
    
    const result = await authenticateUser(email, password);
    logger.setUserId(result.userId);
    
    logger.info('Login successful', {
      userId: result.userId,
      duration: Date.now() - startTime
    });
    
    return formatSuccessResponse(result);
    
  } catch (error) {
    logger.error('Login failed', error, {
      email,
      duration: Date.now() - startTime
    });
    
    return formatErrorResponse(error);
  }
};
```

**Game Service**:
```typescript
const logger = new Logger('game-service');

export const createGameHandler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  logger.setCorrelationId(event.requestContext.connectionId || '');
  
  try {
    const gameData = JSON.parse(event.body || '{}');
    
    logger.info('Game creation started', {
      title: gameData.title,
      maxParticipants: gameData.maxParticipants,
      gameMode: gameData.gameMode
    });
    
    const game = await createGame(gameData);
    
    logger.info('Game created successfully', {
      gameId: game.id,
      gameCode: game.gameCode,
      duration: Date.now() - startTime
    });
    
    return { statusCode: 200 };
    
  } catch (error) {
    logger.error('Game creation failed', error, {
      duration: Date.now() - startTime
    });
    
    return { statusCode: 500 };
  }
};
```

### Log Aggregation and Analysis

#### CloudWatch Logs Insights Queries

**Error Analysis**:
```sql
fields @timestamp, level, service, message, error.name, error.message
| filter level = "ERROR"
| stats count() by error.name
| sort count desc
| limit 20
```

**Performance Analysis**:
```sql
fields @timestamp, service, message, performance.duration
| filter performance.duration > 1000
| stats avg(performance.duration), max(performance.duration), count() by service
| sort avg(performance.duration) desc
```

**User Activity Analysis**:
```sql
fields @timestamp, userId, message, data
| filter userId like /user/
| stats count() by userId
| sort count desc
| limit 50
```

**WebSocket Message Analysis**:
```sql
fields @timestamp, data.action, data.gameId, performance.duration
| filter service = "game-service"
| stats count(), avg(performance.duration) by data.action
| sort count desc
```

## Distributed Tracing

### X-Ray Integration

#### Tracing Configuration
```typescript
// Enable X-Ray tracing in Lambda
import AWSXRay from 'aws-xray-sdk-core';
import AWS from 'aws-sdk';

const awsSDK = AWSXRay.captureAWS(AWS);
const dynamoClient = new awsSDK.DynamoDB.DocumentClient();

// Custom subsegments for business logic
export async function processUserRegistration(userData: RegisterRequest): Promise<User> {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('user-registration');
  
  try {
    subsegment?.addAnnotation('email', userData.email);
    subsegment?.addAnnotation('service', 'auth');
    
    // Validation subsegment
    const validationSegment = subsegment?.addNewSubsegment('validation');
    const isValid = await validateUserData(userData);
    validationSegment?.close();
    
    if (!isValid) {
      subsegment?.addError(new Error('Validation failed'));
      throw new ValidationError('Invalid user data');
    }
    
    // Database subsegment
    const dbSegment = subsegment?.addNewSubsegment('database-create-user');
    const user = await createUser(userData);
    dbSegment?.close();
    
    // Email subsegment
    const emailSegment = subsegment?.addNewSubsegment('send-verification-email');
    await sendVerificationEmail(user.email);
    emailSegment?.close();
    
    subsegment?.addMetadata('user', { id: user.id, email: user.email });
    
    return user;
    
  } catch (error) {
    subsegment?.addError(error);
    throw error;
  } finally {
    subsegment?.close();
  }
}
```

#### Trace Analysis Queries

**Service Map Analysis**: Visualize service dependencies and performance
**Timeline Analysis**: Identify bottlenecks in request processing
**Error Analysis**: Track errors across service boundaries

## Dashboards

### CloudWatch Dashboards

#### System Health Dashboard
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Duration", "FunctionName", "nbt-backend-prod-auth-login"],
          [".", "Errors", ".", "."],
          [".", "Throttles", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Auth Service Health"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "nbt-main-table-prod"],
          [".", "ConsumedWriteCapacityUnits", ".", "."],
          [".", "ThrottledRequests", ".", "."]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "DynamoDB Performance"
      }
    }
  ]
}
```

#### Business Metrics Dashboard
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["NBT/Game", "GameCreated"],
          [".", "GameStarted"],
          [".", "GameCompleted"]
        ],
        "period": 3600,
        "stat": "Sum",
        "title": "Game Activity"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["NBT/WebSocket", "WebSocketConnections"],
          [".", "MessagesSent"]
        ],
        "period": 300,
        "stat": "Sum",
        "title": "Real-time Activity"
      }
    }
  ]
}
```

#### AI Service Dashboard
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["NBT/AI", "QuestionsGenerated"],
          [".", "GenerationLatency"],
          [".", "GenerationCost"]
        ],
        "period": 3600,
        "stat": "Sum",
        "title": "AI Generation Metrics"
      }
    }
  ]
}
```

## Alerting and Notifications

### Critical Alerts

#### High Priority Alerts (Immediate Response)
```yaml
# CloudFormation template for alerts
Resources:
  HighErrorRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: NBT-HighErrorRate
      AlarmDescription: High error rate detected
      MetricName: Errors
      Namespace: AWS/Lambda
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 2
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref PagerDutyTopic
      TreatMissingData: notBreaching
      
  DatabaseThrottlingAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: NBT-DatabaseThrottling
      AlarmDescription: DynamoDB throttling detected
      MetricName: ThrottledRequests
      Namespace: AWS/DynamoDB
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      AlarmActions:
        - !Ref PagerDutyTopic
```

#### Medium Priority Alerts (Next Business Day)
```yaml
  HighLatencyAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: NBT-HighLatency
      AlarmDescription: High API latency detected
      MetricName: Duration
      Namespace: AWS/Lambda
      Statistic: Average
      Period: 300
      EvaluationPeriods: 3
      Threshold: 5000
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref SlackTopic
        
  LowGameActivityAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: NBT-LowGameActivity
      AlarmDescription: Unusually low game activity
      MetricName: GameCreated
      Namespace: NBT/Game
      Statistic: Sum
      Period: 3600
      EvaluationPeriods: 2
      Threshold: 5
      ComparisonOperator: LessThanThreshold
      AlarmActions:
        - !Ref EmailTopic
```

### Alert Escalation

#### Escalation Matrix
1. **Level 1** (0-15 min): Automated response, on-call engineer
2. **Level 2** (15-30 min): Team lead notification
3. **Level 3** (30-60 min): Engineering manager notification
4. **Level 4** (60+ min): Executive escalation

#### Notification Channels
```typescript
// SNS notification setup
const alertingTopics = {
  critical: 'arn:aws:sns:us-east-1:account:nbt-critical-alerts',
  warning: 'arn:aws:sns:us-east-1:account:nbt-warning-alerts',
  info: 'arn:aws:sns:us-east-1:account:nbt-info-alerts'
};

export async function sendAlert(
  level: 'critical' | 'warning' | 'info',
  message: string,
  details: Record<string, unknown>
): Promise<void> {
  const sns = new SNSClient({ region: process.env.AWS_REGION });
  
  await sns.send(new PublishCommand({
    TopicArn: alertingTopics[level],
    Subject: `NBT Alert: ${level.toUpperCase()}`,
    Message: JSON.stringify({
      message,
      details,
      timestamp: new Date().toISOString(),
      environment: process.env.STAGE
    })
  }));
}
```

## Troubleshooting Runbooks

### Common Issues and Solutions

#### 1. High Lambda Error Rate

**Symptoms**:
- Error rate > 5%
- CloudWatch alarm triggered
- User complaints about failures

**Investigation Steps**:
```bash
# Check recent errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/nbt-backend-prod-auth-login \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern '"ERROR"'

# Check X-Ray traces
aws xray get-trace-summaries \
  --time-range-type TimeRangeByStartTime \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --filter-expression 'error = true'
```

**Common Causes**:
- Database connectivity issues
- External service timeouts
- Memory/timeout limits exceeded
- Code bugs or deployment issues

**Resolution Steps**:
1. Check CloudWatch Logs for specific error messages
2. Verify database connectivity and capacity
3. Check external service status
4. Review recent deployments
5. Scale up Lambda memory if needed
6. Rollback deployment if necessary

#### 2. DynamoDB Throttling

**Symptoms**:
- `ThrottledRequests` metric increasing
- API timeouts and errors
- Poor application performance

**Investigation Steps**:
```bash
# Check throttling metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=nbt-main-table-prod \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Sum

# Check hot partitions
aws dynamodb describe-table \
  --table-name nbt-main-table-prod \
  --query 'Table.GlobalSecondaryIndexes[*].IndexStatus'
```

**Resolution Steps**:
1. Enable DynamoDB auto-scaling
2. Analyze access patterns for hot partitions
3. Implement exponential backoff in application
4. Consider table design optimization
5. Temporarily increase provisioned capacity

#### 3. WebSocket Connection Issues

**Symptoms**:
- Users reporting connection drops
- High WebSocket error rates
- Game state synchronization issues

**Investigation Steps**:
```bash
# Check WebSocket metrics
aws logs filter-log-events \
  --log-group-name /aws/lambda/nbt-backend-prod-websocket-connect \
  --start-time $(date -d '30 minutes ago' +%s)000 \
  --filter-pattern 'ERROR'

# Check API Gateway WebSocket metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 4XXError \
  --dimensions Name=ApiName,Value=nbt-websocket-prod \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Sum
```

**Resolution Steps**:
1. Check Lambda function timeouts
2. Verify WebSocket route configuration
3. Review authentication mechanism
4. Check for memory leaks in connection handlers
5. Implement connection heartbeat mechanism

### Performance Optimization

#### Lambda Optimization

**Cold Start Reduction**:
```typescript
// Optimize imports
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'; // Specific imports only

// Initialize outside handler
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  maxAttempts: 3
});

// Cache expensive operations
const configCache = new Map<string, any>();

export const handler: APIGatewayProxyHandler = async (event, context) => {
  // Use cached configuration
  let config = configCache.get('app-config');
  if (!config) {
    config = await loadConfiguration();
    configCache.set('app-config', config);
  }
  
  // Process request
  return processRequest(event, config);
};
```

**Memory Optimization**:
```yaml
# Right-size Lambda memory
functions:
  auth-login:
    memorySize: 512    # Based on profiling
  game-websocket:
    memorySize: 1024   # Higher for WebSocket handling
  ai-generation:
    memorySize: 2048   # Higher for AI processing
```

#### Database Optimization

**Query Optimization**:
```typescript
// Use projection expressions to reduce data transfer
const result = await dynamoClient.get({
  TableName: TABLE_NAME,
  Key: { PK: 'USER#123', SK: 'USER#123' },
  ProjectionExpression: 'email, username, displayName'
});

// Use batch operations for multiple items
const batchResult = await dynamoClient.batchGet({
  RequestItems: {
    [TABLE_NAME]: {
      Keys: userIds.map(id => ({ PK: `USER#${id}`, SK: `USER#${id}` }))
    }
  }
});
```

## Cost Optimization

### Cost Monitoring

#### CloudWatch Cost Metrics
```typescript
// Track costs by service
const costMetrics = {
  lambda: 'AWS/Lambda',
  dynamodb: 'AWS/DynamoDB',
  apigateway: 'AWS/ApiGateway',
  bedrock: 'AWS/Bedrock'
};

// Custom cost tracking
export async function trackServiceCost(
  service: string,
  operation: string,
  cost: number
): Promise<void> {
  await publishMetric('ServiceCost', cost, 'None', {
    Service: service,
    Operation: operation
  });
}
```

#### Cost Optimization Strategies

1. **Lambda Optimization**:
   - Right-size memory allocation
   - Use ARM-based Graviton2 processors
   - Implement provisioned concurrency judiciously

2. **DynamoDB Optimization**:
   - Use on-demand billing for variable workloads
   - Implement proper data archiving
   - Optimize partition key distribution

3. **API Gateway Optimization**:
   - Enable response caching
   - Use appropriate throttling limits
   - Monitor and optimize request patterns

## Security Monitoring

### Security Metrics

```typescript
// Security event tracking
const securityMetrics = {
  'FailedLogins': { threshold: 10, window: '5m' },
  'SuspiciousActivity': { threshold: 5, window: '1m' },
  'UnauthorizedAccess': { threshold: 1, window: '1m' },
  'DataAccess': { threshold: 1000, window: '1h' }
};

export async function trackSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high',
  details: Record<string, unknown>
): Promise<void> {
  await publishMetric('SecurityEvent', 1, 'Count', {
    Event: event,
    Severity: severity
  });
  
  // High severity events trigger immediate alerts
  if (severity === 'high') {
    await sendAlert('critical', `Security event: ${event}`, details);
  }
}
```

### Security Alerts

#### Failed Authentication Monitoring
```typescript
export const loginHandler: APIGatewayProxyHandler = async (event) => {
  const sourceIp = event.requestContext.identity.sourceIp;
  
  try {
    const result = await authenticateUser(email, password);
    return formatSuccessResponse(result);
    
  } catch (error) {
    // Track failed login attempts
    await trackSecurityEvent('FailedLogin', 'medium', {
      email,
      sourceIp,
      userAgent: event.headers['User-Agent']
    });
    
    // Check for brute force attempts
    const recentFailures = await getRecentFailedLogins(sourceIp);
    if (recentFailures > 5) {
      await trackSecurityEvent('BruteForceAttempt', 'high', {
        sourceIp,
        attemptCount: recentFailures
      });
    }
    
    return formatErrorResponse(error);
  }
};
```

This comprehensive monitoring and observability strategy ensures that the NBT Backend maintains high availability, performance, and security while providing the insights needed for continuous optimization and rapid incident response.