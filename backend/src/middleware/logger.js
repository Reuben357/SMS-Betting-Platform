const pino = require('pino');
const pinoHttp = require('pino-http');

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
    level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
    timestamp: pino.stdTimeFunctions.isoTime,
    base: { service: 'multitips-backend' },
    // Prod: plain JSON to stdout -- docker logs / any log shipper can read it.
    // Dev: pretty-printed, human readable, via pino-pretty.
    transport: isProd
        ? undefined
        : {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' },
        },
});

const httpLogger = pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
    // Don't log full request/response bodies -- avoid leaking M-Pesa
    // payloads, phone numbers, or Authorization tokens into logs.
    serializers: {
        req: (req) => ({ method: req.method, url: req.url, id: req.id }),
        res: (res) => ({ statusCode: res.statusCode }),
    },
});

// Catch anything that would otherwise crash the process silently or
// produce an unlogged 500 (e.g. a rejected promise that isn't awaited
// anywhere, or an error thrown outside Express's own error pipeline).
process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
});

module.exports = { logger, httpLogger };