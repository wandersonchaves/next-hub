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
      target: process.env.API_URL || 'http://127.0.0.1:3001',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '',
      },
    }),
  );

  const port = process.env.PORT || 8080;
  const host = '0.0.0.0';
  await app.listen(port, host);
  console.log(`Gateway is running on: http://localhost:${port} (Binding: ${host})`);
}
bootstrap();
