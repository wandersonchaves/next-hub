import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. ISOLATION: Apply global prefix for all Gateway routes
  // This ensures the Gateway correctly maps /api/* and doesn't interfere with frontend assets
  app.setGlobalPrefix('api');

  // 2. CORS PROTECTION
  app.enableCors({
    origin: [
      'https://next-hub.up.railway.app',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    optionsSuccessStatus: 204,
  });

  // 3. PROXY ROUTING: Map incoming requests to the API
  // Since we have a global prefix 'api', this middleware will handle /api/v1/* etc.
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

  // Fallback for calls that use /api directly without versioning
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
