import { ErrorCodes } from '../exceptions/error-codes';

export const ErrorMessages = {
  [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCodes.EMAIL_ALREADY_EXISTS]: 'Email already exists',
  [ErrorCodes.INVALID_TOKEN]: 'Invalid or expired token',
  [ErrorCodes.TOKEN_EXPIRED]: 'Token has expired',
  [ErrorCodes.USER_NOT_FOUND]: 'User not found',
  [ErrorCodes.INVALID_USER_DATA]: 'Invalid user data provided',
  [ErrorCodes.VALIDATION_ERROR]: 'Validation error',
  [ErrorCodes.DATABASE_ERROR]: 'Database error occurred',
  [ErrorCodes.UNIQUE_CONSTRAINT]: 'Unique constraint violation',
  [ErrorCodes.BAD_REQUEST]: 'Bad request',
  [ErrorCodes.NOT_FOUND]: 'Resource not found',
  [ErrorCodes.UNAUTHORIZED]: 'Unauthorized access',
  [ErrorCodes.FORBIDDEN]: 'Access forbidden',
} as const;
