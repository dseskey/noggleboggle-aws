import validator from 'validator';

export function validateEmail(email: string): boolean {
  return validator.isEmail(email) && email.length <= 254;
}

export function validateUsername(username: string): boolean {
  // Username: 3-30 characters, alphanumeric and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
}

export function validatePassword(password: string): boolean {
  // At least 8 characters, at least one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

export function validateDisplayName(displayName: string): boolean {
  // 1-100 characters, allow letters, numbers, spaces, and basic punctuation
  const displayNameRegex = /^[a-zA-Z0-9\s\-_.]{1,100}$/;
  return displayNameRegex.test(displayName.trim());
}

export function sanitizeDisplayName(displayName: string): string {
  return displayName.trim().replace(/\s+/g, ' ');
}

export function validateGameCode(gameCode: string): boolean {
  // Game codes: 6-12 characters, alphanumeric only
  const gameCodeRegex = /^[A-Z0-9]{6,12}$/;
  return gameCodeRegex.test(gameCode);
}

export function validateQuestionText(text: string): boolean {
  // Question text: 10-1000 characters
  return text.trim().length >= 10 && text.trim().length <= 1000;
}

export function validateChatMessage(message: string): boolean {
  // Chat messages: 1-500 characters, no excessive whitespace
  const trimmed = message.trim();
  return trimmed.length >= 1 && trimmed.length <= 500 && !trimmed.includes('\n'.repeat(3));
}