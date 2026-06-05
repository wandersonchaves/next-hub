import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: exception.message || 'Internal server error' };

    // Format the message strictly for JSON
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      message = (exceptionResponse as any).message || JSON.stringify(exceptionResponse);
      error = (exceptionResponse as any).error || error;
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
       this.logger.error(`Unhandled Exception at ${request.url}: ${exception.message}`, exception.stack);
    }

    // STRICT JSON RESPONSE: Ensures no raw text leaks to the client
    return response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(process.env.NODE_ENV !== 'production' && { stack: exception.stack }),
    });
  }
}
