import process from 'node:process';
import pino, { type Logger } from 'pino';

const logger: Logger = pino.default({
    base: { hostname: undefined, pid: undefined }, // This will remove pid and hostname but keep time
    level: process.env.LOG_LEVEL || 'debug',
});

export default logger;
