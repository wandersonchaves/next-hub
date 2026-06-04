import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. ISOLATION: Apply global prefix for all Gateway routes
  // This ensures the Gateway only handles /api/* and doesn't interfere with frontend assets
  app.setGlobalPrefix('api');

  // Simple Proxying for the Monolithic API
  app.use(
    '/api/v1', // Versioning the proxy to distinguish from Gateway internal routes if any
    createProxyMiddleware({
      target: process.env.API_URL || 'http://127.0.0.1:3001',
      changeOrigin: true,
      pathRewrite: {
        '^/api/v1': '',
      },
    }),
  );

  // Keep compatibility for /api direct proxy if needed by legacy frontend calls
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
