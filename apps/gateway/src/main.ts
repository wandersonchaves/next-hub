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
  const apiTarget = process.env.API_URL || 'http://127.0.0.1:3001';
  
  console.log(`[Gateway] Initialization...`);
  console.log(`[Gateway] API_URL Target: ${apiTarget}`);
  console.log(`[Gateway] Port Binding: ${process.env.PORT || 4000}`);

  const proxyOptions: any = {
    target: apiTarget,
    changeOrigin: true,
    ws: true, // Support WebSockets if needed
    proxyTimeout: 120000, 
    timeout: 120000,      
    onProxyReq: (proxyReq: any, req: any) => {
      // Ensure we don't drop the organization headers
      if (req.headers['x-organization-id']) {
        proxyReq.setHeader('x-organization-id', req.headers['x-organization-id']);
      }
      if (req.headers['x-company-id']) {
        proxyReq.setHeader('x-company-id', req.headers['x-company-id']);
      }
    },
    onProxyRes: (proxyRes: any) => {
      if (proxyRes.statusCode === 504 || proxyRes.statusCode === 502) {
        proxyRes.headers['content-type'] = 'application/json';
      }
    },
    onError: (err: any, req: any, res: any) => {
      console.error(`[Gateway Proxy Error] ${req.method} ${req.url} -> ${apiTarget}:`, err.message);
      
      if (!res.headersSent) {
        res.writeHead(504, { 'Content-Type': 'application/json' });
      }
      
      const responseBody = { 
        statusCode: 504, 
        message: 'O Gateway não conseguiu se comunicar com a API.',
        details: `O alvo ${apiTarget} não respondeu a tempo ou está inacessível.`,
        error: err.message,
        hint: 'Verifique se a variável API_URL no Railway do Gateway aponta para o endereço interno da API (ex: http://api.railway.internal:3001)'
      };
      
      res.end(JSON.stringify(responseBody));
    },
    pathRewrite: {
      '^/api': '',
    },
  };

  app.use('/api', createProxyMiddleware(proxyOptions));

  // Healthcheck for Gateway itself
  app.getHttpAdapter().get('/gateway-health', (req, res) => {
    res.status(200).json({ status: 'up', target: apiTarget });
  });

  const port = process.env.PORT || 4000;
  const host = '0.0.0.0';
  await app.listen(port, host);
  console.log(`Gateway is running on: http://localhost:${port} (Binding: ${host})`);
}
bootstrap();
