import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Simple Proxying for the Monolithic API
  // In the future, this would route to different microservices
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.API_URL || 'http://localhost:3000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '',
      },
    }),
  );

  await app.listen(8080);
}
bootstrap();
