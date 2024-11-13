import { HttpStatus } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception';
import { ErrorCodes } from '../exceptions/error-codes';
import { ErrorMessages } from '../constants/error-messages';

export class ExceptionUtil {
  static throw(
    code: keyof typeof ErrorCodes,
    details?: any,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    throw new AppException(
      ErrorCodes[code],
      ErrorMessages[ErrorCodes[code]],
      details,
      status,
    );
  }
}
