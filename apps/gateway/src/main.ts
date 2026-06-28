import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { ClientRequest, IncomingMessage } from 'http';
import { Request, Response } from 'express';

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
      'http://127.0.0.1:8080',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    optionsSuccessStatus: 204,
  });

  // 3. PROXY ROUTING: Catch-all /api proxying with DIAGNOSTICS
  // NOTE: We do NOT use body-parser in the Gateway to avoid consuming the stream
  // before it reaches the API. The 50MB limit is enforced at the API level.
  const proxyOptions: Options = {
    target: apiTarget,
    changeOrigin: true,
    ws: true,
    proxyTimeout: 120000,
    timeout: 120000,
    on: {
      proxyReq: (proxyReq: ClientRequest, req: IncomingMessage) => {
        const expressReq = req as Request;
        console.log(
          `[Gateway Proxy] Forwarding: ${expressReq.method} ${expressReq.url} -> ${apiTarget}${expressReq.url?.replace('/api', '')}`,
        );

        const orgId =
          expressReq.headers['x-organization-id'] ||
          expressReq.headers['organization-id'] ||
          expressReq.headers['x-company-id'];
        if (orgId) {
          const value = Array.isArray(orgId) ? orgId[0] : orgId;
          proxyReq.setHeader('x-organization-id', value);
          proxyReq.setHeader('x-company-id', value);
        }
      },
      proxyRes: (proxyRes: IncomingMessage) => {
        if (proxyRes.statusCode && proxyRes.statusCode >= 500) {
          proxyRes.headers['content-type'] = 'application/json';
        }
      },
      error: (err: Error, req: IncomingMessage, res: any) => {
        const expressRes = res as Response;
        console.error(
          `[Gateway Critical Error] Failed to reach ${apiTarget}${req.url}:`,
          err.message,
        );

        if (!expressRes.headersSent) {
          expressRes.writeHead(504, { 'Content-Type': 'application/json' });
        }

        expressRes.end(
          JSON.stringify({
            statusCode: 504,
            message: 'A comunicação entre o Gateway e a API falhou.',
            debug: {
              method: req.method,
              path: req.url,
              target: apiTarget,
              reason: err.message,
            },
          }),
        );
      },
    },
    pathRewrite: {
      '^/api': '',
    },
  };

  app.use('/api', createProxyMiddleware(proxyOptions));

  app.getHttpAdapter().get('/gateway-health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'up',
      target: apiTarget,
      env: process.env.NODE_ENV || 'development',
    });
  });

  const port = process.env.PORT || 4000;
  const host = '0.0.0.0';
  await app.listen(port, host);
  console.log(
    `Gateway is running on: http://localhost:${port} (Binding: ${host})`,
  );
}
bootstrap();

