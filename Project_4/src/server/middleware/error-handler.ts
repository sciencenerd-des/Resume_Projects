/**
 * Centralized Error Handling
 * Standardized error responses and logging
 */

// Custom error classes
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super("AUTHENTICATION_ERROR", message, 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super("AUTHORIZATION_ERROR", message, 403);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super("NOT_FOUND", `${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super("RATE_LIMITED", "Too many requests", 429, { retryAfter });
    this.name = "RateLimitError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(
      "EXTERNAL_SERVICE_ERROR",
      `External service error: ${service}`,
      502,
      { service, originalMessage: originalError?.message }
    );
    this.name = "ExternalServiceError";
  }
}

// Error response format
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

/**
 * Format error for API response
 */
export function formatErrorResponse(
  error: Error | AppError,
  requestId?: string
): ErrorResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
    };
  }

  // Generic error - don't expose internal details in production
  const isDev = process.env.NODE_ENV !== "production";

  return {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: isDev ? error.message : "An unexpected error occurred",
      details: isDev ? { stack: error.stack } : undefined,
      requestId,
    },
  };
}

/**
 * Get HTTP status code for error
 */
export function getErrorStatusCode(error: Error | AppError): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}

/**
 * Error handler middleware wrapper
 */
export function withErrorHandler(
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();

    try {
      const response = await handler(request);

      // Add request ID header
      const newHeaders = new Headers(response.headers);
      newHeaders.set("X-Request-ID", requestId);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      // Log error
      console.error(`[Error] Request ${requestId}:`, error);

      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error, requestId);

      return new Response(JSON.stringify(errorResponse), {
        status: statusCode,
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
        },
      });
    }
  };
}

/**
 * Async wrapper for route handlers
 */
export function asyncHandler<T extends unknown[]>(
  fn: (...args: T) => Promise<Response>
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Validate request body against a schema
 */
export function validateBody<T>(
  body: unknown,
  requiredFields: (keyof T)[],
  fieldTypes?: Partial<Record<keyof T, string>>
): T {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be an object");
  }

  const obj = body as Record<string, unknown>;
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (!(field as string in obj) || obj[field as string] === undefined) {
      errors.push(`Missing required field: ${String(field)}`);
    } else if (fieldTypes && fieldTypes[field]) {
      const expectedType = fieldTypes[field];
      const actualType = typeof obj[field as string];
      if (actualType !== expectedType) {
        errors.push(
          `Field ${String(field)} must be ${expectedType}, got ${actualType}`
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError("Validation failed", { errors });
  }

  return body as T;
}

/**
 * Parse JSON body with error handling
 */
export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    const text = await request.text();
    if (!text) {
      throw new ValidationError("Request body is empty");
    }
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError("Invalid JSON in request body");
  }
}
