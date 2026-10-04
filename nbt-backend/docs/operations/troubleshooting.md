# Troubleshooting Guide

## Overview

This guide provides systematic approaches to diagnosing and resolving common issues in the NBT Backend. It includes step-by-step troubleshooting procedures, common error patterns, and resolution strategies.

## Quick Reference

### Emergency Contacts
- **On-Call Engineer**: +1-555-ON-CALL
- **DevOps Team**: devops@nbt.example.com
- **Security Team**: security@nbt.example.com
- **PagerDuty**: https://nbt.pagerduty.com

### Service Status
- **Status Page**: https://status.nbt.example.com
- **CloudWatch Dashboard**: https://console.aws.amazon.com/cloudwatch/
- **X-Ray Dashboard**: https://console.aws.amazon.com/xray/

### Common Commands
```bash
# Check service health
curl -f https://api.nbt.example.com/health

# View recent logs
aws logs filter-log-events --log-group-name /aws/lambda/nbt-backend-prod-auth-login --start-time $(date -d '1 hour ago' +%s)000

# Check DynamoDB metrics
aws cloudwatch get-metric-statistics --namespace AWS/DynamoDB --metric-name ThrottledRequests --dimensions Name=TableName,Value=nbt-main-table-prod --start-time $(date -d '1 hour ago' --iso-8601) --end-time $(date --iso-8601) --period 300 --statistics Sum
```

## Service-Specific Issues

### Authentication Service Issues

#### Issue: Users Cannot Login

**Symptoms**:
- Users report "Invalid credentials" errors
- Login API returning 401 errors
- Cognito authentication failures

**Diagnostic Steps**:

1. **Check Recent Deployments**:
   ```bash
   # Check deployment history
   serverless deploy list --stage prod
   
   # Check CloudFormation events
   aws cloudformation describe-stack-events --stack-name nbt-backend-prod
   ```

2. **Verify Cognito Configuration**:
   ```bash
   # Check User Pool status
   aws cognito-idp describe-user-pool --user-pool-id $COGNITO_USER_POOL_ID
   
   # Check User Pool Client configuration
   aws cognito-idp describe-user-pool-client --user-pool-id $COGNITO_USER_POOL_ID --client-id $COGNITO_CLIENT_ID
   ```

3. **Check Lambda Function Health**:
   ```bash
   # Test login function directly
   aws lambda invoke --function-name nbt-backend-prod-auth-login --payload '{"body": "{\"email\":\"test@example.com\",\"password\":\"TestPass123!\"}"}' response.json
   
   # Check recent errors
   aws logs filter-log-events --log-group-name /aws/lambda/nbt-backend-prod-auth-login --filter-pattern "ERROR" --start-time $(date -d '1 hour ago' +%s)000
   ```

4. **Verify Database Connectivity**:
   ```bash
   # Check DynamoDB table status
   aws dynamodb describe-table --table-name nbt-main-table-prod
   
   # Test database query
   aws dynamodb get-item --table-name nbt-main-table-prod --key '{"PK": {"S": "USER#test"}, "SK": {"S": "USER#test"}}'
   ```

**Common Causes & Solutions**:

| Cause | Solution |
|-------|----------|
| **Cognito Configuration Issue** | Verify User Pool and Client settings, check callback URLs |
| **Lambda Function Error** | Check CloudWatch logs, verify environment variables |
| **DynamoDB Throttling** | Enable auto-scaling, optimize queries |
| **Network Connectivity** | Check VPC configuration, security groups |
| **Environment Variables** | Verify all required environment variables are set |

**Resolution Steps**:

1. **Immediate Fix**:
   ```bash
   # If deployment issue, rollback
   serverless rollback --timestamp YYYY-MM-DDTHH:mm:ss.sssZ --stage prod
   
   # If capacity issue, increase DynamoDB capacity temporarily
   aws dynamodb update-table --table-name nbt-main-table-prod --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=100
   ```

2. **Permanent Fix**:
   - Fix code issues and redeploy
   - Update configuration parameters
   - Optimize database queries
   - Implement proper error handling

#### Issue: High Authentication Latency

**Symptoms**:
- Login requests taking >5 seconds
- Timeout errors in client applications
- High Lambda duration metrics

**Diagnostic Steps**:

1. **Check Lambda Performance**:
   ```bash
   # Get duration metrics
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Duration \
     --dimensions Name=FunctionName,Value=nbt-backend-prod-auth-login \
     --start-time $(date -d '1 hour ago' --iso-8601) \
     --end-time $(date --iso-8601) \
     --period 300 \
     --statistics Average,Maximum
   ```

2. **Analyze X-Ray Traces**:
   ```bash
   # Get recent traces with high latency
   aws xray get-trace-summaries \
     --time-range-type TimeRangeByStartTime \
     --start-time $(date -d '1 hour ago' +%s) \
     --end-time $(date +%s) \
     --filter-expression 'responsetime > 5'
   ```

3. **Check Database Performance**:
   ```bash
   # Check DynamoDB latency
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name SuccessfulRequestLatency \
     --dimensions Name=TableName,Value=nbt-main-table-prod Name=Operation,Value=GetItem \
     --start-time $(date -d '1 hour ago' --iso-8601) \
     --end-time $(date --iso-8601) \
     --period 300 \
     --statistics Average
   ```

**Resolution Steps**:

1. **Optimize Lambda Function**:
   ```typescript
   // Increase memory allocation
   // serverless.yml
   functions:
     auth-login:
       memorySize: 1024  # Increase from 512
   
   // Optimize cold starts
   const dynamoClient = new DynamoDBClient({
     region: process.env.AWS_REGION
   }); // Move outside handler
   ```

2. **Database Optimization**:
   ```typescript
   // Use projection expressions
   const result = await dynamoClient.get({
     TableName: TABLE_NAME,
     Key: keys,
     ProjectionExpression: 'email, username, #status',
     ExpressionAttributeNames: { '#status': 'status' }
   });
   ```

3. **Enable Provisioned Concurrency**:
   ```yaml
   # serverless.yml
   functions:
     auth-login:
       provisionedConcurrency: 5
   ```

### Game Service Issues

#### Issue: WebSocket Connection Failures

**Symptoms**:
- Users cannot connect to games
- "Connection timeout" errors
- High WebSocket disconnection rate

**Diagnostic Steps**:

1. **Check WebSocket API Health**:
   ```bash
   # Test WebSocket connection
   wscat -c wss://ws.nbt.example.com/prod?token=$TEST_TOKEN
   
   # Check API Gateway metrics
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ApiGateway \
     --metric-name 4XXError \
     --dimensions Name=ApiName,Value=nbt-websocket-prod \
     --start-time $(date -d '1 hour ago' --iso-8601) \
     --end-time $(date --iso-8601) \
     --period 300 \
     --statistics Sum
   ```

2. **Check Connection Handler**:
   ```bash
   # Check connect function logs
   aws logs filter-log-events \
     --log-group-name /aws/lambda/nbt-backend-prod-websocket-connect \
     --filter-pattern "ERROR" \
     --start-time $(date -d '1 hour ago' +%s)000
   ```

3. **Verify Authorization**:
   ```bash
   # Test WebSocket authorizer
   aws lambda invoke \
     --function-name nbt-backend-prod-websocket-authorizer \
     --payload '{"type":"REQUEST","methodArn":"arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/websocket/$connect","headers":{"Authorization":"Bearer '$TEST_TOKEN'"}}' \
     auth-response.json
   ```

**Common Causes & Solutions**:

| Cause | Solution |
|-------|----------|
| **Invalid JWT Token** | Verify token format and expiration |
| **Authorizer Function Error** | Check CloudWatch logs, fix authorization logic |
| **Connection Handler Timeout** | Increase timeout, optimize connection logic |
| **DynamoDB Write Failures** | Check capacity, optimize connection storage |

**Resolution Steps**:

1. **Fix Authorization Issues**:
   ```typescript
   // Improve error handling in authorizer
   export const authorizerHandler = async (event: any) => {
     try {
       const token = event.queryStringParameters?.token;
       if (!token) {
         return generatePolicy('user', 'Deny', event.methodArn);
       }
       
       const userData = await verifyToken(token);
       return generatePolicy(userData.userId, 'Allow', event.methodArn);
       
     } catch (error) {
       console.error('Authorization error:', error);
       return generatePolicy('user', 'Deny', event.methodArn);
     }
   };
   ```

2. **Optimize Connection Handling**:
   ```typescript
   // Add connection retry logic
   export const connectHandler = async (event: any) => {
     const maxRetries = 3;
     let attempt = 0;
     
     while (attempt < maxRetries) {
       try {
         await storeConnection(event.requestContext.connectionId, userId);
         return { statusCode: 200 };
       } catch (error) {
         attempt++;
         if (attempt === maxRetries) throw error;
         await sleep(100 * attempt); // Exponential backoff
       }
     }
   };
   ```

#### Issue: Game State Synchronization Problems

**Symptoms**:
- Players see different game states
- Score updates not reflected for all players
- Questions not advancing for some users

**Diagnostic Steps**:

1. **Check Message Broadcasting**:
   ```bash
   # Check message handler logs
   aws logs filter-log-events \
     --log-group-name /aws/lambda/nbt-backend-prod-game-message \
     --filter-pattern "broadcast" \
     --start-time $(date -d '30 minutes ago' +%s)000
   ```

2. **Verify Connection Tracking**:
   ```bash
   # Check active connections for a game
   aws dynamodb query \
     --table-name nbt-main-table-prod \
     --key-condition-expression "PK = :pk" \
     --expression-attribute-values '{":pk": {"S": "SESSION#'$GAME_ID'"}}'
   ```

3. **Check EventBridge Events**:
   ```bash
   # Check game events
   aws logs filter-log-events \
     --log-group-name /aws/events/rule/nbt-game-events \
     --start-time $(date -d '30 minutes ago' +%s)000
   ```

**Resolution Steps**:

1. **Improve State Consistency**:
   ```typescript
   // Use DynamoDB transactions for state updates
   export async function updateGameState(gameId: string, updates: GameUpdate) {
     const timestamp = Date.now();
     
     await dynamoClient.transactWrite({
       TransactItems: [
         {
           Update: {
             TableName: TABLE_NAME,
             Key: { PK: `GAME#${gameId}`, SK: `GAME#${gameId}` },
             UpdateExpression: 'SET #state = :state, #updated = :timestamp',
             ExpressionAttributeNames: {
               '#state': 'state',
               '#updated': 'updatedAt'
             },
             ExpressionAttributeValues: {
               ':state': updates.state,
               ':timestamp': timestamp
             }
           }
         },
         // Update related entities atomically
         ...updates.participants.map(participant => ({
           Update: {
             TableName: TABLE_NAME,
             Key: { PK: `GAME#${gameId}`, SK: `PARTICIPANT#${participant.userId}` },
             UpdateExpression: 'SET #score = :score, #updated = :timestamp',
             ExpressionAttributeNames: {
               '#score': 'currentScore',
               '#updated': 'updatedAt'
             },
             ExpressionAttributeValues: {
               ':score': participant.score,
               ':timestamp': timestamp
             }
           }
         }))
       ]
     });
   }
   ```

2. **Add Message Delivery Confirmation**:
   ```typescript
   // Track message delivery success
   export async function broadcastToGame(gameId: string, message: any) {
     const connections = await getGameConnections(gameId);
     const results = await Promise.allSettled(
       connections.map(conn => sendToConnection(conn.connectionId, message))
     );
     
     // Log delivery failures
     const failures = results.filter(r => r.status === 'rejected');
     if (failures.length > 0) {
       console.error('Message delivery failures:', {
         gameId,
         totalConnections: connections.length,
         failures: failures.length
       });
     }
     
     return { sent: results.length - failures.length, failed: failures.length };
   }
   ```

### Question Service Issues

#### Issue: AI Question Generation Failures

**Symptoms**:
- "Failed to generate questions" errors
- High latency in question generation
- AI service quota exceeded errors

**Diagnostic Steps**:

1. **Check Bedrock Service Status**:
   ```bash
   # Test Bedrock connectivity
   aws bedrock list-foundation-models --region us-east-1
   
   # Check recent invocations
   aws logs filter-log-events \
     --log-group-name /aws/lambda/nbt-backend-prod-question-generate \
     --filter-pattern "bedrock" \
     --start-time $(date -d '1 hour ago' +%s)000
   ```

2. **Check API Quotas**:
   ```bash
   # Check service quotas
   aws service-quotas get-service-quota \
     --service-code bedrock \
     --quota-code L-12345678  # Bedrock quota code
   ```

3. **Analyze Error Patterns**:
   ```bash
   # Check for specific error types
   aws logs filter-log-events \
     --log-group-name /aws/lambda/nbt-backend-prod-question-generate \
     --filter-pattern "{ $.level = \"ERROR\" }" \
     --start-time $(date -d '1 hour ago' +%s)000
   ```

**Resolution Steps**:

1. **Implement Fallback Strategies**:
   ```typescript
   export async function generateQuestions(request: AIQuestionRequest): Promise<Question[]> {
     const strategies = [
       () => generateWithBedrock(request),
       () => generateWithOpenAI(request),
       () => getFromQuestionBank(request)
     ];
     
     for (const strategy of strategies) {
       try {
         const questions = await strategy();
         if (questions.length > 0) return questions;
       } catch (error) {
         console.warn('Generation strategy failed:', error.message);
       }
     }
     
     throw new Error('All question generation strategies failed');
   }
   ```

2. **Add Rate Limiting**:
   ```typescript
   // Implement token bucket for rate limiting
   export class RateLimiter {
     private tokens: number = 10;
     private lastRefill: number = Date.now();
     private readonly refillRate = 2; // tokens per second
     private readonly maxTokens = 10;
     
     async acquireToken(): Promise<boolean> {
       this.refillTokens();
       
       if (this.tokens > 0) {
         this.tokens--;
         return true;
       }
       
       return false;
     }
     
     private refillTokens(): void {
       const now = Date.now();
       const timePassed = (now - this.lastRefill) / 1000;
       const tokensToAdd = Math.floor(timePassed * this.refillRate);
       
       this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
       this.lastRefill = now;
     }
   }
   ```

3. **Optimize Prompts**:
   ```typescript
   // Reduce token usage with efficient prompts
   function buildOptimizedPrompt(request: AIQuestionRequest): string {
     return `Generate ${request.count} ${request.difficulty} ${request.type} questions about ${request.topic}.
   
   Format: JSON array with objects containing: text, options (if multiple choice), correctAnswer, explanation.
   
   Requirements:
   - Clear, unambiguous questions
   - ${request.difficulty} difficulty level
   - Factually accurate
   
   JSON only, no other text.`;
   }
   ```

### Database Issues

#### Issue: DynamoDB Throttling

**Symptoms**:
- `ProvisionedThroughputExceededException` errors
- API timeouts and failures
- High `ThrottledRequests` metric

**Diagnostic Steps**:

1. **Check Throttling Metrics**:
   ```bash
   # Check read throttling
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name ReadThrottledRequests \
     --dimensions Name=TableName,Value=nbt-main-table-prod \
     --start-time $(date -d '1 hour ago' --iso-8601) \
     --end-time $(date --iso-8601) \
     --period 300 \
     --statistics Sum
   
   # Check write throttling
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name WriteThrottledRequests \
     --dimensions Name=TableName,Value=nbt-main-table-prod \
     --start-time $(date -d '1 hour ago' --iso-8601) \
     --end-time $(date --iso-8601) \
     --period 300 \
     --statistics Sum
   ```

2. **Analyze Hot Partitions**:
   ```bash
   # Check consumed capacity distribution
   aws dynamodb describe-table --table-name nbt-main-table-prod \
     --query 'Table.BillingModeSummary'
   ```

3. **Check Access Patterns**:
   ```bash
   # Analyze recent queries
   aws logs filter-log-events \
     --log-group-name /aws/lambda/nbt-backend-prod-auth-login \
     --filter-pattern "DynamoDB" \
     --start-time $(date -d '1 hour ago' +%s)000
   ```

**Resolution Steps**:

1. **Immediate Relief**:
   ```bash
   # Enable auto-scaling (if not already enabled)
   aws application-autoscaling register-scalable-target \
     --service-namespace dynamodb \
     --resource-id table/nbt-main-table-prod \
     --scalable-dimension dynamodb:table:ReadCapacityUnits \
     --min-capacity 5 \
     --max-capacity 1000
   
   # Temporarily increase capacity
   aws dynamodb update-table \
     --table-name nbt-main-table-prod \
     --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=100
   ```

2. **Long-term Optimization**:
   ```typescript
   // Implement exponential backoff
   export async function dynamoRetryWrapper<T>(
     operation: () => Promise<T>,
     maxRetries: number = 3
   ): Promise<T> {
     let attempt = 0;
     
     while (attempt < maxRetries) {
       try {
         return await operation();
       } catch (error) {
         if (error.name === 'ProvisionedThroughputExceededException' && attempt < maxRetries - 1) {
           const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
           await sleep(delay + Math.random() * 1000); // Add jitter
           attempt++;
         } else {
           throw error;
         }
       }
     }
     
     throw new Error('Max retries exceeded');
   }
   ```

3. **Optimize Partition Key Distribution**:
   ```typescript
   // Distribute load across partitions
   function generateDistributedKey(entityType: string, id: string): string {
     const hash = id.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff, 0);
     const partition = Math.abs(hash) % 10; // Distribute across 10 partitions
     return `${entityType}#${partition}#${id}`;
   }
   ```

## System-Wide Issues

### Issue: High Latency Across All Services

**Symptoms**:
- All API endpoints responding slowly
- Lambda duration metrics elevated
- User complaints about performance

**Diagnostic Steps**:

1. **Check AWS Service Health**:
   ```bash
   # Check AWS service status
   curl -s https://status.aws.amazon.com/rss/all.rss | grep -i "us-east-1"
   ```

2. **Analyze X-Ray Service Map**:
   - Check X-Ray console for service dependencies
   - Identify bottlenecks in the service map
   - Look for external service delays

3. **Check Resource Utilization**:
   ```bash
   # Check Lambda concurrent executions
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name ConcurrentExecutions \
     --start-time $(date -d '1 hour ago' --iso-8601) \
     --end-time $(date --iso-8601) \
     --period 300 \
     --statistics Maximum
   ```

**Resolution Steps**:

1. **Scale Resources**:
   ```yaml
   # Increase Lambda concurrency limits
   functions:
     auth-login:
       reservedConcurrency: 100
     game-websocket:
       reservedConcurrency: 200
   ```

2. **Optimize Critical Paths**:
   ```typescript
   // Cache expensive operations
   const cache = new Map<string, { data: any; expires: number }>();
   
   export async function getCachedData(key: string, fetcher: () => Promise<any>, ttl: number = 300000): Promise<any> {
     const cached = cache.get(key);
     
     if (cached && cached.expires > Date.now()) {
       return cached.data;
     }
     
     const data = await fetcher();
     cache.set(key, { data, expires: Date.now() + ttl });
     
     return data;
   }
   ```

### Issue: Memory Leaks

**Symptoms**:
- Lambda memory usage increasing over time
- OutOfMemoryError exceptions
- Performance degradation over time

**Diagnostic Steps**:

1. **Monitor Memory Usage**:
   ```bash
   # Check Lambda memory metrics
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name MemoryUtilization \
     --dimensions Name=FunctionName,Value=nbt-backend-prod-auth-login \
     --start-time $(date -d '24 hours ago' --iso-8601) \
     --end-time $(date --iso-8601) \
     --period 3600 \
     --statistics Average,Maximum
   ```

2. **Profile Memory Usage**:
   ```typescript
   // Add memory profiling
   export const handler: APIGatewayProxyHandler = async (event, context) => {
     const initialMemory = process.memoryUsage();
     
     try {
       const result = await processRequest(event);
       
       const finalMemory = process.memoryUsage();
       console.log('Memory usage:', {
         heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
         heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
         external: finalMemory.external - initialMemory.external
       });
       
       return result;
     } catch (error) {
       throw error;
     }
   };
   ```

**Resolution Steps**:

1. **Fix Memory Leaks**:
   ```typescript
   // Proper cleanup of resources
   export class ResourceManager {
     private resources: Set<any> = new Set();
     
     addResource(resource: any): void {
       this.resources.add(resource);
     }
     
     cleanup(): void {
       for (const resource of this.resources) {
         if (resource.close) resource.close();
         if (resource.destroy) resource.destroy();
       }
       this.resources.clear();
     }
   }
   
   // Use WeakMap for caching to allow garbage collection
   const cache = new WeakMap<object, any>();
   ```

2. **Optimize Memory Usage**:
   ```typescript
   // Stream large responses instead of loading into memory
   export async function streamLargeData(data: any[]): Promise<Readable> {
     return new Readable({
       objectMode: true,
       read() {
         if (data.length > 0) {
           this.push(data.shift());
         } else {
           this.push(null);
         }
       }
     });
   }
   ```

## Incident Response Procedures

### Severity Levels

#### Severity 1 (Critical)
- **Definition**: Complete service outage or data loss
- **Response Time**: 15 minutes
- **Escalation**: Immediate PagerDuty alert

#### Severity 2 (High)
- **Definition**: Significant service degradation
- **Response Time**: 1 hour
- **Escalation**: On-call engineer notification

#### Severity 3 (Medium)
- **Definition**: Minor service impact
- **Response Time**: 4 hours
- **Escalation**: Team notification

#### Severity 4 (Low)
- **Definition**: No service impact
- **Response Time**: Next business day
- **Escalation**: Ticket assignment

### Incident Response Workflow

1. **Detection**: Automated alerts or user reports
2. **Assessment**: Determine severity and impact
3. **Response**: Execute appropriate response procedures
4. **Communication**: Update status page and stakeholders
5. **Resolution**: Implement fix and verify
6. **Post-mortem**: Document lessons learned

### Communication Templates

#### Incident Notification
```
INCIDENT ALERT - Severity [1/2/3/4]

Service: NBT Backend
Issue: [Brief description]
Start Time: [ISO 8601 timestamp]
Impact: [User impact description]
Status: [Investigating/Identified/Monitoring/Resolved]

Next Update: [Time]
Incident Commander: [Name]
```

#### Resolution Notification
```
INCIDENT RESOLVED

Service: NBT Backend
Issue: [Brief description]
Resolution: [What was done to fix]
Duration: [Total incident duration]
Root Cause: [Brief explanation]

Post-mortem will be available at: [URL]
```

## Prevention Strategies

### Proactive Monitoring

1. **Health Checks**:
   ```typescript
   // Implement comprehensive health checks
   export const healthCheck = async (): Promise<HealthStatus> => {
     const checks = await Promise.allSettled([
       checkDatabaseHealth(),
       checkExternalServices(),
       checkMemoryUsage(),
       checkDiskSpace()
     ]);
     
     return {
       status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'unhealthy',
       checks: checks.map((check, index) => ({
         name: ['database', 'external', 'memory', 'disk'][index],
         status: check.status,
         message: check.status === 'rejected' ? check.reason.message : 'OK'
       }))
     };
   };
   ```

2. **Synthetic Monitoring**:
   ```bash
   # Create synthetic tests
   curl -f -X POST https://api.nbt.example.com/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"synthetic@test.com","password":"TestPass123!"}'
   ```

### Capacity Planning

1. **Traffic Projection**:
   - Monitor growth trends
   - Plan for seasonal spikes
   - Load test before peak periods

2. **Resource Scaling**:
   - Implement auto-scaling policies
   - Set up capacity alarms
   - Regular capacity reviews

### Documentation Maintenance

1. **Keep Runbooks Updated**:
   - Regular review of procedures
   - Update after each incident
   - Validate troubleshooting steps

2. **Knowledge Sharing**:
   - Team training sessions
   - Incident post-mortems
   - Documentation reviews

This troubleshooting guide provides a systematic approach to identifying and resolving issues in the NBT Backend, helping maintain high availability and performance.