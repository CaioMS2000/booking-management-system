# 🚀 **Plataforma de Reservas de Espaços** (by Claude)

---

# 📐 **ARQUITETURA COMPLETA (REVISADA)**

```
┌─────────────────────────────────────────────────────────────────┐
│                         CAMADA EXTERNA                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  Web App │  │ Mobile   │  │  Tablet  │  │  Admin   │         │
│  │ (React)  │  │(React N.)│  │  App     │  │  Panel   │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │             │             │             │               │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
┌─────────────────────┼─────────────────────────────────────────┐
│                CAMADA DE EDGE                                 │
├─────────────────────┼─────────────────────────────────────────┤
│                     ↓                                         │
│            ┌─────────────────┐                                │
│            │  CDN (Cloudflare│                                │
│            │    ou AWS CF)   │                                │
│            └────────┬────────┘                                │
│                     ↓                                         │
│            ┌─────────────────┐                                │
│            │  WAF (Web App   │                                │
│            │   Firewall)     │                                │
│            └────────┬────────┘                                │
│                     ↓                                         │
│            ┌─────────────────┐                                │
│            │  Load Balancer  │                                │
│            │   (AWS ALB ou   │                                │
│            │    Nginx)       │                                │
│            └────────┬────────┘                                │
└─────────────────────┼─────────────────────────────────────────┘
                      │
┌─────────────────────┼─────────────────────────────────────────┐
│          CAMADA DE REVERSE PROXY (SIMPLES)                    │
├─────────────────────┼─────────────────────────────────────────┤
│                     ↓                                         │
│       ┌──────────────────────────────┐                        │
│       │    Nginx (Reverse Proxy)     │                        │
│       │                              │                        │
│       │ • SSL/TLS Termination        │                        │
│       │ • Routing (/api/reservas)    │                        │
│       │ • Load Balancing             │                        │
│       │ • Compression (gzip/brotli)  │                        │
│       │ • Static file serving        │                        │
│       │ • Request logging            │                        │
│       │                              │                        │
│       │ SEM: Auth, Rate Limit, CORS  │  ← MS fazem isso!      │
│       └──────────┬───────────────────┘                        │
└──────────────────┼────────────────────────────────────────────┘
                   │
┌──────────────────┼────────────────────────────────────────────────────────┐
│              CAMADA DE BFF (OPCIONAL INICIAL)                             │
├──────────────────┼────────────────────────────────────────────────────────┤
│                  │                                                        │
│    ┌─────────────┼──────────────┐                                         │
│    │             │              │                                         │
│    ↓             ↓              ↓                                         │
│ ┌────────┐  ┌────────┐  ┌──────────┐                                      │
│ │BFF Web │  │BFF Mob.│  │BFF Admin │                                      │
│ │(Node)  │  │(Node)  │  │(Node)    │                                      │
│ │        │  │        │  │          │                                      │
│ │        │  │        │  │          │   ← CADA UM VALIDA JWT INDEPENDENTE  │
│ └───┬────┘  └──┬─────┘  └────┬─────┘                                      │
└─────┼──────────┼─────────────┼────────────────────────────────────────────┘
      │          │             │
      └──────────┴─────────────┘
                 │
┌────────────────┼─────────────────────────────────────────────┐
│          CAMADA DE MICROSERVIÇOS                              │
├────────────────┼─────────────────────────────────────────────┤
│                │                                              │
│    ┌───────────┼───────────────┐                              │
│    │           │               │                              │
│    ↓           ↓               ↓                              │
│ ┌─────────────────────────────────────────────┐              │
│ │  MS1: Reservas & Disponibilidade            │              │
│ │  (NestJS + TypeScript)                      │              │
│ │                                             │              │
│ │  ✅ JWT Validation (JwtAuthGuard)           │              │
│ │  ✅ Rate Limiting (por IP/user)             │              │
│ │  ✅ CORS                                    │              │
│ │  ✅ Input Validation                        │              │
│ │  ✅ Authorization (regras de negócio)       │              │
│ │                                             │              │
│ │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │              │
│ │  │Instance 1│  │Instance 2│  │Instance 3│   │              │
│ │  └──────────┘  └──────────┘  └──────────┘   │              │
│ │  ┌──────────────────────────────────────┐   │              │
│ │  │ PostgreSQL (Primary + Replicas)      │   │              │
│ │  └──────────────────────────────────────┘   │              │
│ │  ┌──────────────────────────────────────┐   │              │
│ │  │ Redis Cluster (Cache + Sessions)     │   │              │
│ │  └──────────────────────────────────────┘   │              │
│ └─────────────────────────────────────────────┘              │
│                                                               │
│ ┌──────────────────────────────────────────────┐              │
│ │  MS2: Pagamentos & Cobranças                 │              │
│ │  (NestJS + TypeScript)                       │              │
│ │                                              │              │
│ │  ✅ JWT Validation (independente)            │              │
│ │  ✅ Rate Limiting                            │              │
│ │  ✅ CORS                                     │              │
│ │  ✅ Idempotência (evitar cobranças duplas)   │              │
│ │                                              │              │
│ │  ┌──────────┐  ┌──────────┐                  │              │
│ │  │Instance 1│  │Instance 2│                  │              │
│ │  └──────────┘  └──────────┘                  │              │
│ │  ┌──────────────────────────────────────┐   │              │
│ │  │ PostgreSQL (Primary + Replicas)      │   │              │
│ │  └──────────────────────────────────────┘   │              │
│ │  ┌──────────────────────────────────────┐   │              │
│ │  │ Redis Cluster (Idempotency cache)    │   │              │
│ │  └──────────────────────────────────────┘   │              │
│ └──────────────────────────────────────────────┘              │
│                                                               │
│ ┌──────────────────────────────────────────────┐              │
│ │  MS3: Notificações                           │              │
│ │  (NestJS + TypeScript)                       │              │
│ │                                              │              │
│ │  ✅ JWT Validation                           │              │
│ │  ✅ Rate Limiting (anti-spam)                │              │
│ │                                              │              │
│ │  • Email (SendGrid)                          │              │
│ │  • SMS (Twilio)                              │              │
│ │  • Push Notifications (Firebase)             │              │
│ │  ┌──────────────────────────────────────┐   │              │
│ │  │ MongoDB (Histórico de notificações)  │   │              │
│ │  └──────────────────────────────────────┘   │              │
│ └──────────────────────────────────────────────┘              │
│                                                               │
│ ┌──────────────────────────────────────────────┐              │
│ │  MS4: Gestão de Usuários & Auth              │              │
│ │  (NestJS + TypeScript)                       │              │
│ │                                              │              │
│ │  ✅ JWT Generation                           │              │
│ │  ✅ Refresh Token                            │              │
│ │  ✅ OAuth2 (Google, Facebook)                │              │
│ │  ✅ MFA (Two-Factor Auth)                    │              │
│ │  ✅ Rate Limiting (anti-brute force)         │              │
│ │                                              │              │
│ │  ┌──────────────────────────────────────┐   │              │
│ │  │ PostgreSQL                           │   │              │
│ │  └──────────────────────────────────────┘   │              │
│ │  ┌──────────────────────────────────────┐   │              │
│ │  │ Redis (Sessions, Refresh Tokens)     │   │              │
│ │  └──────────────────────────────────────┘   │              │
│ └──────────────────────────────────────────────┘              │
└───────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────┼───────────────────────────────────────┐
│            CAMADA DE MENSAGERIA & EVENTOS                     │
├───────────────────────┼───────────────────────────────────────┤
│                       ↓                                       │
│          ┌─────────────────────────┐                          │
│          │  Event Bus (RabbitMQ)   │                          │
│          │                         │                          │
│          │  Exchanges & Queues:    │                          │
│          │  • reservas.events      │                          │
│          │  • pagamentos.events    │                          │
│          │  • notificacoes.events  │                          │
│          │                         │                          │
│          │  Dead Letter Queue:     │                          │
│          │  • failed.events        │                          │
│          └─────────────────────────┘                          │
└───────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────┼───────────────────────────────────────┐
│         CAMADA DE OBSERVABILIDADE                             │
├───────────────────────┼───────────────────────────────────────┤
│                       │                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Prometheus   │  │   Grafana    │  │    Jaeger    │        │
│  │  (Metrics)   │  │ (Dashboards) │  │  (Tracing)   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                               │
│  ┌──────────────────────────────────────────────────┐         │
│  │  ELK Stack (Elasticsearch, Logstash, Kibana)    │         │
│  │  (Logs Centralizados)                           │         │
│  └──────────────────────────────────────────────────┘         │
│                                                               │
│  ┌──────────────────────────────────────────────────┐         │
│  │  Sentry (Error Tracking & Performance)          │         │
│  └──────────────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────────────┘
```

---

# 🔧 **COMPONENTES DETALHADOS (REVISADOS)**

## **1. CAMADA DE REVERSE PROXY (Nginx - Simples e Eficiente)**

### **Nginx Configuration**

```nginx
# /etc/nginx/nginx.conf

# Performance tuning
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
    
    # Logging
    log_format main_ext '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent" "$http_x_forwarded_for" '
                        'rt=$request_time uct="$upstream_connect_time" '
                        'uht="$upstream_header_time" urt="$upstream_response_time"';
    
    access_log /var/log/nginx/access.log main_ext;
    error_log /var/log/nginx/error.log warn;
    
    # Upstream - MS1 Reservas
    upstream ms1_reservas {
        least_conn;  # Algoritmo de balanceamento
        
        server ms1-instance-1:3000 max_fails=3 fail_timeout=30s weight=1;
        server ms1-instance-2:3000 max_fails=3 fail_timeout=30s weight=1;
        server ms1-instance-3:3000 max_fails=3 fail_timeout=30s weight=1;
        
        keepalive 32;  # Conexões persistentes
    }
    
    # Upstream - MS2 Pagamentos
    upstream ms2_pagamentos {
        least_conn;
        
        server ms2-instance-1:3001 max_fails=3 fail_timeout=30s;
        server ms2-instance-2:3001 max_fails=3 fail_timeout=30s;
        
        keepalive 32;
    }
    
    # Upstream - MS3 Notificações
    upstream ms3_notificacoes {
        server ms3-instance-1:3002 max_fails=3 fail_timeout=30s;
        
        keepalive 16;
    }
    
    # Upstream - MS4 Auth
    upstream ms4_auth {
        least_conn;
        
        server ms4-instance-1:3003 max_fails=3 fail_timeout=30s;
        server ms4-instance-2:3003 max_fails=3 fail_timeout=30s;
        
        keepalive 32;
    }
    
    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name api.reservas.com;
        return 301 https://$server_name$request_uri;
    }
    
    # Main HTTPS server
    server {
        listen 443 ssl http2;
        server_name api.reservas.com;
        
        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # Request size limits
        client_max_body_size 10M;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Proxy headers (padrão)
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;  # Para tracing
        
        # Health check endpoint (Nginx não valida auth aqui)
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        # MS1 - Reservas (SEM validação de auth no Nginx)
        location /api/v1/reservas {
            proxy_pass http://ms1_reservas;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }
        
        location /api/v1/espacos {
            proxy_pass http://ms1_reservas;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }
        
        location /api/v1/disponibilidade {
            proxy_pass http://ms1_reservas;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }
        
        # MS2 - Pagamentos
        location /api/v1/pagamentos {
            proxy_pass http://ms2_pagamentos;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }
        
        # Webhook do Stripe (público, sem auth)
        location /api/v1/webhooks/stripe {
            proxy_pass http://ms2_pagamentos;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }
        
        # MS3 - Notificações
        location /api/v1/notificacoes {
            proxy_pass http://ms3_notificacoes;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }
        
        # MS4 - Auth (público para login/registro)
        location /api/v1/auth {
            proxy_pass http://ms4_auth;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }
        
        location /api/v1/users {
            proxy_pass http://ms4_auth;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }
    }
}
```

**Por que Nginx simples?**
- ✅ SSL/TLS termination
- ✅ Load balancing entre instâncias
- ✅ Compressão
- ✅ Static file serving
- ✅ Request logging para observabilidade
- ❌ **NÃO** valida JWT (MS fazem isso)
- ❌ **NÃO** faz rate limiting (MS fazem isso)
- ❌ **NÃO** faz CORS (MS fazem isso)

---

## **2. CAMADA DE MICROSERVIÇOS (COM VALIDAÇÃO INDEPENDENTE)**

### **MS1 - Reservas (Exemplo Completo)**

#### **Estrutura do Projeto**

```
ms1-reservas/
├── src/
│   ├── modules/
│   │   ├── reservas/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── reserva.entity.ts
│   │   │   │   │   └── disponibilidade.entity.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── periodo-reserva.vo.ts
│   │   │   │   │   └── status-reserva.vo.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   └── reservas.repository.interface.ts
│   │   │   │   └── events/
│   │   │   │       ├── reserva-criada.event.ts
│   │   │   │       ├── reserva-confirmada.event.ts
│   │   │   │       └── reserva-cancelada.event.ts
│   │   │   ├── application/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── criar-reserva/
│   │   │   │   │   │   ├── criar-reserva.command.ts
│   │   │   │   │   │   └── criar-reserva.handler.ts
│   │   │   │   │   ├── cancelar-reserva/
│   │   │   │   │   │   ├── cancelar-reserva.command.ts
│   │   │   │   │   │   └── cancelar-reserva.handler.ts
│   │   │   │   │   └── confirmar-reserva/
│   │   │   │   │       ├── confirmar-reserva.command.ts
│   │   │   │   │       └── confirmar-reserva.handler.ts
│   │   │   │   ├── queries/
│   │   │   │   │   ├── obter-reserva/
│   │   │   │   │   │   ├── obter-reserva.query.ts
│   │   │   │   │   │   └── obter-reserva.handler.ts
│   │   │   │   │   └── listar-reservas/
│   │   │   │   │       ├── listar-reservas.query.ts
│   │   │   │   │       └── listar-reservas.handler.ts
│   │   │   │   └── sagas/
│   │   │   │       └── reserva.saga.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── persistence/
│   │   │   │   │   ├── typeorm/
│   │   │   │   │   │   ├── entities/
│   │   │   │   │   │   │   └── reserva.schema.ts
│   │   │   │   │   │   └── repositories/
│   │   │   │   │   │       └── reservas.repository.ts
│   │   │   │   ├── messaging/
│   │   │   │   │   └── rabbitmq/
│   │   │   │   │       ├── publishers/
│   │   │   │   │       │   └── reserva-events.publisher.ts
│   │   │   │   │       └── consumers/
│   │   │   │   │           └── pagamento-events.consumer.ts
│   │   │   │   └── http/
│   │   │   │       └── clients/
│   │   │   │           └── pagamentos.client.ts
│   │   │   └── presentation/
│   │   │       ├── controllers/
│   │   │       │   ├── reservas.controller.ts
│   │   │       │   └── disponibilidade.controller.ts
│   │   │       └── dto/
│   │   │           ├── criar-reserva.dto.ts
│   │   │           └── atualizar-reserva.dto.ts
│   │   ├── espacos/
│   │   └── clientes/
│   ├── shared/
│   │   ├── auth/
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts        ← MS1 valida JWT
│   │   │   │   └── roles.guard.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   └── decorators/
│   │   │       ├── current-user.decorator.ts
│   │   │       └── roles.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── timeout.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── middleware/
│   │       └── rate-limit.middleware.ts     ← MS1 faz rate limiting
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── rabbitmq.config.ts
│   │   └── jwt.config.ts
│   └── main.ts
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docker/
    └── Dockerfile
```

#### **main.ts - Bootstrap do MS1**

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ========================================
  // SEGURANÇA - MS1 É RESPONSÁVEL
  // ========================================
  
  // Helmet - Headers de segurança
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS - MS1 controla quem pode acessar
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: 3600,
  });

  // Rate Limiting - MS1 protege contra abuso
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // Máximo 100 requests por IP
      message: 'Muitas requisições deste IP, tente novamente em 15 minutos',
      standardHeaders: true,
      legacyHeaders: false,
      // Store em Redis para distribuir entre instâncias
      store: new RedisStore({
        client: redisClient,
        prefix: 'rl:',
      }),
    }),
  );

  // Compression
  app.use(compression());

  // ========================================
  // VALIDAÇÃO GLOBAL
  // ========================================
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove campos não declarados no DTO
      forbidNonWhitelisted: true, // Erro se enviar campo não permitido
      transform: true, // Transforma payloads em DTOs
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ========================================
  // DOCUMENTAÇÃO (Swagger)
  // ========================================
  
  const config = new DocumentBuilder()
    .setTitle('MS1 - Reservas API')
    .setDescription('API de gestão de reservas e disponibilidade')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Reservas', 'Endpoints de reservas')
    .addTag('Espacos', 'Endpoints de espaços')
    .addTag('Disponibilidade', 'Endpoints de consulta de disponibilidade')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ========================================
  // HEALTH CHECK
  // ========================================
  
  app.use('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ms1-reservas',
      version: process.env.npm_package_version,
    });
  });

  // ========================================
  // GRACEFUL SHUTDOWN
  // ========================================
  
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 MS1 - Reservas rodando na porta ${port}`);
  logger.log(`📚 Documentação disponível em http://localhost:${port}/api/docs`);
  logger.log(`✅ Health check em http://localhost:${port}/health`);
}

bootstrap();
```

#### **JWT Guard - MS1 Valida Independentemente**

```typescript
// src/shared/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Verificar se rota é pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }

    // Validar JWT normalmente
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido ou expirado');
    }
    return user;
  }
}

// src/shared/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: any) {
    // Aqui você pode fazer validações adicionais
    // Ex: verificar se user ainda existe no DB, se está ativo, etc.
    
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Token malformado');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions || [],
    };
  }
}
```

#### **Controller com Validação de Auth e Autorização**

```typescript
// src/modules/reservas/presentation/controllers/reservas.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/auth/guards/roles.guard';
import { Roles } from '@/shared/auth/decorators/roles.decorator';
import { CurrentUser } from '@/shared/auth/decorators/current-user.decorator';
import { Public } from '@/shared/auth/decorators/public.decorator';

@ApiTags('Reservas')
@Controller('api/v1/reservas')
@UseGuards(JwtAuthGuard, RolesGuard)  // ← MS1 valida JWT
@ApiBearerAuth('JWT-auth')
export class ReservasController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // ========================================
  // CRIAR RESERVA (autenticado)
  // ========================================
  
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova reserva' })
  @ApiResponse({ status: 201, description: 'Reserva criada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Espaço não disponível' })
  async criarReserva(
    @Body() dto: CriarReservaDto,
    @CurrentUser() user: User,  // ← Extraído do JWT validado
  ) {
    // MS1 valida autorização (regra de negócio)
    // Ex: user pode criar reserva para ele mesmo ou se for admin
    
    const command = new CriarReservaCommand({
      ...dto,
      clienteId: user.id, // Usa ID do token (não confia no body!)
    });
    
    return this.commandBus.execute(command);
  }

  // ========================================
  // OBTER RESERVA (com autorização granular)
  // ========================================
  
  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma reserva' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Reserva encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Reserva não encontrada' })
  async obterReserva(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const query = new ObterReservaQuery(id);
    const reserva = await this.queryBus.execute(query);
    
    // ========================================
    // AUTORIZAÇÃO - MS1 DECIDE QUEM VÊ O QUÊ
    // ========================================
    
    // User só pode ver suas próprias reservas (ou se for admin)
    if (reserva.clienteId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Você não tem permissão para ver esta reserva');
    }
    
    return reserva;
  }

  // ========================================
  // LISTAR RESERVAS (filtrado por user)
  // ========================================
  
  @Get()
  @ApiOperation({ summary: 'Listar reservas do usuário' })
  async listarReservas(
    @Query() filters: ListarReservasDto,
    @CurrentUser() user: User,
  ) {
    // User normal só vê suas reservas
    // Admin vê todas
    const query = new ListarReservasQuery({
      ...filters,
      clienteId: user.role === 'ADMIN' ? filters.clienteId : user.id,
    });
    
    return this.queryBus.execute(query);
  }

  // ========================================
  // CANCELAR RESERVA (com validação de regra de negócio)
  // ========================================
  
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancelar reserva' })
  async cancelarReserva(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    // Buscar reserva primeiro
    const query = new ObterReservaQuery(id);
    const reserva = await this.queryBus.execute(query);
    
    // Validar autorização
    if (reserva.clienteId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Você não pode cancelar esta reserva');
    }
    
    // Validar regra de negócio (cancelamento até 24h antes)
    const horasAteReserva = differenceInHours(reserva.dataInicio, new Date());
    if (horasAteReserva < 24 && user.role !== 'ADMIN') {
      throw new BadRequestException(
        'Cancelamento deve ser feito com pelo menos 24 horas de antecedência',
      );
    }
    
    const command = new CancelarReservaCommand(id, user.id);
    await this.commandBus.execute(command);
  }

  // ========================================
  // ENDPOINT PÚBLICO (sem autenticação)
  // ========================================
  
  @Public()  // ← Decorator para marcar rota como pública
  @Get('espacos/:id/disponibilidade')
  @ApiOperation({ summary: 'Consultar disponibilidade de um espaço (público)' })
  async consultarDisponibilidade(
    @Param('id') espacoId: string,
    @Query() dto: ConsultarDisponibilidadeDto,
  ) {
    // Endpoint público - qualquer pessoa pode consultar
    const query = new ConsultarDisponibilidadeQuery(espacoId, dto);
    return this.queryBus.execute(query);
  }

  // ========================================
  // ADMIN ONLY (role-based authorization)
  // ========================================
  
  @Get('admin/dashboard')
  @Roles('ADMIN')  // ← Só admins podem acessar
  @ApiOperation({ summary: 'Dashboard administrativo' })
  async dashboard() {
    const query = new ObterDashboardQuery();
    return this.queryBus.execute(query);
  }
}
```

#### **Rate Limiting por Endpoint (Avançado)**

```typescript
// src/shared/decorators/rate-limit.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  points: number;  // Número de requests permitidos
  duration: number;  // Duração da janela (em segundos)
  keyPrefix?: string;
}

export const RateLimit = (options: RateLimitOptions) => 
  SetMetadata(RATE_LIMIT_KEY, options);

// src/shared/guards/rate-limit.guard.ts
import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private rateLimiters: Map<string, RateLimiterRedis> = new Map();

  constructor(
    private reflector: Reflector,
    private redisClient: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!options) {
      return true;  // Sem rate limit definido
    }

    const request = context.switchToHttp().getRequest();
    const key = this.getKey(request, options.keyPrefix);

    const rateLimiter = this.getRateLimiter(options);

    try {
      await rateLimiter.consume(key);
      return true;
    } catch (rejRes) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Muitas requisições. Tente novamente mais tarde.',
          retryAfter: Math.ceil(rejRes.msBeforeNext / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private getKey(request: any, prefix?: string): string {
    // Pode usar IP, userId, ou combinação
    const userId = request.user?.id;
    const ip = request.ip;
    
    const base = userId || ip;
    return prefix ? `${prefix}:${base}` : base;
  }

  private getRateLimiter(options: RateLimitOptions): RateLimiterRedis {
    const key = `${options.keyPrefix || 'default'}:${options.points}:${options.duration}`;
    
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(
        key,
        new RateLimiterRedis({
          storeClient: this.redisClient,
          keyPrefix: options.keyPrefix || 'rl',
          points: options.points,
          duration: options.duration,
        }),
      );
    }

    return this.rateLimiters.get(key)!;
  }
}

// Uso no controller
@Controller('api/v1/reservas')
export class ReservasController {
  
  @Post()
  @RateLimit({ points: 10, duration: 60 })  // Máx 10 reservas por minuto
  async criarReserva(@Body() dto: CriarReservaDto) {
    // ...
  }
  
  @Get()
  @RateLimit({ points: 100, duration: 60 })  // Máx 100 consultas por minuto
  async listarReservas() {
    // ...
  }
}
```

---

## **3. CQRS + Event Sourcing + Saga Pattern**

### **Command Handler (Criar Reserva)**

```typescript
// src/modules/reservas/application/commands/criar-reserva/criar-reserva.handler.ts
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, ConflictException } from '@nestjs/common';
import { CriarReservaCommand } from './criar-reserva.command';
import { ReservasRepository } from '@/modules/reservas/domain/repositories/reservas.repository.interface';
import { Reserva } from '@/modules/reservas/domain/entities/reserva.entity';
import { PeriodoReserva } from '@/modules/reservas/domain/value-objects/periodo-reserva.vo';
import { ReservaCriadaEvent } from '@/modules/reservas/domain/events/reserva-criada.event';
import { PagamentosClient } from '@/modules/reservas/infrastructure/http/clients/pagamentos.client';

@CommandHandler(CriarReservaCommand)
export class CriarReservaHandler implements ICommandHandler<CriarReservaCommand> {
  private readonly logger = new Logger(CriarReservaHandler.name);

  constructor(
    private readonly reservasRepo: ReservasRepository,
    private readonly eventBus: EventBus,
    private readonly pagamentosClient: PagamentosClient,
  ) {}

  async execute(command: CriarReservaCommand): Promise<Reserva> {
    this.logger.log(`Criando reserva para cliente ${command.clienteId}`);

    // ========================================
    // 1. VALIDAR DISPONIBILIDADE
    // ========================================
    
    const periodo = new PeriodoReserva(command.dataInicio, command.dataFim);
    
    const reservasConflitantes = await this.reservasRepo.findOverlapping(
      command.espacoId,
      periodo,
    );

    if (reservasConflitantes.length > 0) {
      throw new ConflictException('Espaço não disponível neste período');
    }

    // ========================================
    // 2. CRIAR RESERVA (Domain Entity)
    // ========================================
    
    const reserva = Reserva.criar({
      espacoId: command.espacoId,
      clienteId: command.clienteId,
      periodo,
      valor: await this.calcularValor(command.espacoId, periodo),
      status: 'PENDENTE_PAGAMENTO',
    });

    // ========================================
    // 3. PERSISTIR (Transação)
    // ========================================
    
    await this.reservasRepo.save(reserva);

    this.logger.log(`Reserva ${reserva.id} criada com sucesso`);

    // ========================================
    // 4. EMITIR EVENTO (Event-Driven)
    // ========================================
    
    const event = new ReservaCriadaEvent(
      reserva.id,
      reserva.espacoId,
      reserva.clienteId,
      reserva.valor,
      reserva.periodo.dataInicio,
      reserva.periodo.dataFim,
    );

    this.eventBus.publish(event);

    return reserva;
  }

  private async calcularValor(espacoId: string, periodo: PeriodoReserva): Promise<number> {
    // Lógica de cálculo de valor
    const espaco = await this.espacosRepo.findById(espacoId);
    const horas = periodo.duracaoEmHoras();
    return espaco.precoPorHora * horas;
  }
}
```

### **Saga Pattern (Orquestração Distribuída)**

```typescript
// src/modules/reservas/application/sagas/reserva.saga.ts
import { Injectable, Logger } from '@nestjs/common';
import { ICommand, ofType, Saga } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { delay, map, mergeMap } from 'rxjs/operators';
import { ReservaCriadaEvent } from '@/modules/reservas/domain/events/reserva-criada.event';
import { PagamentoAprovadoEvent } from '@/modules/pagamentos/domain/events/pagamento-aprovado.event';
import { PagamentoRecusadoEvent } from '@/modules/pagamentos/domain/events/pagamento-recusado.event';
import { CriarCobrancaCommand } from '@/modules/pagamentos/application/commands/criar-cobranca.command';
import { ConfirmarReservaCommand } from '../commands/confirmar-reserva/confirmar-reserva.command';
import { CancelarReservaCommand } from '../commands/cancelar-reserva/cancelar-reserva.command';
import { EnviarNotificacaoCommand } from '@/modules/notificacoes/application/commands/enviar-notificacao.command';

@Injectable()
export class ReservaSaga {
  private readonly logger = new Logger(ReservaSaga.name);

  // ========================================
  // SAGA 1: Reserva Criada → Criar Cobrança
  // ========================================
  
  @Saga()
  reservaCriada = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(ReservaCriadaEvent),
      delay(100),  // Pequeno delay para garantir consistência
      map((event: ReservaCriadaEvent) => {
        this.logger.log(`[SAGA] Reserva ${event.reservaId} criada, criando cobrança...`);
        
        return new CriarCobrancaCommand(
          event.reservaId,
          event.clienteId,
          event.valor,
        );
      }),
    );
  };

  // ========================================
  // SAGA 2: Pagamento Aprovado → Confirmar Reserva + Notificar
  // ========================================
  
  @Saga()
  pagamentoAprovado = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PagamentoAprovadoEvent),
      mergeMap((event: PagamentoAprovadoEvent) => {
        this.logger.log(`[SAGA] Pagamento ${event.pagamentoId} aprovado, confirmando reserva...`);
        
        return [
          // Confirmar reserva
          new ConfirmarReservaCommand(event.reservaId, event.pagamentoId),
          
          // Enviar notificação
          new EnviarNotificacaoCommand({
            tipo: 'EMAIL',
            template: 'reserva-confirmada',
            destinatarioId: event.clienteId,
            dados: {
              reservaId: event.reservaId,
            },
          }),
        ];
      }),
    );
  };

  // ========================================
  // SAGA 3: Pagamento Recusado → Cancelar Reserva (Compensação)
  // ========================================
  
  @Saga()
  pagamentoRecusado = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PagamentoRecusadoEvent),
      mergeMap((event: PagamentoRecusadoEvent) => {
        this.logger.warn(`[SAGA] Pagamento ${event.pagamentoId} recusado, cancelando reserva...`);
        
        return [
          // Cancelar reserva (transação compensatória)
          new CancelarReservaCommand(
            event.reservaId,
            'PAGAMENTO_RECUSADO',
          ),
          
          // Notificar falha
          new EnviarNotificacaoCommand({
            tipo: 'EMAIL',
            template: 'pagamento-recusado',
            destinatarioId: event.clienteId,
            dados: {
              reservaId: event.reservaId,
              motivo: event.motivo,
            },
          }),
        ];
      }),
    );
  };
}
```

### **Event Sourcing (Opcional - Hardcore)**

```typescript
// src/modules/reservas/infrastructure/persistence/event-store/reserva-event-store.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservaEventSchema } from './schemas/reserva-event.schema';
import { DomainEvent } from '@/shared/domain/domain-event';

@Injectable()
export class ReservaEventStoreRepository {
  constructor(
    @InjectRepository(ReservaEventSchema)
    private readonly eventRepo: Repository<ReservaEventSchema>,
  ) {}

  // Salvar evento
  async saveEvent(aggregateId: string, event: DomainEvent, version: number): Promise<void> {
    await this.eventRepo.save({
      aggregateId,
      eventType: event.constructor.name,
      eventData: JSON.stringify(event),
      version,
      occurredAt: new Date(),
    });
  }

  // Buscar todos os eventos de um aggregate
  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    const events = await this.eventRepo.find({
      where: { aggregateId },
      order: { version: 'ASC' },
    });

    return events.map(e => JSON.parse(e.eventData));
  }

  // Reconstruir estado a partir de eventos
  async reconstituirReserva(aggregateId: string): Promise<Reserva> {
    const events = await this.getEvents(aggregateId);
    return ReservaAggregate.fromEvents(events);
  }
}

// Domain Aggregate
export class ReservaAggregate extends AggregateRoot {
  private id: string;
  private version: number = 0;
  private uncommittedEvents: DomainEvent[] = [];

  // Estado atual
  private espacoId: string;
  private clienteId: string;
  private status: string;
  private valor: number;

  // Reconstruir estado a partir de eventos (Event Sourcing)
  static fromEvents(events: DomainEvent[]): ReservaAggregate {
    const aggregate = new ReservaAggregate();
    events.forEach(event => aggregate.apply(event, false));
    return aggregate;
  }

  apply(event: DomainEvent, isNew: boolean = true) {
    // Aplicar evento ao estado
    switch (event.constructor) {
      case ReservaCriadaEvent:
        this.whenReservaCriada(event as ReservaCriadaEvent);
        break;
      case ReservaConfirmadaEvent:
        this.whenReservaConfirmada(event as ReservaConfirmadaEvent);
        break;
      case ReservaCanceladaEvent:
        this.whenReservaCancelada(event as ReservaCanceladaEvent);
        break;
    }

    if (isNew) {
      this.uncommittedEvents.push(event);
    }

    this.version++;
  }

  private whenReservaCriada(event: ReservaCriadaEvent) {
    this.id = event.reservaId;
    this.espacoId = event.espacoId;
    this.clienteId = event.clienteId;
    this.valor = event.valor;
    this.status = 'PENDENTE_PAGAMENTO';
  }

  private whenReservaConfirmada(event: ReservaConfirmadaEvent) {
    this.status = 'CONFIRMADA';
  }

  private whenReservaCancelada(event: ReservaCanceladaEvent) {
    this.status = 'CANCELADA';
  }

  getUncommittedEvents(): DomainEvent[] {
    return this.uncommittedEvents;
  }

  markEventsAsCommitted() {
    this.uncommittedEvents = [];
  }
}
```

---

## **4. TESTES (FUNDAMENTAIS PARA SENIORIDADE)**

### **Teste Unitário (Command Handler)**

```typescript
// src/modules/reservas/application/commands/criar-reserva/criar-reserva.handler.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { ConflictException } from '@nestjs/common';
import { CriarReservaHandler } from './criar-reserva.handler';
import { CriarReservaCommand } from './criar-reserva.command';
import { ReservasRepository } from '@/modules/reservas/domain/repositories/reservas.repository.interface';
import { PagamentosClient } from '@/modules/reservas/infrastructure/http/clients/pagamentos.client';

describe('CriarReservaHandler', () => {
  let handler: CriarReservaHandler;
  let reservasRepo: jest.Mocked<ReservasRepository>;
  let eventBus: jest.Mocked<EventBus>;
  let pagamentosClient: jest.Mocked<PagamentosClient>;

  beforeEach(async () => {
    // Mocks
    const reservasRepoMock = {
      findOverlapping: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
    };

    const eventBusMock = {
      publish: jest.fn(),
    };

    const pagamentosClientMock = {
      criarCobranca: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CriarReservaHandler,
        {
          provide: ReservasRepository,
          useValue: reservasRepoMock,
        },
        {
          provide: EventBus,
          useValue: eventBusMock,
        },
        {
          provide: PagamentosClient,
          useValue: pagamentosClientMock,
        },
      ],
    }).compile();

    handler = module.get<CriarReservaHandler>(CriarReservaHandler);
    reservasRepo = module.get(ReservasRepository);
    eventBus = module.get(EventBus);
    pagamentosClient = module.get(PagamentosClient);
  });

  describe('execute', () => {
    it('deve criar uma reserva com sucesso quando espaço está disponível', async () => {
      // Arrange
      const command = new CriarReservaCommand({
        espacoId: 'espaco-123',
        clienteId: 'cliente-456',
        dataInicio: new Date('2025-01-01T10:00:00'),
        dataFim: new Date('2025-01-01T12:00:00'),
      });

      reservasRepo.findOverlapping.mockResolvedValue([]);  // Nenhum conflito
      reservasRepo.save.mockResolvedValue({
        id: 'reserva-789',
        ...command,
        status: 'PENDENTE_PAGAMENTO',
      });

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('reserva-789');
      expect(result.status).toBe('PENDENTE_PAGAMENTO');
      expect(reservasRepo.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          reservaId: 'reserva-789',
        }),
      );
    });

    it('deve lançar ConflictException quando espaço não está disponível', async () => {
      // Arrange
      const command = new CriarReservaCommand({
        espacoId: 'espaco-123',
        clienteId: 'cliente-456',
        dataInicio: new Date('2025-01-01T10:00:00'),
        dataFim: new Date('2025-01-01T12:00:00'),
      });

      reservasRepo.findOverlapping.mockResolvedValue([
        { id: 'outra-reserva', status: 'CONFIRMADA' },
      ]);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      expect(reservasRepo.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('deve calcular valor correto baseado na duração', async () => {
      // Arrange
      const command = new CriarReservaCommand({
        espacoId: 'espaco-123',
        clienteId: 'cliente-456',
        dataInicio: new Date('2025-01-01T10:00:00'),
        dataFim: new Date('2025-01-01T14:00:00'),  // 4 horas
      });

      jest.spyOn(handler as any, 'calcularValor').mockResolvedValue(200);  // R$ 50/hora

      reservasRepo.findOverlapping.mockResolvedValue([]);
      reservasRepo.save.mockImplementation(async (reserva) => reserva);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.valor).toBe(200);
    });
  });
});
```

### **Teste de Integração (Controller + DB)**

```typescript
// test/integration/reservas.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/shared/database/prisma.service';

describe('Reservas Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    
    // Criar usuário e obter token
    authToken = await createUserAndGetToken(app);
  });

  afterAll(async () => {
    await prisma.clearDatabase();
    await app.close();
  });

  afterEach(async () => {
    await prisma.reserva.deleteMany();
  });

  describe('POST /api/v1/reservas', () => {
    it('deve criar uma reserva com sucesso', async () => {
      // Arrange
      const espaco = await prisma.espaco.create({
        data: {
          nome: 'Sala de Reunião A',
          capacidade: 10,
          precoPorHora: 50,
        },
      });

      const dto = {
        espacoId: espaco.id,
        dataInicio: '2025-01-01T10:00:00Z',
        dataFim: '2025-01-01T12:00:00Z',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/v1/reservas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('id');
      expect(response.body.espacoId).toBe(espaco.id);
      expect(response.body.status).toBe('PENDENTE_PAGAMENTO');

      // Verificar no banco
      const reservaDb = await prisma.reserva.findUnique({
        where: { id: response.body.id },
      });
      expect(reservaDb).toBeDefined();
    });

    it('deve retornar 409 quando espaço não está disponível', async () => {
      // Arrange
      const espaco = await prisma.espaco.create({
        data: { nome: 'Sala B', capacidade: 5, precoPorHora: 30 },
      });

      // Criar reserva existente
      await prisma.reserva.create({
        data: {
          espacoId: espaco.id,
          clienteId: 'cliente-123',
          dataInicio: new Date('2025-01-01T10:00:00Z'),
          dataFim: new Date('2025-01-01T12:00:00Z'),
          status: 'CONFIRMADA',
        },
      });

      const dto = {
        espacoId: espaco.id,
        dataInicio: '2025-01-01T11:00:00Z',  // Conflito!
        dataFim: '2025-01-01T13:00:00Z',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/reservas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(409);
    });

    it('deve retornar 401 quando não autenticado', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/api/v1/reservas')
        .send({})
        .expect(401);
    });

    it('deve validar DTO e retornar 400', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/v1/reservas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          espacoId: 'abc',  // Inválido
          // Faltando campos obrigatórios
        })
        .expect(400);

      expect(response.body.message).toContain('validation');
    });
  });

  describe('GET /api/v1/reservas/:id', () => {
    it('deve retornar reserva quando usuário é dono', async () => {
      // Arrange
      const reserva = await createReserva(prisma, 'cliente-123');

      // Act
      const response = await request(app.getHttpServer())
        .get(`/api/v1/reservas/${reserva.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.id).toBe(reserva.id);
    });

    it('deve retornar 403 quando usuário não é dono', async () => {
      // Arrange
      const reserva = await createReserva(prisma, 'outro-cliente');

      // Act & Assert
      await request(app.getHttpServer())
        .get(`/api/v1/reservas/${reserva.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });
});

// Helper functions
async function createUserAndGetToken(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({
      email: 'test@example.com',
      password: 'senha123',
    });

  return response.body.accessToken;
}
```

### **Teste E2E (Fluxo Completo)**

```typescript
// test/e2e/reserva-flow.e2e.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('Fluxo Completo de Reserva (E2E)', () => {
  let app: INestApplication;
  let userToken: string;
  let espacoId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve executar fluxo completo: cadastro → login → criar reserva → pagar → confirmar', async () => {
    // ========================================
    // 1. CADASTRAR USUÁRIO
    // ========================================
    
    const signupResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        nome: 'João Silva',
        email: 'joao@example.com',
        password: 'Senha@123',
        telefone: '11999999999',
      })
      .expect(201);

    expect(signupResponse.body).toHaveProperty('id');

    // ========================================
    // 2. LOGIN
    // ========================================
    
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'joao@example.com',
        password: 'Senha@123',
      })
      .expect(200);

    userToken = loginResponse.body.accessToken;
    expect(userToken).toBeDefined();

    // ========================================
    // 3. CONSULTAR ESPAÇOS DISPONÍVEIS
    // ========================================
    
    const espacosResponse = await request(app.getHttpServer())
      .get('/api/v1/espacos')
      .query({ capacidade: 10 })
      .expect(200);

    expect(espacosResponse.body.length).toBeGreaterThan(0);
    espacoId = espacosResponse.body[0].id;

    // ========================================
    // 4. CRIAR RESERVA
    // ========================================
    
    const reservaResponse = await request(app.getHttpServer())
      .post('/api/v1/reservas')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        espacoId,
        dataInicio: '2025-02-01T14:00:00Z',
        dataFim: '2025-02-01T16:00:00Z',
      })
      .expect(201);

    const reservaId = reservaResponse.body.id;
    expect(reservaResponse.body.status).toBe('PENDENTE_PAGAMENTO');
    expect(reservaResponse.body).toHaveProperty('checkoutUrl');

    // ========================================
    // 5. SIMULAR WEBHOOK DO STRIPE (Pagamento Aprovado)
    // ========================================
    
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/stripe')
      .send({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123456',
            metadata: {
              reservaId,
            },
          },
        },
      })
      .expect(200);

    // ========================================
    // 6. AGUARDAR PROCESSAMENTO ASSÍNCRONO
    // ========================================
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ========================================
    // 7. VERIFICAR QUE RESERVA FOI CONFIRMADA
    // ========================================
    
    const reservaAtualizadaResponse = await request(app.getHttpServer())
      .get(`/api/v1/reservas/${reservaId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(reservaAtualizadaResponse.body.status).toBe('CONFIRMADA');

    // ========================================
    // 8. VERIFICAR QUE EMAIL FOI ENVIADO
    // (Precisa mockar o SendGrid em testes)
    // ========================================
    
    // expect(sendGridMock.send).toHaveBeenCalledWith(
    //   expect.objectContaining({
    //     to: 'joao@example.com',
    //     templateId: 'reserva-confirmada',
    //   }),
    // );
  });
});
```

---

## **5. OBSERVABILIDADE - ESSENCIAL PARA PRODUÇÃO**

### **Prometheus + Grafana**

```typescript
// src/shared/observability/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

@Injectable()
export class MetricsService {
  // Contadores
  public readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total de requisições HTTP',
    labelNames: ['method', 'route', 'status_code'],
  });

  public readonly reservasCriadasTotal = new Counter({
    name: 'reservas_criadas_total',
    help: 'Total de reservas criadas',
    labelNames: ['espaco_id', 'status'],
  });

  // Histogramas (para latência)
  public readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duração das requisições HTTP em segundos',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  });

  public readonly dbQueryDuration = new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duração das queries ao banco de dados',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  });

  // Gauges (valores instantâneos)
  public readonly activeReservations = new Gauge({
    name: 'active_reservations',
    help: 'Número de reservas ativas no momento',
  });

  public readonly availableSpaces = new Gauge({
    name: 'available_spaces',
    help: 'Número de espaços disponíveis',
  });

  getMetrics(): Promise<string> {
    return register.metrics();
  }
}

// Interceptor para métricas HTTP
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, route } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = (Date.now() - start) / 1000;

        // Incrementar contador
        this.metricsService.httpRequestsTotal.inc({
          method,
          route: route?.path || 'unknown',
          status_code: response.statusCode,
        });

        // Registrar latência
        this.metricsService.httpRequestDuration.observe(
          {
            method,
            route: route?.path || 'unknown',
            status_code: response.statusCode,
          },
          duration,
        );
      }),
    );
  }
}

// Controller de métricas
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Public()
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
```

### **Distributed Tracing (Jaeger)**

```typescript
// src/shared/observability/tracing.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

@Injectable()
export class TracingService implements OnModuleInit {
  private sdk: NodeSDK;

  onModuleInit() {
    this.sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'ms1-reservas',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      }),
      traceExporter: new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': { enabled: true },
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-pg': { enabled: true },
          '@opentelemetry/instrumentation-redis': { enabled: true },
        }),
      ],
    });

    this.sdk.start();
  }

  async onModuleDestroy() {
    await this.sdk.shutdown();
  }
}

// Uso manual de tracing
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export class ReservasService {
  async criarReserva(dto: CriarReservaDto): Promise<Reserva> {
    const tracer = trace.getTracer('reservas-service');
    
    // Criar span principal
    return tracer.startActiveSpan('criarReserva', async (span) => {
      try {
        span.setAttribute('reserva.espaco_id', dto.espacoId);
        span.setAttribute('reserva.cliente_id', dto.clienteId);

        // Span para validação
        await tracer.startActiveSpan('validarDisponibilidade', async (validationSpan) => {
          try {
            await this.validarDisponibilidade(dto);
            validationSpan.setStatus({ code: SpanStatusCode.OK });
          } finally {
            validationSpan.end();
          }
        });

        // Span para salvar no DB
        const reserva = await tracer.startActiveSpan('salvarReserva', async (dbSpan) => {
          try {
            const result = await this.repo.save(dto);
            dbSpan.setAttribute('reserva.id', result.id);
            dbSpan.setStatus({ code: SpanStatusCode.OK });
            return result;
          } finally {
            dbSpan.end();
          }
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return reserva;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
```

---

## **6. DOCKER & KUBERNETES**

### **Docker Compose (Desenvolvimento)**

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ========================================
  # Nginx (Reverse Proxy)
  # ========================================
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - ms1-instance-1
      - ms1-instance-2
      - ms2
      - ms3
      - ms4
    networks:
      - frontend
      - backend

  # ========================================
  # MS1 - Reservas (3 instâncias)
  # ========================================
  ms1-instance-1:
    build:
      context: ./ms1-reservas
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://admin:secret@postgres-ms1:5432/reservas
      - REDIS_URL=redis://redis-ms1:6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres-ms1
      - redis-ms1
      - rabbitmq
    networks:
      - backend
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  ms1-instance-2:
    build:
      context: ./ms1-reservas
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://admin:secret@postgres-ms1:5432/reservas
      - REDIS_URL=redis://redis-ms1:6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres-ms1
      - redis-ms1
      - rabbitmq
    networks:
      - backend
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  # ========================================
  # MS2 - Pagamentos
  # ========================================
  ms2:
    build:
      context: ./ms2-pagamentos
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://admin:secret@postgres-ms2:5432/pagamentos
      - REDIS_URL=redis://redis-ms2:6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
    depends_on:
      - postgres-ms2
      - redis-ms2
      - rabbitmq
    networks:
      - backend

  # ========================================
  # MS3 - Notificações
  # ========================================
  ms3:
    build:
      context: ./ms3-notificacoes
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - MONGODB_URL=mongodb://mongo:27017/notificacoes
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
    depends_on:
      - mongo
      - rabbitmq
    networks:
      - backend

  # ========================================
  # MS4 - Auth
  # ========================================
  ms4:
    build:
      context: ./ms4-auth
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://admin:secret@postgres-ms4:5432/auth
      - REDIS_URL=redis://redis-ms4:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRATION=15m
      - REFRESH_TOKEN_EXPIRATION=7d
    depends_on:
      - postgres-ms4
      - redis-ms4
    networks:
      - backend

  # ========================================
  # Bancos de Dados
  # ========================================
  postgres-ms1:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: reservas
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres-ms1-data:/var/lib/postgresql/data
    networks:
      - backend

  postgres-ms2:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pagamentos
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres-ms2-data:/var/lib/postgresql/data
    networks:
      - backend

  postgres-ms4:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: auth
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres-ms4-data:/var/lib/postgresql/data
    networks:
      - backend

  mongo:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    networks:
      - backend

  # ========================================
  # Redis (Cache)
  # ========================================
  redis-ms1:
    image: redis:7-alpine
    volumes:
      - redis-ms1-data:/data
    networks:
      - backend

  redis-ms2:
    image: redis:7-alpine
    volumes:
      - redis-ms2-data:/data
    networks:
      - backend

  redis-ms4:
    image: redis:7-alpine
    volumes:
      - redis-ms4-data:/data
    networks:
      - backend

  # ========================================
  # RabbitMQ (Event Bus)
  # ========================================
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "15672:15672"  # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: secret
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - backend

  # ========================================
  # Observabilidade
  # ========================================
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - backend

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
      - grafana-data:/var/lib/grafana
    networks:
      - backend

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "14268:14268"  # Collector HTTP
    networks:
      - backend

  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - backend

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    depends_on:
      - elasticsearch
    networks:
      - backend

volumes:
  postgres-ms1-data:
  postgres-ms2-data:
  postgres-ms4-data:
  mongo-data:
  redis-ms1-data:
  redis-ms2-data:
  redis-ms4-data:
  rabbitmq-data:
  prometheus-data:
  grafana-data:
  elasticsearch-data:

networks:
  frontend:
  backend:
```

---

# ✅ **CHECKLIST REVISADO**

## **Arquitetura**
- [x] Nginx (Reverse Proxy simples)
- [x] Load Balancer (integrado no Nginx)
- [x] BFF (opcional, começar sem)
- [x] 4 Microserviços **independentes** (cada um valida JWT)
- [x] Event Bus (RabbitMQ)
- [x] Cada MS com auth, rate limit, CORS próprios

## **Segurança (Defense in Depth)**
- [x] JWT validado por CADA MS (não só no Gateway)
- [x] Rate Limiting por MS (Redis distribuído)
- [x] CORS por MS
- [x] Authorization granular (regras de negócio)
- [x] Helmet.js
- [x] Input validation (class-validator)

## **Padrões Avançados**
- [x] CQRS (Command Query Responsibility Segregation)
- [x] Event Sourcing (opcional)
- [x] Saga Pattern (orquestração distribuída)
- [x] DDD (Domain-Driven Design)
- [x] Clean Architecture
- [x] Repository Pattern

## **Testes (FUNDAMENTAL)**
- [x] Testes Unitários (>80% coverage)
- [x] Testes de Integração
- [x] Testes E2E
- [x] Testes de Carga (k6)

## **Observabilidade**
- [x] Prometheus (métricas)
- [x] Grafana (dashboards)
- [x] Jaeger (distributed tracing)
- [x] ELK Stack (logs)
- [x] Sentry (error tracking)

## **Infraestrutura**
- [x] Docker multi-stage builds
- [x] Docker Compose
- [x] Kubernetes (próximo passo)
- [x] CI/CD (GitHub Actions)

---

# 📚 **DOCUMENTAÇÃO - ARCHITECTURE.md**

Crie este arquivo no repositório:

```markdown
# Decisões de Arquitetura

## Por que NÃO usar API Gateway com autenticação centralizada?

### TL;DR
Optamos por **validação de JWT em cada microserviço** ao invés de centralizar no API Gateway por questões de **segurança**, **autonomia** e **pragmatismo**.

### Análise de Tradeoffs

#### Abordagem Considerada (mas rejeitada):
```
Frontend → API Gateway (Kong) → MS (confiam cegamente no Gateway)
```

#### Abordagem Escolhida:
```
Frontend → Nginx (routing simples) → MS (cada um valida JWT)
```

### Justificativa:

**1. Defense in Depth (Segurança em Camadas)**
- Se atacante bypassar o Nginx (ex: acesso direto à rede interna), MS ainda estão protegidos
- Zero Trust Architecture: nunca confiar, sempre verificar
- Cada MS é autônomo e responsável pela própria segurança

**2. Escala não justifica complexidade adicional**
- Sistema target: ~1.000 req/s
- Validação JWT: ~0.5-2ms (~0.2% do tempo total de request)
- Gargalo real: Database queries (50%), chamadas entre MS (30%)
- ROI negativo: complexidade adicional não compensa ganho marginal de performance

**3. Autonomia dos Microserviços**
- Cada MS pode ser testado/deployado/executado independentemente
- Facilita debugging e troubleshooting
- Permite evolução independente (ex: MS1 usar JWT, MS2 usar OAuth)

**4. Simplicidade e Manutenibilidade**
- Menos "magic" na arquitetura
- Stack trace mais claro
- Onboarding de novos devs mais fácil

### Quando reconsi deraríamos API Gateway robusto:

- [ ] Escala > 10.000 req/s (CPU de validação JWT vira bottleneck)
- [ ] Múltiplos consumidores externos (B2B, parceiros)
- [ ] Necessidade de features específicas:
  - Circuit breaker distribuído
  - API versioning complexo (/v1, /v2 com comportamentos muito diferentes)
  - Rate limiting global cross-service
  - Transformação complexa de requests/responses
  - Analytics/metering por tenant (multi-tenancy)

### O que usamos no lugar:

**Nginx:**
- SSL/TLS termination
- Routing entre MS
- Load balancing (least_conn)
- Compressão (gzip/brotli)
- Static file serving
- Request logging

**Cada Microserviço:**
- JWT validation (`@UseGuards(JwtAuthGuard)`)
- Authorization (regras de negócio)
- Rate limiting (Redis distribuído)
- CORS (configuração própria)
- Input validation

### Métricas para Validar a Decisão:

Iremos monitorar:
- Latência p95 de requests (target: < 200ms)
- CPU usage dos MS (target: < 70%)
- Taxa de erros 5xx (target: < 0.1%)
- Tempo de validação JWT (esperado: < 2ms)

Se observarmos degradação nesses indicadores, reavaliaremos a arquitetura.

---

## Outras Decisões Importantes

### Por que PostgreSQL para Reservas/Pagamentos/Auth?
- ACID transactions (crítico para reservas e pagamentos)
- JSON support (flexibilidade quando necessário)
- Maturidade e tooling
- Replicação read/write built-in

### Por que MongoDB para Notificações?
- Schema flexível (diferentes tipos de notificação)
- Append-only workload (write-heavy)
- Não precisa de ACID

### Por que RabbitMQ ao invés de Kafka?
- Menor complexidade operacional
- Pattern matching flexível (topic exchanges)
- Suficiente para nossa escala (<10k msg/s)
- Melhor para workloads onde ordem não é crítica

### Por que CQRS?
- Separação clara read/write
- Permite otimizar queries (read models)
- Facilita Event Sourcing (futuro)
- Alinha com DDD

### Por que NestJS?
- TypeScript (type safety)
- Arquitetura opinativa (menos decisões)
- Built-in support para CQRS, DDD patterns
- Ecossistema maduro
```

---