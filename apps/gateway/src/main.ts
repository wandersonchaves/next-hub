import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. ISOLATION: Apply global prefix for all Gateway routes
  app.setGlobalPrefix('api');

  // 2. CORS PROTECTION: Targeted origin and preflight handling
  app.enableCors({
    origin: [
      'https://next-hub.up.railway.app',
      'http://localhost:3000', // Local development
      'http://127.0.0.1:3000'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Simple Proxying for the Monolithic API
  app.use(
    '/api/v1',
    createProxyMiddleware({
      target: process.env.API_URL || 'http://127.0.0.1:3001',
      changeOrigin: true,
      pathRewrite: {
        '^/api/v1': '',
      },
    }),
  );

  app.use(
    '/api-proxy',
    createProxyMiddleware({
      target: process.env.API_URL || 'http://127.0.0.1:3001',
      changeOrigin: true,
      pathRewrite: {
        '^/api-proxy': '',
      },
    }),
  );

  const port = process.env.PORT || 4000;
  const host = '0.0.0.0';
  await app.listen(port, host);
  console.log(`Gateway is running on: http://localhost:${port} (Binding: ${host})`);
}
bootstrap();
