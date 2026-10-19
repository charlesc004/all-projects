import { createApp } from './app';

void createApp()
  .then((app) => app.listen(Number(process.env.PORT ?? 4000), '0.0.0.0'))
  .catch((error) => {
    console.error(
      'API startup failed. Check environment variables and database availability.',
      error instanceof Error ? error.message : 'Unknown error',
    );
    process.exitCode = 1;
  });
