import { createApp } from './app';
import { loadConfig, loadDotEnv } from './config';
import { createLogger } from './lib/logger';

loadDotEnv();
const config = loadConfig();
const log = createLogger(config.logLevel, !config.isProd);
const app = createApp({ config, logger: log });

app
  .listen(config.port)
  .then((port) => {
    log.info(
      {
        port,
        cors: config.corsOrigins,
        search: app.provider.searchEnabled ? 'enabled' : 'disabled (no YOUTUBE_API_KEY)',
      },
      'jamwave server listening',
    );
  })
  .catch((error: unknown) => {
    log.error({ err: error }, 'failed to start');
    process.exit(1);
  });

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, 'shutting down');
  void app.close().then(() => process.exit(0));
  setTimeout(() => process.exit(0), 5_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
