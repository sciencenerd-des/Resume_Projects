/**
 * Logging Service
 * Structured logging with levels and context
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
  duration?: number;
}

interface LoggerConfig {
  level: LogLevel;
  pretty: boolean;
  includeTimestamp: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m", // Green
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
};

const RESET_COLOR = "\x1b[0m";

class Logger {
  private config: LoggerConfig;
  private context: Record<string, unknown> = {};

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || "info",
      pretty: process.env.NODE_ENV !== "production",
      includeTimestamp: true,
      ...config,
    };
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): Logger {
    const child = new Logger(this.config);
    child.context = { ...this.context, ...context };
    return child;
  }

  /**
   * Log a message
   */
  log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
    };

    if (this.config.pretty) {
      this.prettyPrint(entry);
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Pretty print log entry for development
   */
  private prettyPrint(entry: LogEntry): void {
    const color = LOG_COLORS[entry.level];
    const levelStr = entry.level.toUpperCase().padEnd(5);

    let output = "";

    if (this.config.includeTimestamp) {
      const time = entry.timestamp.split("T")[1].split(".")[0];
      output += `\x1b[90m${time}${RESET_COLOR} `;
    }

    output += `${color}${levelStr}${RESET_COLOR} `;
    output += entry.message;

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` ${color}${JSON.stringify(entry.context)}${RESET_COLOR}`;
    }

    console.log(output);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context);
  }

  /**
   * Log an error with stack trace
   */
  errorWithStack(message: string, error: Error, context?: Record<string, unknown>): void {
    this.log("error", message, {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }

  /**
   * Create a request logger
   */
  request(requestId: string, userId?: string): RequestLogger {
    return new RequestLogger(this, requestId, userId);
  }
}

/**
 * Request-scoped logger
 */
class RequestLogger {
  private logger: Logger;
  private requestId: string;
  private userId?: string;
  private startTime: number;

  constructor(logger: Logger, requestId: string, userId?: string) {
    this.logger = logger.child({ requestId, userId });
    this.requestId = requestId;
    this.userId = userId;
    this.startTime = Date.now();
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.logger.info(message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.logger.error(message, context);
  }

  /**
   * Log request completion with duration
   */
  complete(status: number, context?: Record<string, unknown>): void {
    const duration = Date.now() - this.startTime;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    this.logger.log(level, "Request completed", {
      ...context,
      status,
      duration: `${duration}ms`,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export request logging middleware
export function requestLogger(): (
  handler: (request: Request) => Promise<Response>
) => (request: Request) => Promise<Response> {
  return (handler) => async (request) => {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    const reqLogger = logger.request(requestId);

    reqLogger.info(`${request.method} ${url.pathname}`, {
      query: Object.fromEntries(url.searchParams),
      userAgent: request.headers.get("user-agent"),
    });

    try {
      const response = await handler(request);

      // Add request ID to response headers
      const newHeaders = new Headers(response.headers);
      newHeaders.set("X-Request-ID", requestId);

      reqLogger.complete(response.status);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      reqLogger.error("Request failed", {
        error: (error as Error).message,
      });
      throw error;
    }
  };
}

export default logger;
