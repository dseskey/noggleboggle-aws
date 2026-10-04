# Authentication API Examples

## User Registration

### Request
```bash
curl -X POST https://api.nbt.example.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "username": "johndoe2023",
    "password": "SecurePass123!",
    "displayName": "John Doe"
  }'
```

### Success Response (201)
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "username": "johndoe2023",
    "requiresVerification": true
  },
  "message": "User registered successfully. Please check your email for verification."
}
```

### Error Response - Email Already Exists (400)
```json
{
  "success": false,
  "error": "Email already exists"
}
```

### Error Response - Weak Password (400)
```json
{
  "success": false,
  "error": "Password does not meet requirements"
}
```

## User Login

### Request
```bash
curl -X POST https://api.nbt.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!",
    "rememberMe": true
  }'
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ...",
    "expiresIn": 86400,
    "user": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@example.com",
      "username": "johndoe2023",
      "displayName": "John Doe",
      "avatar": "https://cdn.nbt.example.com/avatars/default.png"
    }
  },
  "message": "Login successful"
}
```

### Error Response - Invalid Credentials (401)
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

### Error Response - Unverified Email (401)
```json
{
  "success": false,
  "error": "Please verify your email before logging in"
}
```

### Error Response - Rate Limited (429)
```json
{
  "success": false,
  "error": "Too many login attempts. Please try again later."
}
```

## Get User Profile

### Request
```bash
curl -X GET https://api.nbt.example.com/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "username": "johndoe2023",
    "displayName": "John Doe",
    "avatar": "https://cdn.nbt.example.com/avatars/john-custom.jpg",
    "preferences": {
      "notifications": {
        "email": true,
        "push": true,
        "gameInvites": true,
        "tournamentUpdates": true,
        "friendRequests": true
      },
      "privacy": {
        "profileVisibility": "public",
        "showOnlineStatus": true,
        "showGameHistory": true,
        "allowFriendRequests": true
      },
      "gameSettings": {
        "defaultDifficulty": "medium",
        "preferredCategories": ["Science", "History", "Sports"],
        "autoJoinSpectator": false,
        "soundEnabled": true
      }
    },
    "stats": {
      "totalGamesPlayed": 127,
      "totalGamesWon": 83,
      "totalPoints": 45230,
      "averageScore": 356.1,
      "currentStreak": 7,
      "longestStreak": 15,
      "favoriteCategory": "Science",
      "rank": 142,
      "achievements": [
        "first-win",
        "speed-demon",
        "science-master",
        "streak-5",
        "perfect-game"
      ]
    },
    "subscription": {
      "type": "premium",
      "status": "active",
      "startDate": 1640995200000,
      "endDate": 1672531200000,
      "autoRenew": true
    },
    "createdAt": 1635724800000,
    "lastLoginAt": 1640995200000
  }
}
```

### Error Response - Unauthorized (401)
```json
{
  "success": false,
  "error": "User not authenticated"
}
```

## Update User Profile

### Request
```bash
curl -X PUT https://api.nbt.example.com/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Johnny D",
    "avatar": "https://cdn.nbt.example.com/avatars/new-avatar.jpg",
    "preferences": {
      "notifications": {
        "email": false,
        "push": true,
        "gameInvites": true
      },
      "privacy": {
        "profileVisibility": "friends",
        "showOnlineStatus": false
      },
      "gameSettings": {
        "defaultDifficulty": "hard",
        "preferredCategories": ["Science", "Technology", "Mathematics"],
        "soundEnabled": false
      }
    }
  }'
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "username": "johndoe2023",
    "displayName": "Johnny D",
    "avatar": "https://cdn.nbt.example.com/avatars/new-avatar.jpg",
    "preferences": {
      "notifications": {
        "email": false,
        "push": true,
        "gameInvites": true,
        "tournamentUpdates": true,
        "friendRequests": true
      },
      "privacy": {
        "profileVisibility": "friends",
        "showOnlineStatus": false,
        "showGameHistory": true,
        "allowFriendRequests": true
      },
      "gameSettings": {
        "defaultDifficulty": "hard",
        "preferredCategories": ["Science", "Technology", "Mathematics"],
        "autoJoinSpectator": false,
        "soundEnabled": false
      }
    },
    "updatedAt": 1640999400000
  },
  "message": "Profile updated successfully"
}
```

### Error Response - Validation Error (400)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "displayName",
      "message": "Display name must be between 1 and 100 characters"
    },
    {
      "field": "avatar",
      "message": "Avatar URL must be a valid URL"
    }
  ]
}
```

## Token Refresh

### Request
```bash
curl -X POST https://api.nbt.example.com/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ..."
  }'
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

## Logout

### Request
```bash
curl -X POST https://api.nbt.example.com/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ..."
  }'
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Password Reset Request

### Request
```bash
curl -X POST https://api.nbt.example.com/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com"
  }'
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Password reset instructions sent to your email"
}
```

## Password Reset Confirmation

### Request
```bash
curl -X POST https://api.nbt.example.com/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "resetCode": "123456",
    "newPassword": "NewSecurePass123!"
  }'
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Error Response - Invalid Code (400)
```json
{
  "success": false,
  "error": "Invalid or expired reset code"
}
```