import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Target Discovery & Sanitization
  let apiTarget = process.env.API_URL || 'http://127.0.0.1:3001';
  if (!apiTarget.startsWith('http')) {
    apiTarget = `https://${apiTarget}`;
  }
  
  console.log(`[Gateway] Bootstrap Strategy:`);
  console.log(`[Gateway] API_URL Target: ${apiTarget}`);
  console.log(`[Gateway] Port Binding: ${process.env.PORT || 4000}`);

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

  // 3. PROXY ROUTING: Catch-all /api proxying with DIAGNOSTICS
  // NOTE: We do NOT use body-parser in the Gateway to avoid consuming the stream 
  // before it reaches the API. The 50MB limit is enforced at the API level.
  const proxyOptions: any = {
    target: apiTarget,
    changeOrigin: true,
    ws: true,
    proxyTimeout: 120000, 
    timeout: 120000,      
    onProxyReq: (proxyReq: any, req: any) => {
      console.log(`[Gateway Proxy] Forwarding: ${req.method} ${req.url} -> ${apiTarget}${req.url.replace('/api', '')}`);
      
      const orgId = req.headers['x-organization-id'] || req.headers['organization-id'] || req.headers['x-company-id'];
      if (orgId) {
        proxyReq.setHeader('x-organization-id', orgId);
        proxyReq.setHeader('x-company-id', orgId);
      }
    },
    onProxyRes: (proxyRes: any) => {
      if (proxyRes.statusCode >= 500) {
        proxyRes.headers['content-type'] = 'application/json';
      }
    },
    onError: (err: any, req: any, res: any) => {
      console.error(`[Gateway Critical Error] Failed to reach ${apiTarget}${req.url}:`, err.message);
      
      if (!res.headersSent) {
        res.writeHead(504, { 'Content-Type': 'application/json' });
      }
      
      res.end(JSON.stringify({ 
        statusCode: 504, 
        message: 'A comunicação entre o Gateway e a API falhou.',
        debug: {
            method: req.method,
            path: req.url,
            target: apiTarget,
            reason: err.message
        }
      }));
    },
    pathRewrite: {
      '^/api': '',
    },
  };

  app.use('/api', createProxyMiddleware(proxyOptions));

  app.getHttpAdapter().get('/gateway-health', (req, res) => {
    res.status(200).json({ 
        status: 'up', 
        target: apiTarget,
        env: process.env.NODE_ENV || 'development'
    });
  });

  const port = process.env.PORT || 4000;
  const host = '0.0.0.0';
  await app.listen(port, host);
  console.log(`Gateway is running on: http://localhost:${port} (Binding: ${host})`);
}
bootstrap();
