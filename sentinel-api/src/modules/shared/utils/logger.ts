import winston from 'winston';

// Keys that are part of Winston's internal log record — not user metadata.
const BUILT_IN_KEYS = new Set(['level', 'message', 'stack', 'timestamp', 'meta', 'service', 'label']);

// Handles Error objects and plain-object metadata passed as extra arguments:
//   logger.error('something failed', error)
//   logger.warn('retrying', error, { attempt, maxRetries })
//   logger.info('user connected', { userId })
//
// Without this, Winston merges the Error's own `message` property into info,
// silently overwriting the contextual message the caller wrote.
const errorAndMetaFormat = winston.format((info) => {
  const splat = (info as any)[Symbol.for('splat')] as unknown[] | undefined;

  if (splat?.length) {
    // Extract Error from splat
    const err = splat.find((item) => item instanceof Error) as Error | undefined;
    if (err) {
      const message = String(info.message);
      if (!message.includes(err.message)) {
        info.message = `${message}: ${err.message}`;
      }
      if (!info.stack) {
        info.stack = err.stack;
      }
    }

    // Extract last plain-object from splat as structured metadata.
    // Supports: logger.error('msg', error, { key }) and logger.info('msg', { key })
    const metaItems = splat.filter(
      (item) => item !== null && typeof item === 'object' && !(item instanceof Error)
    );
    const meta = metaItems[metaItems.length - 1] as Record<string, unknown> | undefined;
    if (meta && Object.keys(meta).length > 0) {
      info.meta = meta;
    }
  }

  return info;
})();

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    errorAndMetaFormat,
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf((info) => {
            const { timestamp, level, message, stack, meta } = info as any;

            // Pick up any inline metadata merged by Winston from logger.info('msg', { key })
            const inlineMeta = Object.fromEntries(
              Object.entries(info).filter(([key]) => !BUILT_IN_KEYS.has(key))
            );
            const allMeta = { ...inlineMeta, ...(meta as Record<string, unknown> | undefined) };
            const metaStr = Object.keys(allMeta).length > 0 ? ` ${JSON.stringify(allMeta)}` : '';

            return stack
              ? `${timestamp} [${level}]: ${message}${metaStr}\n${stack}`
              : `${timestamp} [${level}]: ${message}${metaStr}`;
          })
        )
  ),
  transports: [new winston.transports.Console()],
});
