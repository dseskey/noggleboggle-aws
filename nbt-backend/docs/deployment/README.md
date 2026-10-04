# NBT Backend Deployment Guide

## Overview

This guide covers the complete deployment process for the NBT Backend, from initial setup to production deployment. The system uses AWS serverless architecture with Infrastructure as Code (IaC) principles.

## Prerequisites

### Required Tools
- **Node.js 20.x** or higher
- **npm 10.x** or higher
- **AWS CLI 2.x** configured with appropriate credentials
- **Serverless Framework 4.x**
- **Git** for version control

### AWS Requirements
- AWS Account with appropriate permissions
- AWS CLI configured with profiles for dev/prod environments
- Access to the following AWS services:
  - Lambda
  - DynamoDB
  - API Gateway
  - Cognito
  - Bedrock (for AI features)
  - EventBridge
  - CloudWatch

### Permissions Required
The deploying user/role needs the following AWS permissions:
- `AWSLambdaFullAccess`
- `AmazonDynamoDBFullAccess`
- `AmazonAPIGatewayAdministrator`
- `AmazonCognitoPowerUser`
- `AmazonEventBridgeFullAccess`
- `CloudWatchLogsFullAccess`
- `IAMFullAccess` (for creating service roles)
- `CloudFormationFullAccess`

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd nbt-backend

# Install root dependencies
npm install

# Install all service dependencies
npm run build
```

### 2. Configure AWS Profiles

Set up AWS profiles for different environments:

```bash
# Configure development profile
aws configure --profile nbt-dev
# AWS Access Key ID: [Your Dev Access Key]
# AWS Secret Access Key: [Your Dev Secret Key]
# Default region name: us-east-1
# Default output format: json

# Configure production profile
aws configure --profile nbt-prod
# AWS Access Key ID: [Your Prod Access Key]
# AWS Secret Access Key: [Your Prod Secret Key]
# Default region name: us-east-1
# Default output format: json
```

### 3. Environment Configuration

Create environment-specific configuration files:

```bash
# Create environment files
touch .env.dev
touch .env.prod
```

**`.env.dev` example:**
```bash
AWS_PROFILE=nbt-dev
STAGE=dev
REGION=us-east-1
ENABLE_AI_GENERATION=true
ENABLE_TOURNAMENT_MODE=false
LOG_LEVEL=debug
```

**`.env.prod` example:**
```bash
AWS_PROFILE=nbt-prod
STAGE=prod
REGION=us-east-1
ENABLE_AI_GENERATION=true
ENABLE_TOURNAMENT_MODE=true
LOG_LEVEL=info
```

## Deployment Process

### Development Environment

#### First Deployment
```bash
# Set AWS profile
export AWS_PROFILE=nbt-dev

# Deploy infrastructure and services
serverless deploy --stage dev --verbose

# Verify deployment
serverless info --stage dev
```

#### Subsequent Deployments
```bash
# Quick deployment (code changes only)
serverless deploy function --function auth-login --stage dev

# Full deployment (infrastructure changes)
serverless deploy --stage dev
```

### Production Environment

#### Pre-deployment Checklist
- [ ] All tests passing in CI/CD
- [ ] Code reviewed and approved
- [ ] Performance testing completed
- [ ] Security scan completed
- [ ] Backup strategy verified
- [ ] Rollback plan prepared

#### Production Deployment
```bash
# Set AWS profile
export AWS_PROFILE=nbt-prod

# Deploy with extra validation
serverless deploy --stage prod --verbose

# Run smoke tests
npm run test:smoke:prod

# Verify deployment
serverless info --stage prod
```

## Configuration Management

### Environment Variables

The system uses environment variables for configuration. These are automatically set during deployment:

```yaml
# Automatically generated during deployment
DYNAMODB_TABLE: nbt-main-table-{stage}
COGNITO_USER_POOL_ID: {auto-generated}
COGNITO_USER_POOL_CLIENT_ID: {auto-generated}
WEBSOCKET_API_ENDPOINT: {auto-generated}

# Stage-specific
STAGE: dev|prod
REGION: us-east-1
LOG_LEVEL: debug|info|warn|error
```

### Secrets Management

For sensitive configuration, use AWS Systems Manager Parameter Store:

```bash
# Set API keys (example)
aws ssm put-parameter \
  --name "/nbt/dev/openai/api-key" \
  --value "your-api-key" \
  --type "SecureString" \
  --profile nbt-dev

# Set database connection strings
aws ssm put-parameter \
  --name "/nbt/prod/database/url" \
  --value "connection-string" \
  --type "SecureString" \
  --profile nbt-prod
```

## Database Setup

### DynamoDB Tables

Tables are automatically created during deployment. Manual setup is not required, but you can verify:

```bash
# List tables
aws dynamodb list-tables --profile nbt-dev

# Describe main table
aws dynamodb describe-table \
  --table-name nbt-main-table-dev \
  --profile nbt-dev
```

### Initial Data Setup

```bash
# Seed development data
npm run seed:dev

# Create admin user
npm run create-admin -- --email admin@nbt.example.com --stage dev
```

## Monitoring Setup

### CloudWatch Dashboards

Deploy monitoring dashboards:

```bash
# Deploy monitoring stack
cd infrastructure/monitoring
serverless deploy --stage dev
```

### Alarms Configuration

Key alarms are automatically configured:
- Lambda function errors
- DynamoDB throttling
- WebSocket connection failures
- High response times

### Custom Metrics

The application publishes custom metrics:
- Game session counts
- Question generation rates
- User authentication rates
- WebSocket message throughput

## Load Testing

### Before Production Deployment

```bash
# Install load testing tools
npm install -g artillery

# Run load tests
artillery run tests/load/auth-load-test.yml
artillery run tests/load/websocket-load-test.yml
artillery run tests/load/ai-generation-load-test.yml

# Generate report
artillery report --output report.html
```

### Performance Targets
- **API Response Time**: < 500ms (95th percentile)
- **WebSocket Message Latency**: < 200ms
- **Concurrent WebSocket Connections**: 10,000+ per game
- **Questions Generated per Hour**: 1,000+

## Rollback Procedures

### Automatic Rollback

```bash
# Rollback to previous version
serverless rollback --timestamp 2023-12-01T10:30:00.000Z --stage prod

# Rollback specific function
serverless rollback function --function auth-login --stage prod
```

### Manual Rollback Steps

1. **Identify Issue**
   - Check CloudWatch logs
   - Review error rates in monitoring dashboard
   - Verify user reports

2. **Execute Rollback**
   ```bash
   # Get deployment history
   serverless deploy list --stage prod
   
   # Rollback to specific deployment
   serverless rollback --timestamp [TIMESTAMP] --stage prod
   ```

3. **Verify Rollback**
   ```bash
   # Run health checks
   npm run health-check:prod
   
   # Check error rates
   aws logs filter-log-events \
     --log-group-name /aws/lambda/nbt-backend-prod-auth-login \
     --start-time $(date -d '10 minutes ago' +%s)000
   ```

4. **Post-Rollback Actions**
   - Notify stakeholders
   - Update incident tracking
   - Schedule post-mortem
   - Plan fix for next deployment

## CI/CD Integration

### GitHub Actions Setup

The repository includes GitHub Actions workflows in `.github/workflows/`:

#### Required Secrets

Configure these secrets in your GitHub repository:

**Development Environment:**
- `AWS_ACCESS_KEY_ID` - AWS access key for dev environment
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for dev environment

**Production Environment:**
- `AWS_ACCESS_KEY_ID_PROD` - AWS access key for prod environment
- `AWS_SECRET_ACCESS_KEY_PROD` - AWS secret key for prod environment

#### Workflow Triggers

- **Pull Requests**: Run tests and validation
- **Push to `develop`**: Deploy to development environment
- **Push to `main`**: Deploy to production environment

### Manual Deployment Override

To bypass CI/CD and deploy manually:

```bash
# Deploy from local machine
git checkout main
git pull origin main
npm run build
serverless deploy --stage prod --force
```

## Troubleshooting

### Common Deployment Issues

#### 1. Permission Denied Errors
```bash
# Check AWS credentials
aws sts get-caller-identity --profile nbt-dev

# Verify permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:user/USERNAME \
  --action-names lambda:CreateFunction \
  --resource-arns "*"
```

#### 2. CloudFormation Stack Issues
```bash
# Check stack events
aws cloudformation describe-stack-events \
  --stack-name nbt-backend-dev \
  --profile nbt-dev

# Delete stuck stack (careful!)
serverless remove --stage dev --force
```

#### 3. DynamoDB Issues
```bash
# Check table status
aws dynamodb describe-table \
  --table-name nbt-main-table-dev \
  --profile nbt-dev

# Reset table (development only)
aws dynamodb delete-table \
  --table-name nbt-main-table-dev \
  --profile nbt-dev
```

#### 4. Lambda Function Issues
```bash
# Check function logs
serverless logs --function auth-login --stage dev --tail

# Test function directly
serverless invoke --function auth-login --stage dev --data '{}'
```

### Getting Help

1. **Check CloudWatch Logs**
   - Lambda function logs
   - API Gateway logs
   - Application logs

2. **Review Deployment Logs**
   - Serverless deployment output
   - CloudFormation events
   - CI/CD pipeline logs

3. **Contact Support**
   - Create issue in repository
   - Contact DevOps team
   - Check internal documentation

## Security Considerations

### Deployment Security

1. **Access Control**
   - Use least privilege principles
   - Rotate access keys regularly
   - Enable MFA for production access

2. **Secrets Management**
   - Never commit secrets to Git
   - Use AWS Parameter Store/Secrets Manager
   - Encrypt sensitive environment variables

3. **Network Security**
   - Deploy in private subnets where possible
   - Use VPC endpoints for AWS services
   - Enable CloudTrail for audit logging

### Post-Deployment Security

1. **Monitoring**
   - Set up security alerts
   - Monitor for unusual activity
   - Review access logs regularly

2. **Updates**
   - Keep dependencies updated
   - Apply security patches promptly
   - Regular security assessments

## Cost Optimization

### Monitoring Costs

```bash
# Check AWS costs
aws ce get-cost-and-usage \
  --time-period Start=2023-12-01,End=2023-12-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

### Optimization Strategies

1. **Lambda Optimization**
   - Right-size memory allocation
   - Use provisioned concurrency judiciously
   - Optimize cold start times

2. **DynamoDB Optimization**
   - Use on-demand billing for variable workloads
   - Optimize partition key design
   - Set up auto-scaling policies

3. **API Gateway Optimization**
   - Use caching where appropriate
   - Implement request throttling
   - Monitor unused endpoints

## Maintenance

### Regular Maintenance Tasks

#### Weekly
- Review CloudWatch logs for errors
- Check security alerts
- Update dependencies

#### Monthly
- Review and optimize costs
- Update documentation
- Performance testing
- Security vulnerability scanning

#### Quarterly
- Review and update disaster recovery procedures
- Conduct security assessment
- Review and update monitoring dashboards
- Capacity planning review

### Backup and Recovery

#### Automated Backups
- DynamoDB point-in-time recovery (enabled)
- Lambda function versioning
- CloudFormation stack templates

#### Disaster Recovery
1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Recovery Procedures**: Documented in `/docs/disaster-recovery/`

## Support and Escalation

### Contact Information
- **DevOps Team**: devops@nbt.example.com
- **Security Team**: security@nbt.example.com
- **On-Call Engineer**: +1-555-ON-CALL

### Escalation Matrix
1. **Level 1**: Development team
2. **Level 2**: DevOps team
3. **Level 3**: Infrastructure team
4. **Level 4**: Vendor support (AWS)