import winston from 'winston';

// Handles Error objects passed as the second argument to any logger call
// e.g. logger.error('something failed', error)
// Without this, Winston merges the Error's own `message` property into info,
// silently overwriting the contextual message the caller wrote.
const errorMetaFormat = winston.format((info) => {
  const splat = (info as any)[Symbol.for('splat')] as unknown[] | undefined;
  const err = splat?.find((item) => item instanceof Error) as Error | undefined;
  if (err) {
    const message = String(info.message);
    if (!message.includes(err.message)) {
      info.message = `${message}: ${err.message}`;
    }
    if (!info.stack) {
      info.stack = err.stack;
    }
  }
  return info;
})();

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    errorMetaFormat,
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, stack }) => {
            return stack
              ? `${timestamp} [${level}]: ${message}\n${stack}`
              : `${timestamp} [${level}]: ${message}`;
          })
        )
  ),
  transports: [new winston.transports.Console()],
});
