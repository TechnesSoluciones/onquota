/**
 * Conditional logging utility for development vs production
 *
 * In development: All logs are shown in console
 * In production: Only errors are logged (for monitoring services)
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  /**
   * Log informational messages (only in development)
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args)
    }
  },

  /**
   * Log informational messages with [INFO] prefix (only in development)
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args)
    }
  },

  /**
   * Log warning messages (only in development)
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },

  /**
   * Log error messages (always logged, can be sent to monitoring service)
   */
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args)

    // TODO: In production, send to error monitoring service (Sentry, LogRocket, etc.)
    // if (!isDev) {
    //   // Send to monitoring service
    // }
  },

  /**
   * Create a grouped set of logs (only in development)
   */
  group: (label: string, callback: () => void) => {
    if (isDev) {
      console.group(label)
      callback()
      console.groupEnd()
    }
  },
}
