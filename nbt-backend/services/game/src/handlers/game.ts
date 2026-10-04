import { APIGatewayProxyHandler } from 'aws-lambda';
import { WebSocketEvent, WebSocketMessage, Game, GameParticipant } from '@nbt/types';
import { createGame, getGameByCode, updateGameState, addParticipantToGame } from '../services/gameService';
import { verifyWebSocketToken, isGameOwner } from '../utils/auth';
import { sendSuccessToConnection, sendErrorToConnection, broadcastToGame } from '../utils/websocket';
import { joinGameSession, updateConnectionActivity } from '../services/connectionService';
import { generateGameCode } from '../utils/gameUtils';
import { v4 as uuidv4 } from 'uuid';

export const createHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!;
    const message: WebSocketMessage = JSON.parse(event.body || '{}');
    const { data, requestId } = message;

    await updateConnectionActivity(connectionId);

    // Extract token from message data (should be passed in the message)
    const token = data?.token;
    if (!token) {
      await sendErrorToConnection(connectionId, 'Authentication required', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    const authContext = await verifyWebSocketToken(token);
    if (!authContext) {
      await sendErrorToConnection(connectionId, 'Invalid authentication', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    const gameData = data?.gameData || {};
    const gameId = uuidv4();
    const gameCode = generateGameCode();

    const newGame: Game = {
      id: gameId,
      gameCode,
      title: gameData.title || 'Untitled Game',
      description: gameData.description || '',
      gameMode: gameData.gameMode || 'classic',
      state: 'created',
      settings: {
        maxParticipants: gameData.maxParticipants || 20,
        questionTimeLimit: gameData.questionTimeLimit || 30,
        betweenQuestionDelay: gameData.betweenQuestionDelay || 5,
        allowLateJoin: gameData.allowLateJoin !== false,
        showLeaderboardDuringGame: gameData.showLeaderboardDuringGame !== false,
        randomizeQuestions: gameData.randomizeQuestions !== false,
        difficulty: gameData.difficulty || 'medium',
        categories: gameData.categories || [],
        isPrivate: gameData.isPrivate || false,
        requirePassword: gameData.requirePassword || false,
        password: gameData.password,
      },
      ownerId: authContext.userId,
      participants: [],
      questions: [],
      currentQuestionIndex: -1,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await createGame(newGame);

    // Join the creator as the game owner
    await joinGameSession(gameId, connectionId, authContext.userId, 'owner');

    await sendSuccessToConnection(connectionId, 'game-created', {
      game: {
        id: gameId,
        gameCode,
        title: newGame.title,
        state: newGame.state,
        ownerId: newGame.ownerId,
        settings: newGame.settings,
      },
    }, requestId);

    return { statusCode: 200, body: 'Game created' };

  } catch (error) {
    console.error('Create game error:', error);
    const connectionId = event.requestContext.connectionId!;
    await sendErrorToConnection(connectionId, 'Failed to create game');
    return { statusCode: 500, body: 'Error' };
  }
};

export const joinHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!;
    const message: WebSocketMessage = JSON.parse(event.body || '{}');
    const { data, requestId } = message;

    await updateConnectionActivity(connectionId);

    const token = data?.token;
    const gameCode = data?.gameCode;
    const password = data?.password;
    const role = data?.role || 'player'; // 'player' or 'spectator'

    if (!token || !gameCode) {
      await sendErrorToConnection(connectionId, 'Token and game code are required', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    const authContext = await verifyWebSocketToken(token);
    if (!authContext) {
      await sendErrorToConnection(connectionId, 'Invalid authentication', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    const game = await getGameByCode(gameCode);
    if (!game) {
      await sendErrorToConnection(connectionId, 'Game not found', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    // Validate game state
    if (game.state === 'finished' || game.state === 'cancelled') {
      await sendErrorToConnection(connectionId, 'Game has ended', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    // Check password if required
    if (game.settings.requirePassword && game.settings.password !== password) {
      await sendErrorToConnection(connectionId, 'Invalid password', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    // Check if user is already in the game
    const existingParticipant = game.participants.find(p => p.userId === authContext.userId);
    if (existingParticipant) {
      // Rejoin existing participant
      await joinGameSession(game.id, connectionId, authContext.userId, existingParticipant.role);
      
      await sendSuccessToConnection(connectionId, 'game-rejoined', {
        game: {
          id: game.id,
          gameCode: game.gameCode,
          title: game.title,
          state: game.state,
          currentQuestionIndex: game.currentQuestionIndex,
          participant: existingParticipant,
        },
      }, requestId);

      // Notify other participants
      await broadcastToGame(game.id, 'participant-reconnected', {
        userId: authContext.userId,
        displayName: existingParticipant.displayName,
      }, connectionId);

      return { statusCode: 200, body: 'Rejoined game' };
    }

    // Check participant limits
    const playerCount = game.participants.filter(p => p.role === 'player').length;
    if (role === 'player' && playerCount >= game.settings.maxParticipants) {
      await sendErrorToConnection(connectionId, 'Game is full', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    // Check late join rules
    if (!game.settings.allowLateJoin && game.state === 'active') {
      await sendErrorToConnection(connectionId, 'Late joining is not allowed', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    // Create new participant
    const newParticipant: GameParticipant = {
      userId: authContext.userId,
      displayName: authContext.username, // Should get from user profile
      role: role as 'player' | 'spectator',
      joinedAt: Date.now(),
      isReady: false,
      isConnected: true,
      answers: [],
      currentScore: 0,
      stats: {
        correctAnswers: 0,
        totalAnswers: 0,
        averageResponseTime: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
    };

    // Add participant to game
    await addParticipantToGame(game.id, newParticipant);

    // Join game session
    await joinGameSession(game.id, connectionId, authContext.userId, newParticipant.role);

    await sendSuccessToConnection(connectionId, 'game-joined', {
      game: {
        id: game.id,
        gameCode: game.gameCode,
        title: game.title,
        state: game.state,
        currentQuestionIndex: game.currentQuestionIndex,
        participant: newParticipant,
      },
    }, requestId);

    // Notify other participants
    await broadcastToGame(game.id, 'participant-joined', {
      participant: newParticipant,
      participantCount: game.participants.length + 1,
    }, connectionId);

    return { statusCode: 200, body: 'Joined game' };

  } catch (error) {
    console.error('Join game error:', error);
    const connectionId = event.requestContext.connectionId!;
    await sendErrorToConnection(connectionId, 'Failed to join game');
    return { statusCode: 500, body: 'Error' };
  }
};

export const startHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!;
    const message: WebSocketMessage = JSON.parse(event.body || '{}');
    const { data, requestId } = message;

    const token = data?.token;
    const gameId = data?.gameId;

    if (!token || !gameId) {
      await sendErrorToConnection(connectionId, 'Token and game ID are required', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    const authContext = await verifyWebSocketToken(token);
    if (!authContext) {
      await sendErrorToConnection(connectionId, 'Invalid authentication', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    const game = await getGameByCode(gameId);
    if (!game) {
      await sendErrorToConnection(connectionId, 'Game not found', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    // Verify ownership
    if (!isGameOwner(authContext, game.ownerId)) {
      await sendErrorToConnection(connectionId, 'Only the game owner can start the game', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    // Check if game can be started
    if (game.state !== 'created' && game.state !== 'waiting') {
      await sendErrorToConnection(connectionId, 'Game cannot be started in current state', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    if (game.questions.length === 0) {
      await sendErrorToConnection(connectionId, 'Cannot start game without questions', requestId);
      return { statusCode: 200, body: 'Error sent' };
    }

    // Update game state
    await updateGameState(gameId, {
      state: 'starting',
      startedAt: Date.now(),
      currentQuestionIndex: 0,
    });

    // Broadcast to all participants
    await broadcastToGame(gameId, 'game-starting', {
      countdown: 5, // 5 second countdown
      message: 'Game starting soon...',
    });

    // Schedule actual game start after countdown
    setTimeout(async () => {
      await updateGameState(gameId, { state: 'active' });
      await broadcastToGame(gameId, 'game-started', {
        currentQuestionIndex: 0,
        question: game.questions[0], // Should remove correct answer
      });
    }, 5000);

    await sendSuccessToConnection(connectionId, 'game-start-initiated', {
      gameId,
      countdown: 5,
    }, requestId);

    return { statusCode: 200, body: 'Game start initiated' };

  } catch (error) {
    console.error('Start game error:', error);
    const connectionId = event.requestContext.connectionId!;
    await sendErrorToConnection(connectionId, 'Failed to start game');
    return { statusCode: 500, body: 'Error' };
  }
};

export const nextQuestionHandler: APIGatewayProxyHandler = async (event) => {
  // Implementation for advancing to next question
  // Similar pattern to startHandler
  return { statusCode: 200, body: 'Not implemented yet' };
};

export const submitAnswerHandler: APIGatewayProxyHandler = async (event) => {
  // Implementation for submitting answers
  // Similar pattern to joinHandler
  return { statusCode: 200, body: 'Not implemented yet' };
};