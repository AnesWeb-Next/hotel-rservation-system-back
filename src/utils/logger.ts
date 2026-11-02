/**
 * Simple logger utility
 * In production, replace with winston or pino
 */

const LOG_LEVELS = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
} as const;

type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

/**
 * Internal log function
 * Formats and outputs log entries
 */
function log(
  level: LogLevel,
  message: string,
  meta: Record<string, unknown> = {},
): void {
  const timestamp = new Date().toISOString();
  const logEntry: LogEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };

  if (process.env.NODE_ENV === "development") {
    console.log(JSON.stringify(logEntry, null, 2));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Logger object with methods for each log level
 */
export const logger = {
  error: (message: string, meta?: Record<string, unknown>) =>
    log(LOG_LEVELS.ERROR, message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    log(LOG_LEVELS.WARN, message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    log(LOG_LEVELS.INFO, message, meta),
  debug: (message: string, meta?: Record<string, unknown>) =>
    log(LOG_LEVELS.DEBUG, message, meta),
};
