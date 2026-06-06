import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. CORS PROTECTION
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

  // 2. PROXY ROUTING: Standardizing on /api prefix for the Monolith
  // This matches the Next.js rewrite destination
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.API_URL || 'http://127.0.0.1:3001',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // Remove /api before sending to the NestJS API which has no global prefix
      },
    }),
  );

  const port = process.env.PORT || 4000;
  const host = '0.0.0.0';
  await app.listen(port, host);
  console.log(`Gateway is running on: http://localhost:${port} (Binding: ${host})`);
}
bootstrap();
