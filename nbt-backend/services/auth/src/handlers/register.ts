import { APIGatewayProxyHandler } from 'aws-lambda';
import { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { createUser } from '../services/userService';
import { ApiResponse } from '@nbt/types';
import { validateEmail, validatePassword, validateUsername } from '../utils/validation';
import { formatApiResponse } from '../utils/response';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

interface RegisterResponse {
  userId: string;
  email: string;
  username: string;
  requiresVerification: boolean;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body: RegisterRequest = JSON.parse(event.body || '{}');
    const { email, username, password, displayName } = body;

    // Validation
    if (!validateEmail(email)) {
      return formatApiResponse(400, { success: false, error: 'Invalid email format' });
    }

    if (!validateUsername(username)) {
      return formatApiResponse(400, { success: false, error: 'Username must be 3-30 characters, alphanumeric and underscores only' });
    }

    if (!validatePassword(password)) {
      return formatApiResponse(400, { success: false, error: 'Password must be at least 8 characters with uppercase, lowercase, and number' });
    }

    // Register with Cognito
    const signUpCommand = new SignUpCommand({
      ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID!,
      Username: email,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
        {
          Name: 'preferred_username',
          Value: username,
        },
        {
          Name: 'name',
          Value: displayName || username,
        },
      ],
    });

    const cognitoResponse = await cognitoClient.send(signUpCommand);

    if (!cognitoResponse.UserSub) {
      throw new Error('Failed to register user with Cognito');
    }

    // Create user profile in DynamoDB
    const userProfile = await createUser({
      id: cognitoResponse.UserSub,
      email,
      username,
      displayName: displayName || username,
      socialProviders: [],
      preferences: {
        notifications: {
          email: true,
          push: true,
          gameInvites: true,
          tournamentUpdates: true,
          friendRequests: true,
        },
        privacy: {
          profileVisibility: 'public',
          showOnlineStatus: true,
          showGameHistory: true,
          allowFriendRequests: true,
        },
        gameSettings: {
          defaultDifficulty: 'medium',
          preferredCategories: [],
          autoJoinSpectator: false,
          soundEnabled: true,
        },
      },
      stats: {
        totalGamesPlayed: 0,
        totalGamesWon: 0,
        totalPoints: 0,
        averageScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        achievements: [],
      },
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const response: ApiResponse<RegisterResponse> = {
      success: true,
      data: {
        userId: userProfile.id,
        email: userProfile.email,
        username: userProfile.username,
        requiresVerification: !cognitoResponse.UserConfirmed,
      },
      message: 'User registered successfully. Please check your email for verification.',
    };

    return formatApiResponse(201, response);

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'UsernameExistsException') {
        return formatApiResponse(400, { success: false, error: 'Email already exists' });
      }
      if (error.name === 'InvalidPasswordException') {
        return formatApiResponse(400, { success: false, error: 'Password does not meet requirements' });
      }
      if (error.name === 'InvalidParameterException') {
        return formatApiResponse(400, { success: false, error: 'Invalid parameters provided' });
      }
    }

    return formatApiResponse(500, { success: false, error: 'Internal server error' });
  }
};