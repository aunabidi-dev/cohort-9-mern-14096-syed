import pino from 'pino';
import pinoHttp from 'pino-http';
import config from '../config';

export const logger = pino({
  name: 'notes-api',
  level: process.env.LOG_LEVEL || (config.nodeEnv === 'test' ? 'silent' : 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-auth-token"]',
      'req.body.password',
      'req.body.token',
      'res.headers["set-cookie"]',
      'body.password',
      'body.token',
      'password',
      'token',
      'secret',
      'authorization',
      '*.password',
      '*.token',
      '*.secret',
      '*.authorization',
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
});
