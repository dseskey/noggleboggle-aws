import { APIGatewayProxyHandler } from 'aws-lambda';
import { CognitoIdentityProviderClient, InitiateAuthCommand, AuthFlowType } from '@aws-sdk/client-cognito-identity-provider';
import { getUserByEmail, updateUserLastLogin } from '../services/userService';
import { ApiResponse } from '@nbt/types';
import { formatApiResponse } from '../utils/response';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    userId: string;
    email: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body: LoginRequest = JSON.parse(event.body || '{}');
    const { email, password } = body;

    if (!email || !password) {
      return formatApiResponse(400, { success: false, error: 'Email and password are required' });
    }

    // Authenticate with Cognito
    const authCommand = new InitiateAuthCommand({
      ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID!,
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const authResponse = await cognitoClient.send(authCommand);

    if (!authResponse.AuthenticationResult) {
      return formatApiResponse(401, { success: false, error: 'Invalid email or password' });
    }

    const { AccessToken, IdToken, RefreshToken, ExpiresIn } = authResponse.AuthenticationResult;

    if (!AccessToken || !IdToken || !RefreshToken) {
      return formatApiResponse(500, { success: false, error: 'Authentication failed' });
    }

    // Get user profile from DynamoDB
    const userProfile = await getUserByEmail(email);
    
    if (!userProfile) {
      return formatApiResponse(404, { success: false, error: 'User profile not found' });
    }

    // Update last login timestamp
    await updateUserLastLogin(userProfile.id);

    const response: ApiResponse<LoginResponse> = {
      success: true,
      data: {
        accessToken: AccessToken,
        idToken: IdToken,
        refreshToken: RefreshToken,
        expiresIn: ExpiresIn || 3600,
        user: {
          userId: userProfile.id,
          email: userProfile.email,
          username: userProfile.username,
          displayName: userProfile.displayName,
          avatar: userProfile.avatar,
        },
      },
      message: 'Login successful',
    };

    return formatApiResponse(200, response);

  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'NotAuthorizedException') {
        return formatApiResponse(401, { success: false, error: 'Invalid email or password' });
      }
      if (error.name === 'UserNotConfirmedException') {
        return formatApiResponse(401, { success: false, error: 'Please verify your email before logging in' });
      }
      if (error.name === 'PasswordResetRequiredException') {
        return formatApiResponse(401, { success: false, error: 'Password reset required' });
      }
      if (error.name === 'UserNotFoundException') {
        return formatApiResponse(401, { success: false, error: 'Invalid email or password' });
      }
      if (error.name === 'TooManyRequestsException') {
        return formatApiResponse(429, { success: false, error: 'Too many login attempts. Please try again later.' });
      }
    }

    return formatApiResponse(500, { success: false, error: 'Internal server error' });
  }
};