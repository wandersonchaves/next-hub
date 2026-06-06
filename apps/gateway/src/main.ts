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

  // 2. PROXY ROUTING: Catch-all /api proxying with EXTENDED TIMEOUT
  // We use explicit configuration to avoid Gateway Timeout (504)
  const proxyOptions: any = {
    target: process.env.API_URL || 'http://127.0.0.1:3001',
    changeOrigin: true,
    proxyTimeout: 120000, 
    timeout: 120000,      
    onProxyRes: (proxyRes: any) => {
      if (proxyRes.statusCode === 504 || proxyRes.statusCode === 502) {
        proxyRes.headers['content-type'] = 'application/json';
      }
    },
    pathRewrite: {
      '^/api': '',
    },
  };

  app.use('/api', createProxyMiddleware(proxyOptions));

  const port = process.env.PORT || 4000;
  const host = '0.0.0.0';
  await app.listen(port, host);
  console.log(`Gateway is running on: http://localhost:${port} (Binding: ${host})`);
}
bootstrap();
