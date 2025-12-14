# 🚀 **PROJETO HARDCORE - Plataforma de Reservas de Espaços** (by Claude)

## **Objetivo: Showcase de Senioridade**

Vou te dar o **planejamento completo** de uma arquitetura **production-grade enterprise-level**. Cada componente justificado e bem definido.

---

# 📐 **ARQUITETURA COMPLETA**

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
│                CAMADA DE EDGE/GATEWAY                         │
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
│            │   (AWS ALB/     │                                │
│            │    Nginx)       │                                │
│            └────────┬────────┘                                │
└─────────────────────┼─────────────────────────────────────────┘
                      │
┌─────────────────────┼─────────────────────────────────────────┐
│              CAMADA DE API GATEWAY                            │
├─────────────────────┼─────────────────────────────────────────┤
│                     ↓                                         │
│       ┌──────────────────────────────┐                        │
│       │    API Gateway (Kong)        │                        │
│       │                              │                        │
│       │ • JWT Validation             │                        │
│       │ • Rate Limiting (Global)     │                        │
│       │ • Request/Response Transform │                        │
│       │ • API Versioning (/v1, /v2)  │                        │
│       │ • CORS                       │                        │
│       │ • Circuit Breaker            │                        │
│       │ • Metrics Collection         │                        │
│       └──────────┬───────────────────┘                        │
└──────────────────┼────────────────────────────────────────────┘
                   │
┌──────────────────┼─────────────────────────────────────────────┐
│              CAMADA DE BFF (OPCIONAL)                          │
├──────────────────┼─────────────────────────────────────────────┤
│                  │                                             │
│    ┌─────────────┼──────────────┐                              │
│    │             │              │                              │
│    ↓             ↓              ↓                              │
│ ┌────────┐  ┌────────┐  ┌──────────┐                           │
│ │BFF Web │  │BFF Mob.│  │BFF Admin │                           │
│ │(Node)  │  │(Node)  │  │(Node)    │                           │
│ └───┬────┘  └──┬────┘  └─────┬─────┘                           │
└─────┼──────────┼─────────────┼─────────────────────────────────┘
      │          │             │
      └──────────┴─────────────┘
                 │
┌────────────────┼──────────────────────────────────────────────┐
│          CAMADA DE MICROSERVIÇOS                              │
├────────────────┼──────────────────────────────────────────────┤
│                │                                              │
│    ┌───────────┼───────────────┐                              │
│    │           │               │                              │
│    ↓           ↓               ↓                              │
│ ┌──────────────────────────────────────────────┐              │
│ │  MS1: Reservas & Disponibilidade             │              │
│ │  (NestJS + TypeScript)                       │              │
│ │  ┌──────────┐  ┌──────────┐  ┌──────────┐    │              │
│ │  │Instance 1│  │Instance 2│  │Instance 3│    │              │
│ │  └──────────┘  └──────────┘  └──────────┘    │              │
│ │  ┌──────────────────────────────────────┐    │              │
│ │  │ PostgreSQL (Primary + Replicas)      │    │              │
│ │  └──────────────────────────────────────┘    │              │
│ │  ┌──────────────────────────────────────┐    │              │
│ │  │ Redis Cluster (Cache + Sessions)     │    │              │
│ │  └──────────────────────────────────────┘    │              │
│ └──────────────────────────────────────────────┘              │
│                                                               │
│ ┌──────────────────────────────────────────────┐              │
│ │  MS2: Pagamentos & Cobranças                 │              │
│ │  (NestJS + TypeScript)                       │              │
│ │  ┌──────────┐  ┌──────────┐                  │              │
│ │  │Instance 1│  │Instance 2│                  │              │
│ │  └──────────┘  └──────────┘                  │              │
│ │  ┌──────────────────────────────────────┐    │              │
│ │  │ PostgreSQL (Primary + Replicas)      │    │              │
│ │  └──────────────────────────────────────┘    │              │
│ │  ┌──────────────────────────────────────┐    │              │
│ │  │ Redis Cluster                        │    │              │
│ │  └──────────────────────────────────────┘    │              │
│ └──────────────────────────────────────────────┘              │
│                                                               │
│ ┌──────────────────────────────────────────────┐              │
│ │  MS3: Notificações                           │              │
│ │  (NestJS + TypeScript)                       │              │
│ │  • Email (SendGrid)                          │              │
│ │  • SMS (Twilio)                              │              │
│ │  • Push Notifications (Firebase)             │              │
│ │  ┌──────────────────────────────────────┐    │              │
│ │  │ MongoDB (Histórico de notificações)  │    │              │
│ │  └──────────────────────────────────────┘    │              │
│ └──────────────────────────────────────────────┘              │
│                                                               │
│ ┌──────────────────────────────────────────────┐              │
│ │  MS4: Gestão de Usuários & Auth              │              │
│ │  (NestJS + TypeScript)                       │              │
│ │  • JWT Generation                            │              │
│ │  • OAuth2 (Google, Facebook)                 │              │
│ │  • MFA (Two-Factor Auth)                     │              │
│ │  ┌──────────────────────────────────────┐    │              │
│ │  │ PostgreSQL                           │    │              │
│ │  └──────────────────────────────────────┘    │              │
│ │  ┌──────────────────────────────────────┐    │              │
│ │  │ Redis (Sessions, Refresh Tokens)     │    │              │
│ │  └──────────────────────────────────────┘    │              │
│ └──────────────────────────────────────────────┘              │
└───────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────┼───────────────────────────────────────┐
│            CAMADA DE MENSAGERIA & EVENTOS                     │
├───────────────────────┼───────────────────────────────────────┤
│                       ↓                                       │
│          ┌─────────────────────────┐                          │
│          │  Event Bus (RabbitMQ)   │                          │
│          │  ou Kafka               │                          │
│          │                         │                          │
│          │  Topics/Queues:         │                          │
│          │  • reserva.criada       │                          │
│          │  • reserva.confirmada   │                          │
│          │  • reserva.cancelada    │                          │
│          │  • pagamento.aprovado   │                          │
│          │  • pagamento.recusado   │                          │
│          │  • notificacao.enviada  │                          │
│          └─────────────────────────┘                          │
└───────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────┼───────────────────────────────────────┐
│         CAMADA DE OBSERVABILIDADE                             │
├───────────────────────┼───────────────────────────────────────┤
│                       │                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Prometheus   │  │   Grafana    │  │    Jaeger    │         │
│  │  (Metrics)   │  │ (Dashboards) │  │  (Tracing)   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                               │
│  ┌──────────────────────────────────────────────────┐         │
│  │  ELK Stack (Elasticsearch, Logstash, Kibana)     │         │
│  │  ou Loki + Promtail                              │         │
│  │  (Logs Centralizados)                            │         │
│  └──────────────────────────────────────────────────┘         │
│                                                               │
│  ┌──────────────────────────────────────────────────┐         │
│  │  Sentry (Error Tracking & Performance)           │         │
│  └──────────────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────┼───────────────────────────────────────┐
│         CAMADA DE SEGURANÇA & COMPLIANCE                      │
├───────────────────────┼───────────────────────────────────────┤
│                                                               │
│  • HashiCorp Vault (Secrets Management)                       │
│  • AWS Secrets Manager / Azure Key Vault                      │
│  • Certificados SSL/TLS (Let's Encrypt)                       │
│  • LGPD Compliance (Data Privacy)                             │
│  • PCI DSS (Payment Card Industry)                            │
│  • Backup automatizado (Daily + Point-in-time recovery)       │
└───────────────────────────────────────────────────────────────┘
```

---

# 🗂️ **COMPONENTES DETALHADOS**

## **1. CAMADA DE EDGE/GATEWAY**

### **1.1 CDN (Content Delivery Network)**
- **Ferramenta:** Cloudflare ou AWS CloudFront
- **Responsabilidade:**
  - Cachear assets estáticos (imagens, CSS, JS)
  - DDoS protection
  - Edge caching (reduzir latência global)
  - Certificado SSL/TLS automático

### **1.2 WAF (Web Application Firewall)**
- **Ferramenta:** AWS WAF, Cloudflare WAF, ou ModSecurity
- **Responsabilidade:**
  - Bloquear ataques OWASP Top 10 (SQL Injection, XSS, CSRF)
  - Rate limiting por IP
  - Geo-blocking (bloquear países específicos)
  - Bot detection

### **1.3 Load Balancer (Camada 7 - Application)**
- **Ferramenta:** AWS ALB, Nginx, HAProxy
- **Responsabilidade:**
  - Distribuir tráfego entre instâncias do API Gateway
  - Health checks
  - SSL termination
  - Sticky sessions (se necessário)
  
**Configuração:**
```nginx
upstream api_gateway_backend {
    least_conn; # Algoritmo de balanceamento
    
    server gateway-1:8000 max_fails=3 fail_timeout=30s;
    server gateway-2:8000 max_fails=3 fail_timeout=30s;
    server gateway-3:8000 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name api.reservas.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://api_gateway_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## **2. CAMADA DE API GATEWAY**

### **2.1 API Gateway (Kong)**
- **Ferramenta:** Kong (open-source) ou AWS API Gateway
- **Responsabilidades:**

#### **Autenticação Global**
```yaml
plugins:
  - name: jwt
    config:
      secret_is_base64: false
      claims_to_verify:
        - exp
        - nbf
      key_claim_name: kid
```

#### **Rate Limiting Global**
```yaml
plugins:
  - name: rate-limiting
    config:
      second: 10
      minute: 100
      hour: 1000
      policy: redis
      redis_host: redis-cluster
      redis_port: 6379
```

#### **API Versioning**
```yaml
routes:
  - name: reservas-v1
    paths: [/v1/reservas]
    service: ms1-v1
    
  - name: reservas-v2
    paths: [/v2/reservas]
    service: ms1-v2
```

#### **Circuit Breaker**
```yaml
plugins:
  - name: proxy-cache
    config:
      strategy: memory
      
  - name: request-termination
    enabled_if_upstream_down: true
    config:
      status_code: 503
      message: "Serviço temporariamente indisponível"
```

#### **Request/Response Transformation**
```yaml
plugins:
  - name: request-transformer
    config:
      add:
        headers:
          - X-Request-ID:{{uuid}}
          - X-User-ID:{{jwt.user_id}}
          - X-Timestamp:{{timestamp}}
      remove:
        headers:
          - Authorization # Não passar JWT para MS internos
```

#### **Observabilidade**
```yaml
plugins:
  - name: prometheus
  - name: zipkin
    config:
      http_endpoint: http://jaeger:9411/api/v2/spans
      sample_ratio: 1.0
```

---

## **3. CAMADA DE BFF (Backend for Frontend)**

### **3.1 BFF Web**
```typescript
// bff-web/src/reservas/reservas.controller.ts
@Controller('reservas')
export class ReservasController {
  constructor(
    private readonly ms1Client: ReservasClient,
    private readonly ms2Client: PagamentosClient,
    private readonly ms3Client: NotificacoesClient,
  ) {}

  @Get(':id')
  async getReservaCompleta(@Param('id') id: string, @CurrentUser() user: User) {
    // BFF orquestra múltiplos MS
    const [reserva, pagamento, notificacoes] = await Promise.all([
      this.ms1Client.getReserva(id),
      this.ms2Client.getPagamento(reserva.pagamentoId),
      this.ms3Client.getNotificacoesReserva(id),
    ]);

    // BFF agrega e formata dados para Web
    return {
      reserva: {
        ...reserva,
        espaco: {
          ...reserva.espaco,
          fotosHD: reserva.espaco.fotos, // Web recebe todas as fotos
        },
      },
      pagamento: {
        ...pagamento,
        historicoCompleto: pagamento.transacoes, // Web mostra histórico completo
      },
      notificacoes,
      recomendacoes: await this.getRecomendacoes(reserva), // Lógica específica do BFF
    };
  }
}
```

### **3.2 BFF Mobile**
```typescript
// bff-mobile/src/reservas/reservas.controller.ts
@Controller('reservas')
export class ReservasController {
  @Get(':id')
  async getReserva(@Param('id') id: string, @CurrentUser() user: User) {
    const reserva = await this.ms1Client.getReservaOtimizada(id);
    
    // Mobile recebe dados mínimos
    return {
      id: reserva.id,
      espaco: reserva.espaco.nome,
      foto: reserva.espaco.fotos[0], // Apenas 1 foto (economia de dados)
      data: format(reserva.dataInicio, 'dd/MM/yyyy'),
      horario: `${format(reserva.dataInicio, 'HH:mm')} - ${format(reserva.dataFim, 'HH:mm')}`,
      valor: reserva.valor,
      status: reserva.status,
    };
  }
}
```

---

## **4. CAMADA DE MICROSERVIÇOS**

### **4.1 MS1 - Reservas & Disponibilidade**

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
│   │   │   │       └── reserva-confirmada.event.ts
│   │   │   ├── application/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── criar-reserva.command.ts
│   │   │   │   │   ├── cancelar-reserva.command.ts
│   │   │   │   │   └── confirmar-reserva.command.ts
│   │   │   │   ├── queries/
│   │   │   │   │   ├── obter-reserva.query.ts
│   │   │   │   │   └── listar-reservas.query.ts
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── criar-reserva.handler.ts
│   │   │   │   │   └── cancelar-reserva.handler.ts
│   │   │   │   └── sagas/
│   │   │   │       └── reserva.saga.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── persistence/
│   │   │   │   │   ├── typeorm/
│   │   │   │   │   │   ├── reserva.schema.ts
│   │   │   │   │   │   └── reservas.repository.ts
│   │   │   │   ├── messaging/
│   │   │   │   │   ├── rabbitmq/
│   │   │   │   │   │   └── reserva-events.publisher.ts
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
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── pipes/
│   └── config/
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docker/
```

#### **Padrões Implementados**

**CQRS (Command Query Responsibility Segregation)**
```typescript
// commands/criar-reserva.command.ts
export class CriarReservaCommand {
  constructor(
    public readonly espacoId: string,
    public readonly clienteId: string,
    public readonly dataInicio: Date,
    public readonly dataFim: Date,
  ) {}
}

// handlers/criar-reserva.handler.ts
@CommandHandler(CriarReservaCommand)
export class CriarReservaHandler implements ICommandHandler<CriarReservaCommand> {
  constructor(
    private readonly reservasRepo: ReservasRepository,
    private readonly eventBus: EventBus,
    private readonly pagamentosClient: PagamentosClient,
  ) {}

  async execute(command: CriarReservaCommand): Promise<Reserva> {
    // 1. Validar disponibilidade
    await this.validarDisponibilidade(command);
    
    // 2. Criar reserva (status: PENDENTE_PAGAMENTO)
    const reserva = Reserva.criar({
      espacoId: command.espacoId,
      clienteId: command.clienteId,
      periodo: new PeriodoReserva(command.dataInicio, command.dataFim),
    });
    
    await this.reservasRepo.save(reserva);
    
    // 3. Emitir evento
    this.eventBus.publish(new ReservaCriadaEvent(reserva.id));
    
    return reserva;
  }
}
```

**Event Sourcing (opcional, mas hardcore)**
```typescript
// domain/aggregates/reserva.aggregate.ts
export class ReservaAggregate extends AggregateRoot {
  private id: string;
  private version: number = 0;
  private events: DomainEvent[] = [];
  
  // Estado é reconstruído a partir de eventos
  static fromEvents(events: DomainEvent[]): ReservaAggregate {
    const aggregate = new ReservaAggregate();
    events.forEach(event => aggregate.apply(event));
    return aggregate;
  }
  
  apply(event: DomainEvent) {
    switch (event.constructor) {
      case ReservaCriadaEvent:
        this.whenReservaCriada(event as ReservaCriadaEvent);
        break;
      case ReservaConfirmadaEvent:
        this.whenReservaConfirmada(event as ReservaConfirmadaEvent);
        break;
      // ...
    }
    this.version++;
  }
  
  private whenReservaCriada(event: ReservaCriadaEvent) {
    this.id = event.reservaId;
    this.status = 'PENDENTE_PAGAMENTO';
    // ...
  }
}
```

**Saga Pattern (para orquestração distribuída)**
```typescript
// sagas/reserva.saga.ts
@Injectable()
export class ReservaSaga {
  @Saga()
  reservaFluxo = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(ReservaCriadaEvent),
      mergeMap((event: ReservaCriadaEvent) => {
        // Quando reserva é criada, criar cobrança
        return of(new CriarCobrancaCommand(event.reservaId));
      }),
    );
  };
  
  @Saga()
  pagamentoFluxo = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PagamentoAprovadoEvent),
      mergeMap((event: PagamentoAprovadoEvent) => {
        // Quando pagamento aprovado, confirmar reserva
        return of(new ConfirmarReservaCommand(event.reservaId));
      }),
    );
  };
  
  @Saga()
  compensacaoFluxo = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PagamentoRecusadoEvent),
      mergeMap((event: PagamentoRecusadoEvent) => {
        // Se pagamento falhar, cancelar reserva (compensação)
        return of(new CancelarReservaCommand(event.reservaId, 'PAGAMENTO_RECUSADO'));
      }),
    );
  };
}
```

#### **Database**
```typescript
// PostgreSQL com Replicação Read/Write
// Master: escrita
// Slaves: leitura

// typeorm.config.ts
export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  replication: {
    master: {
      host: 'postgres-master',
      port: 5432,
      username: 'admin',
      password: 'secret',
      database: 'reservas',
    },
    slaves: [
      {
        host: 'postgres-slave-1',
        port: 5432,
        username: 'readonly',
        password: 'secret',
        database: 'reservas',
      },
      {
        host: 'postgres-slave-2',
        port: 5432,
        username: 'readonly',
        password: 'secret',
        database: 'reservas',
      },
    ],
  },
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false, // Usar migrations em prod
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  logging: ['error', 'warn'],
};
```

#### **Cache (Redis Cluster)**
```typescript
// cache/redis.config.ts
export const redisConfig = {
  type: 'cluster',
  nodes: [
    { host: 'redis-node-1', port: 6379 },
    { host: 'redis-node-2', port: 6379 },
    { host: 'redis-node-3', port: 6379 },
  ],
  options: {
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
    },
  },
};

// Estratégia de cache
@Injectable()
export class ReservasService {
  @Cacheable({
    ttl: 300, // 5 minutos
    key: (id: string) => `reserva:${id}`,
  })
  async findById(id: string): Promise<Reserva> {
    return this.repo.findById(id);
  }
  
  @CacheEvict({
    key: (id: string) => `reserva:${id}`,
  })
  async update(id: string, data: UpdateReservaDto): Promise<Reserva> {
    return this.repo.update(id, data);
  }
}
```

---

### **4.2 MS2 - Pagamentos & Cobranças**

#### **Integrações Externas**

**Stripe Integration**
```typescript
// infrastructure/payment-gateways/stripe/stripe.service.ts
@Injectable()
export class StripeService implements PaymentGateway {
  private stripe: Stripe;
  
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }
  
  async criarCobranca(dto: CriarCobrancaDto): Promise<Cobranca> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: dto.valor * 100, // Stripe usa centavos
      currency: 'brl',
      payment_method_types: ['card'],
      metadata: {
        reservaId: dto.reservaId,
        clienteId: dto.clienteId,
      },
      // Idempotency key para evitar cobranças duplicadas
      idempotencyKey: `reserva-${dto.reservaId}`,
    });
    
    return {
      id: paymentIntent.id,
      status: this.mapStripeStatus(paymentIntent.status),
      checkoutUrl: paymentIntent.client_secret,
    };
  }
  
  async estornar(pagamentoId: string): Promise<void> {
    await this.stripe.refunds.create({
      payment_intent: pagamentoId,
      reason: 'requested_by_customer',
    });
  }
}

// Webhook Handler (recebe eventos do Stripe)
@Controller('webhooks/stripe')
export class StripeWebhookController {
  @Post()
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    const sig = req.headers['stripe-signature'];
    
    const event = this.stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePagamentoAprovado(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePagamentoRecusado(event.data.object);
        break;
    }
  }
  
  private async handlePagamentoAprovado(paymentIntent: any) {
    const { reservaId } = paymentIntent.metadata;
    
    // Emitir evento para MS1
    this.eventBus.publish(new PagamentoAprovadoEvent(reservaId, paymentIntent.id));
  }
}
```

**Idempotência (evitar cobranças duplicadas)**
```typescript
// Decorator para garantir idempotência
export function Idempotent(keyExtractor: (dto: any) => string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const key = keyExtractor(args[0]);
      const cached = await this.cacheManager.get(`idempotent:${key}`);
      
      if (cached) {
        return cached; // Retorna resultado anterior
      }
      
      const result = await originalMethod.apply(this, args);
      
      // Armazena resultado por 24h
      await this.cacheManager.set(`idempotent:${key}`, result, 86400);
      
      return result;
    };
  };
}

// Uso
@Injectable()
export class PagamentosService {
  @Idempotent((dto) => `cobranca-${dto.reservaId}`)
  async criarCobranca(dto: CriarCobrancaDto): Promise<Cobranca> {
    // Se chamar 2x com mesmo reservaId, retorna a mesma cobrança
    return this.stripeService.criarCobranca(dto);
  }
}
```

---

### **4.3 MS3 - Notificações**

```typescript
// Multi-canal: Email, SMS, Push
@Injectable()
export class NotificacoesService {
  async enviarNotificacao(dto: EnviarNotificacaoDto) {
    const { tipo, destinatario, template, dados } = dto;
    
    switch (tipo) {
      case 'EMAIL':
        await this.emailService.enviar({
          to: destinatario.email,
          template: template,
          context: dados,
        });
        break;
        
      case 'SMS':
        await this.smsService.enviar({
          to: destinatario.telefone,
          message: this.renderTemplate(template, dados),
        });
        break;
        
      case 'PUSH':
        await this.pushService.enviar({
          token: destinatario.deviceToken,
          notification: {
            title: dados.titulo,
            body: dados.mensagem,
          },
        });
        break;
    }
    
    // Salvar histórico
    await this.historicoRepo.save({
      tipo,
      destinatario,
      template,
      status: 'ENVIADO',
      enviadoEm: new Date(),
    });
  }
}

// Event Listener (assíncrono)
@Injectable()
export class NotificacoesEventHandler {
  @OnEvent('reserva.confirmada', { async: true })
  async handleReservaConfirmada(event: ReservaConfirmadaEvent) {
    await this.notificacoesService.enviarNotificacao({
      tipo: 'EMAIL',
      destinatario: { email: event.clienteEmail },
      template: 'reserva-confirmada',
      dados: {
        nomeCliente: event.clienteNome,
        nomeEspaco: event.espacoNome,
        dataReserva: event.dataInicio,
      },
    });
  }
}
```

---

### **4.4 MS4 - Gestão de Usuários & Auth**

```typescript
// JWT com Refresh Token
@Injectable()
export class AuthService {
  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.usersService.validateCredentials(dto.email, dto.password);
    
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    
    // Armazenar refresh token no Redis
    await this.cacheManager.set(
      `refresh:${user.id}`,
      refreshToken,
      { ttl: 7 * 24 * 60 * 60 }, // 7 dias
    );
    
    return { accessToken, refreshToken };
  }
  
  private generateAccessToken(user: User): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      { expiresIn: '15m' }, // Access token expira em 15min
    );
  }
  
  private generateRefreshToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id },
      { expiresIn: '7d' }, // Refresh token expira em 7 dias
    );
  }
  
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = this.jwtService.verify(refreshToken);
    
    // Validar se refresh token ainda está válido no Redis
    const stored = await this.cacheManager.get(`refresh:${payload.sub}`);
    if (stored !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    const user = await this.usersService.findById(payload.sub);
    return this.login({ email: user.email, password: null }); // Gera novos tokens
  }
}

// MFA (Two-Factor Authentication)
@Injectable()
export class MfaService {
  async generateSecret(userId: string): Promise<{ secret: string; qrCode: string }> {
    const secret = speakeasy.generateSecret({ name: `Reservas (${userId})` });
    
    await this.usersRepo.update(userId, { mfaSecret: secret.base32 });
    
    return {
      secret: secret.base32,
      qrCode: await QRCode.toDataURL(secret.otpauth_url),
    };
  }
  
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await this.usersRepo.findById(userId);
    
    return speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
    });
  }
}
```

---

## **5. CAMADA DE MENSAGERIA & EVENTOS**

### **RabbitMQ Configuration**

```typescript
// rabbitmq.config.ts
export const rabbitmqConfig = {
  urls: [
    'amqp://rabbitmq-1:5672',
    'amqp://rabbitmq-2:5672',
    'amqp://rabbitmq-3:5672',
  ],
  queue: 'reservas_queue',
  exchanges: [
    {
      name: 'reservas.events',
      type: 'topic',
    },
  ],
  bindings: [
    {
      exchange: 'reservas.events',
      routingKey: 'reserva.*',
      queue: 'reservas_queue',
    },
    {
      exchange: 'reservas.events',
      routingKey: 'pagamento.*',
      queue: 'pagamentos_queue',
    },
  ],
};

// Publisher
@Injectable()
export class EventPublisher {
  constructor(@Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy) {}
  
  async publish(event: DomainEvent) {
    const routingKey = this.getRoutingKey(event);
    
    await this.client.emit(routingKey, {
      eventId: uuid(),
      eventType: event.constructor.name,
      occurredAt: new Date(),
      payload: event,
    });
  }
  
  private getRoutingKey(event: DomainEvent): string {
    // reserva.criada, reserva.confirmada, pagamento.aprovado, etc
    const [entity, action] = event.constructor.name
      .replace('Event', '')
      .split(/(?=[A-Z])/);
    
    return `${entity.toLowerCase()}.${action.toLowerCase()}`;
  }
}

// Consumer
@Controller()
export class EventConsumer {
  @EventPattern('reserva.confirmada')
  async handleReservaConfirmada(@Payload() event: ReservaConfirmadaEvent) {
    // Processar evento
    await this.notificacoesService.enviarConfirmacao(event);
  }
  
  @EventPattern('pagamento.aprovado')
  async handlePagamentoAprovado(@Payload() event: PagamentoAprovadoEvent) {
    await this.reservasService.confirmarReserva(event.reservaId);
  }
}
```

**Dead Letter Queue (DLQ) para eventos que falharam**
```typescript
export const dlqConfig = {
  exchanges: [
    {
      name: 'reservas.events.dlq',
      type: 'topic',
    },
  ],
  bindings: [
    {
      exchange: 'reservas.events.dlq',
      routingKey: '#',
      queue: 'failed_events_queue',
    },
  ],
};

// Retry com backoff exponencial
@Injectable()
export class EventConsumerWithRetry {
  @EventPattern('reserva.confirmada')
  async handleReservaConfirmada(@Payload() event: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    
    try {
      await this.processEvent(event);
      channel.ack(originalMsg); // Sucesso
    } catch (error) {
      const retryCount = (originalMsg.properties.headers['x-retry-count'] || 0) + 1;
      
      if (retryCount < 3) {
        // Retry com backoff exponencial (1s, 2s, 4s)
        const delay = Math.pow(2, retryCount) * 1000;
        
        setTimeout(() => {
          channel.publish(
            'reservas.events',
            'reserva.confirmada',
            Buffer.from(JSON.stringify(event)),
            {
              headers: { 'x-retry-count': retryCount },
            },
          );
        }, delay);
        
        channel.ack(originalMsg);
      } else {
        // Mover para DLQ após 3 tentativas
        channel.publish(
          'reservas.events.dlq',
          'reserva.confirmada.failed',
          Buffer.from(JSON.stringify(event)),
        );
        
        channel.ack(originalMsg);
      }
    }
  }
}
```

---

## **6. CAMADA DE OBSERVABILIDADE**

### **6.1 Prometheus + Grafana (Métricas)**

```typescript
// Instrumentação customizada
import { Counter, Histogram, Registry } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

const reservasCriadas = new Counter({
  name: 'reservas_criadas_total',
  help: 'Total de reservas criadas',
  labelNames: ['espaco_id'],
});

// Middleware de métricas
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - start) / 1000;
        const res = context.switchToHttp().getResponse();
        
        httpRequestDuration
          .labels(req.method, req.route.path, res.statusCode)
          .observe(duration);
      }),
    );
  }
}

// Endpoint de métricas
@Controller('metrics')
export class MetricsController {
  @Get()
  async getMetrics() {
    return register.metrics();
  }
}
```

**Dashboards Grafana**
```json
{
  "dashboard": {
    "title": "Reservas - Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_count[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_count{status_code=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Reservas Criadas (últimas 24h)",
        "targets": [
          {
            "expr": "increase(reservas_criadas_total[24h])"
          }
        ]
      }
    ]
  }
}
```

### **6.2 Jaeger (Distributed Tracing)**

```typescript
// OpenTelemetry configuration
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces',
  }),
  serviceName: 'ms1-reservas',
});

sdk.start();

// Instrumentação manual
import { trace } from '@opentelemetry/api';

@Injectable()
export class ReservasService {
  async criarReserva(dto: CriarReservaDto): Promise<Reserva> {
    const tracer = trace.getTracer('reservas-service');
    const span = tracer.startSpan('criarReserva');
    
    try {
      span.setAttribute('reserva.espaco_id', dto.espacoId);
      span.setAttribute('reserva.cliente_id', dto.clienteId);
      
      // 1. Validar disponibilidade
      const spanValidacao = tracer.startSpan('validarDisponibilidade', {
        parent: span,
      });
      await this.validarDisponibilidade(dto);
      spanValidacao.end();
      
      // 2. Criar reserva
      const spanCriacao = tracer.startSpan('salvarReserva', {
        parent: span,
      });
      const reserva = await this.repo.save(dto);
      spanCriacao.end();
      
      // 3. Chamar MS2
      const spanPagamento = tracer.startSpan('criarCobranca', {
        parent: span,
      });
      await this.pagamentosClient.criarCobranca(reserva.id);
      spanPagamento.end();
      
      return reserva;
    } finally {
      span.end();
    }
  }
}
```

### **6.3 ELK Stack (Logs Centralizados)**

```typescript
// Winston + Elasticsearch
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const logger = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: {
        node: 'http://elasticsearch:9200',
      },
      index: 'logs-ms1-reservas',
    }),
  ],
});

// Structured logging
@Injectable()
export class ReservasService {
  private readonly logger = new Logger(ReservasService.name);
  
  async criarReserva(dto: CriarReservaDto): Promise<Reserva> {
    this.logger.log({
      message: 'Criando reserva',
      espacoId: dto.espacoId,
      clienteId: dto.clienteId,
      dataInicio: dto.dataInicio,
    });
    
    try {
      const reserva = await this.repo.save(dto);
      
      this.logger.log({
        message: 'Reserva criada com sucesso',
        reservaId: reserva.id,
      });
      
      return reserva;
    } catch (error) {
      this.logger.error({
        message: 'Erro ao criar reserva',
        error: error.message,
        stack: error.stack,
        espacoId: dto.espacoId,
      });
      
      throw error;
    }
  }
}
```

### **6.4 Sentry (Error Tracking)**

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Global exception filter
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    Sentry.captureException(exception);
    
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

---

## **7. TESTES**

### **7.1 Testes Unitários (Jest)**

```typescript
// reservas.service.spec.ts
describe('ReservasService', () => {
  let service: ReservasService;
  let repo: MockType<ReservasRepository>;
  let pagamentosClient: MockType<PagamentosClient>;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReservasService,
        {
          provide: ReservasRepository,
          useFactory: repositoryMockFactory,
        },
        {
          provide: PagamentosClient,
          useFactory: clientMockFactory,
        },
      ],
    }).compile();
    
    service = module.get(ReservasService);
    repo = module.get(ReservasRepository);
    pagamentosClient = module.get(PagamentosClient);
  });
  
  describe('criarReserva', () => {
    it('deve criar uma reserva com sucesso', async () => {
      // Arrange
      const dto = {
        espacoId: '123',
        clienteId: '456',
        dataInicio: new Date('2025-01-01T10:00:00'),
        dataFim: new Date('2025-01-01T12:00:00'),
      };
      
      repo.save.mockResolvedValue({ id: '789', ...dto });
      pagamentosClient.criarCobranca.mockResolvedValue({ id: 'pag-123' });
      
      // Act
      const result = await service.criarReserva(dto);
      
      // Assert
      expect(result.id).toBe('789');
      expect(repo.save).toHaveBeenCalledWith(dto);
      expect(pagamentosClient.criarCobranca).toHaveBeenCalled();
    });
    
    it('deve lançar erro se espaço não estiver disponível', async () => {
      // Arrange
      const dto = { /* ... */ };
      repo.findOverlappingReservas.mockResolvedValue([{ id: 'outra-reserva' }]);
      
      // Act & Assert
      await expect(service.criarReserva(dto)).rejects.toThrow('Espaço não disponível');
    });
  });
});
```

### **7.2 Testes de Integração**

```typescript
// reservas.integration.spec.ts
describe('Reservas Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PagamentosClient)
      .useValue(mockPagamentosClient)
      .compile();
    
    app = module.createNestApplication();
    await app.init();
    
    prisma = module.get(PrismaService);
  });
  
  afterAll(async () => {
    await prisma.clearDatabase();
    await app.close();
  });
  
  it('POST /reservas - deve criar reserva e chamar MS de pagamentos', async () => {
    // Arrange
    const espaco = await prisma.espaco.create({
      data: { nome: 'Sala A', capacidade: 10 },
    });
    
    // Act
    const response = await request(app.getHttpServer())
      .post('/reservas')
      .send({
        espacoId: espaco.id,
        clienteId: 'cliente-123',
        dataInicio: '2025-01-01T10:00:00',
        dataFim: '2025-01-01T12:00:00',
      })
      .expect(201);
    
    // Assert
    expect(response.body).toHaveProperty('id');
    expect(mockPagamentosClient.criarCobranca).toHaveBeenCalled();
    
    const reservaDb = await prisma.reserva.findUnique({
      where: { id: response.body.id },
    });
    expect(reservaDb).toBeDefined();
  });
});
```

### **7.3 Testes E2E**

```typescript
// e2e/reserva-flow.e2e.spec.ts
describe('Fluxo completo de reserva', () => {
  it('deve criar, pagar e confirmar uma reserva', async () => {
    // 1. Criar usuário
    const user = await createUser({ email: 'test@example.com' });
    const token = await login(user);
    
    // 2. Criar reserva
    const reserva = await request(app.getHttpServer())
      .post('/reservas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        espacoId: 'espaco-123',
        dataInicio: '2025-01-01T10:00:00',
        dataFim: '2025-01-01T12:00:00',
      })
      .expect(201);
    
    expect(reserva.body.status).toBe('PENDENTE_PAGAMENTO');
    
    // 3. Simular webhook do Stripe (pagamento aprovado)
    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .send({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            metadata: { reservaId: reserva.body.id },
          },
        },
      })
      .expect(200);
    
    // 4. Aguardar processamento assíncrono
    await sleep(2000);
    
    // 5. Verificar que reserva foi confirmada
    const reservaAtualizada = await request(app.getHttpServer())
      .get(`/reservas/${reserva.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(reservaAtualizada.body.status).toBe('CONFIRMADA');
    
    // 6. Verificar que email foi enviado
    expect(emailServiceMock.enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        to: user.email,
        template: 'reserva-confirmada',
      }),
    );
  });
});
```

### **7.4 Testes de Carga (k6)**

```javascript
// load-tests/create-reserva.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das requests < 500ms
    http_req_failed: ['rate<0.01'],   // < 1% de erros
  },
};

export default function () {
  const payload = JSON.stringify({
    espacoId: 'espaco-123',
    clienteId: `cliente-${__VU}`,
    dataInicio: '2025-01-01T10:00:00',
    dataFim: '2025-01-01T12:00:00',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`,
    },
  };

  const res = http.post('https://api.reservas.com/v1/reservas', payload, params);

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

---

## **8. CI/CD Pipeline**

### **8.1 GitHub Actions**

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
  
  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            myorg/ms1-reservas:latest
            myorg/ms1-reservas:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
  
  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - name: Deploy to Staging
        run: |
          kubectl set image deployment/ms1-reservas \
            ms1-reservas=myorg/ms1-reservas:${{ github.sha }} \
            --namespace=staging
  
  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Deploy to Production
        run: |
          kubectl set image deployment/ms1-reservas \
            ms1-reservas=myorg/ms1-reservas:${{ github.sha }} \
            --namespace=production
      
      - name: Run smoke tests
        run: npm run test:smoke
```

---

## **9. Infrastructure as Code (Terraform)**

```hcl
# terraform/main.tf

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "reservas-vpc"
  }
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "reservas-cluster"
  role_arn = aws_iam_role.cluster.arn
  version  = "1.28"
  
  vpc_config {
    subnet_ids = aws_subnet.private[*].id
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "ms1" {
  identifier           = "ms1-reservas-db"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t3.medium"
  allocated_storage    = 100
  storage_type         = "gp3"
  
  db_name  = "reservas"
  username = var.db_username
  password = var.db_password
  
  multi_az               = true
  backup_retention_period = 7
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  tags = {
    Environment = var.environment
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "reservas-redis"
  replication_group_description = "Redis cluster for caching"
  
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.t3.medium"
  num_cache_clusters   = 3
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "reservas-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
}
```

---

## **10. Kubernetes Deployment**

```yaml
# k8s/ms1-reservas/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ms1-reservas
  namespace: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: ms1-reservas
  template:
    metadata:
      labels:
        app: ms1-reservas
        version: v1
    spec:
      containers:
      - name: ms1-reservas
        image: myorg/ms1-reservas:latest
        ports:
        - containerPort: 3000
        
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ms1-reservas
  namespace: production
spec:
  selector:
    app: ms1-reservas
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ms1-reservas-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ms1-reservas
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

# ✅ **CHECKLIST COMPLETO DO PROJETO**

## **Arquitetura**
- [ ] API Gateway (Kong) configurado
- [ ] Load Balancer (Nginx/AWS ALB)
- [ ] BFF para Web, Mobile, Admin
- [ ] 4 Microserviços (Reservas, Pagamentos, Notificações, Auth)
- [ ] Event Bus (RabbitMQ/Kafka)
- [ ] Service Mesh (opcional: Istio)

## **Microserviços**
- [ ] CQRS implementado
- [ ] Event Sourcing (opcional)
- [ ] Saga Pattern para transações distribuídas
- [ ] Domain-Driven Design
- [ ] Clean Architecture / Hexagonal
- [ ] Repository Pattern
- [ ] Unit of Work

## **Banco de Dados**
- [ ] PostgreSQL com replicação (Master/Slave)
- [ ] Migrations automáticas
- [ ] Backup automatizado
- [ ] Point-in-time recovery

## **Cache**
- [ ] Redis Cluster
- [ ] Cache invalidation strategy
- [ ] Cache warming

## **Segurança**
- [ ] JWT + Refresh Token
- [ ] MFA (Two-Factor)
- [ ] OAuth2 (Google, Facebook)
- [ ] Rate Limiting
- [ ] CORS configurado
- [ ] Helmet.js
- [ ] Secrets Management (Vault/AWS Secrets)
- [ ] LGPD Compliance
- [ ] PCI DSS (pagamentos)

## **Observabilidade**
- [ ] Prometheus (métricas)
- [ ] Grafana (dashboards)
- [ ] Jaeger (tracing distribuído)
- [ ] ELK/Loki (logs centralizados)
- [ ] Sentry (error tracking)
- [ ] Health checks (/health, /health/ready)

## **Testes**
- [ ] Testes Unitários (>80% coverage)
- [ ] Testes de Integração
- [ ] Testes E2E
- [ ] Testes de Carga (k6)
- [ ] Testes de Contrato (Pact)
- [ ] Mutation Testing

## **CI/CD**
- [ ] GitHub Actions / GitLab CI
- [ ] Linting (ESLint)
- [ ] Formatação (Prettier)
- [ ] SonarQube (code quality)
- [ ] Dependabot (security vulnerabilities)
- [ ] Docker multi-stage builds
- [ ] Container scanning

## **Infraestrutura**
- [ ] Terraform / Pulumi
- [ ] Kubernetes (EKS/GKE/AKS)
- [ ] Helm Charts
- [ ] Horizontal Pod Autoscaler
- [ ] Ingress Controller
- [ ] Service Mesh (Istio/Linkerd)

## **Documentação**
- [ ] OpenAPI/Swagger
- [ ] Architecture Decision Records (ADRs)
- [ ] README completo
- [ ] Diagramas C4
- [ ] Runbooks para operação

## **Features Avançadas**
- [ ] Idempotência
- [ ] Circuit Breaker
- [ ] Retry com backoff exponencial
- [ ] Dead Letter Queue
- [ ] Feature Flags (LaunchDarkly/Unleash)
- [ ] A/B Testing
- [ ] Blue/Green Deployment
- [ ] Canary Releases

---

# 🎯 **ORDEM DE IMPLEMENTAÇÃO SUGERIDA**

## **Sprint 1-2: Fundação**
1. Setup inicial do monorepo
2. MS1 (Reservas) básico + PostgreSQL
3. MS4 (Auth) com JWT
4. Testes unitários básicos

## **Sprint 3-4: Pagamentos & Eventos**
5. MS2 (Pagamentos) + Stripe
6. RabbitMQ + Event Bus
7. Saga Pattern
8. Testes de integração

## **Sprint 5-6: Infraestrutura**
9. Docker Compose
10. Kubernetes local (Minikube/Kind)
11. CI/CD básico
12. Observabilidade (Prometheus + Grafana)

## **Sprint 7-8: Produção**
13. API Gateway (Kong)
14. BFF (Web + Mobile)
15. Load Balancer
16. Terraform
17. Deploy em cloud (AWS/GCP/Azure)

## **Sprint 9-10: Otimização**
18. Redis Cluster
19. Performance tuning
20. Testes de carga
21. Documentação completa

---