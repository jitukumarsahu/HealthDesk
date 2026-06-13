export class HttpError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = 'Bad Request') {
    super(message, 400);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}
