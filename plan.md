# = Plataforma de Reservas de Espaços - Plano de Implementação (Hardcore Mode)

> **Objetivo:** Projeto "pro-level all the way" para demonstração de senioridade
>
> **Escopo:** Backend completo (4 microserviços) sem frontend
>
> **Timeline:** Até completar (projeto de longo prazo, ~3-5 meses)

---

## = Avaliação do Planejamento: **8.0/10** 

###  Pontos Fortes
- **Arquitetura:** Kong + Microserviços bem definidos
- **DDD:** Guia pragmático excelente ([ddd.md](ddd.md))
- **Segurança:** RS256, MFA, OAuth2, Rate Limiting
- **Observabilidade:** Stack completa (Prometheus, Grafana, Jaeger, ELK)
- **Testes:** Unitários, Integração, E2E, Carga (k6)
- **IDs:** Base62 + Redis justificado corretamente

###  Pontos de Atenção
- Detalhar regras de negócio específicas (cancelamento, conflitos)
- Adicionar circuit breakers explícitos entre MS
- Criar ADRs para decisões arquiteturais
- Setup Redis Sentinel para HA

---

## < Arquitetura

### Stack Tecnológica

**Backend:**
- NestJS + TypeScript
- PostgreSQL (1 DB por MS, replicação master/slave)
- Redis Sentinel (HA para geração de IDs)
- RabbitMQ (event bus)

**API Gateway:**
- Kong (com PostgreSQL próprio)
- JWT validation (RS256)
- Rate limiting
- API versioning
- Metrics, tracing

**Observabilidade:**
- Prometheus + Grafana (métricas)
- Jaeger (distributed tracing)
- ELK Stack (logs)
- Sentry (error tracking)

**Infraestrutura:**
- Docker Compose (local)
- Kubernetes (futuro)
- GitHub Actions (CI/CD)

### Microserviços

#### MS1: Reservas & Disponibilidade
- **Responsabilidades:**
  - CRUD de Espaços
  - Criar/Cancelar/Confirmar Reservas
  - Consultar Disponibilidade
  - Validação de conflitos

- **Padrões:**
  - DDD completo (Aggregates, Value Objects, Domain Events)
  - CQRS (Commands/Queries separados)
  - Repository Pattern
  - Saga Pattern (orquestração com MS2)

- **Database:** PostgreSQL (master + 2 replicas)
- **Cache:** Redis (disponibilidade, TTL 1min)

#### MS2: Pagamentos & Cobranças
- **Responsabilidades:**
  - Integração Stripe
  - Criar/Confirmar/Estornar cobranças
  - Webhook handling
  - Histórico de transações

- **Padrões:**
  - Event Sourcing (EventStoreDB ou PostgreSQL + events table)
  - Idempotência (anti-duplicação)
  - Saga Pattern (compensação em caso de falha)

- **Database:** PostgreSQL + Event Store
- **Cache:** Redis (idempotency keys)

#### MS3: Notificações
- **Responsabilidades:**
  - Email (SendGrid/Resend)
  - SMS (Twilio) - opcional
  - Push (Firebase) - opcional
  - Event listeners (ReservaConfirmada, PagamentoRecusado, etc)

- **Database:** MongoDB (histrico append-only)

#### MS4: Gesto de Usuários & Auth
- **Responsabilidades:**
  - Registro/Login
  - JWT generation (RS256 com private key)
  - Refresh Token
  - MFA (TOTP)
  - OAuth2 (Google)
  - User CRUD

- **Database:** PostgreSQL
- **Cache:** Redis (refresh tokens, sessions)

### Fluxo de Autenticao (RS256)

```
1. User  MS4: POST /auth/login
2. MS4: Gera JWT assinado com PRIVATE KEY (RS256)
3. MS4  User: { accessToken, refreshToken }
4. User  Kong: Authorization: Bearer <token>
5. Kong: Valida JWT com PUBLIC KEY (MS4 distribuiu)
6. Kong  MS1/MS2/MS3: Request (com headers de user)
7. MS1/MS2/MS3: Valida JWT novamente (defense in depth)
                Valida AUTORIZAO (user pode fazer ESTA ao?)
```

**Chaves:**
- MS4 tem: PRIVATE KEY (assina tokens)
- Kong, MS1, MS2, MS3 tm: PUBLIC KEY (valida tokens)
- Rotao de chaves: Cada 90 dias (manual inicial, depois automatizado)

---

## < Gerao de IDs: Base62 + Redis Sentinel

### Deciso
Usar Redis INCR + ofuscao Base62 com Redis Sentinel para HA.

### Justificativa
```
 Globalmente nico (Redis centralizado)
 IDs curtos (6-8 chars: "res_a3Bx9")
 Ordenados por criação
 Anti-enumeration (ofuscao Base62)
 Performance altssima (Redis in-memory)
 HA garantida (Sentinel failover automtico)
```

### Arquitetura

```
MS1, MS2, MS3, MS4
       
  RedisIdGenerator
       
  Redis Sentinel (3 nodes)
       
  Redis Master (+ 2 slaves)
```

### Implementação

```typescript
// src/shared/infrastructure/id-generator/redis-id.service.ts
@Injectable()
export class RedisIdGenerator {
  constructor(
    @Inject('REDIS_SENTINEL') private redis: Redis,
    private base62: Base62Service,
  ) {}

  async generate(prefix: string): Promise<string> {
    const id = await this.redis.incr(`id:${prefix}`);
    const encoded = this.base62.encode(id);
    return `${prefix}_${encoded}`;
  }
}

// Uso:
const reservaId = await idGenerator.generate('res'); // "res_a3Bx9"
const clienteId = await idGenerator.generate('cli'); // "cli_b2Cy8"
const pagamentoId = await idGenerator.generate('pag'); // "pag_c4Dz7"
```

### Failover Strategy
- Se Redis Master cair: Sentinel promove slave automaticamente (<30s)
- Se todo Redis cair: MS lana exception (fail fast, sem IDs duplicados)

---

## < Regras de Negcio (A DETALHAR)

### 1. Conflitos de Reserva

| Cenário | Reserva A | Reserva B | Ação |
|---------|-----------|-----------|------|
| Overlap total | 10h-12h | 10h-12h | L BLOQUEAR |
| Overlap parcial | 10h-12h | 11h-13h | L BLOQUEAR |
| Back-to-back | 10h-12h | 12h-14h |  VERIFICAR BUFFER |
| Sem conflito | 10h-12h | 14h-16h |  PERMITIR |

**Regra de Buffer Time:**
- Default: 15 minutos entre reservas
- Configurável por espaço (ex: sala de reunião = 15min, auditório = 30min)
- Admin pode override

**SQL para detectar conflitos:**
```sql
SELECT * FROM reservas
WHERE espaco_id = $1
  AND status IN ('CONFIRMADA', 'PENDENTE_PAGAMENTO')
  AND (
    -- Overlap detection
    (data_inicio < $3 AND data_fim > $2)
    OR
    -- Back-to-back com buffer
    (data_fim + interval '15 minutes' > $2 AND data_inicio < $3)
  );
```

### 2. Política de Cancelamento

| Quando | Cliente | Admin | Reembolso |
|--------|---------|-------|-----------|
| >24h antes |  Pode |  Pode | 100% |
| 12-24h antes |  Pode |  Pode | 50% |
| <12h antes | L No pode |  Pode | 0% |
| Após início | L No pode |  Pode (motivo) | 0% |

**Excees:**
- Force majeure (admin marca como "excepcional"): 100%
- Problema no espaço (admin cancela): 100% + crédito bônus

### 3. Precificação

**Base:**
```typescript
valor = precoPorHora  duracaoEmHoras
```

**Multiplicadores (futuro):**
```typescript
interface Multiplicador {
  horarioPico: number;      // Sex-Sab 18h-23h: 1.5x
  diaUtil: number;          // Seg-Sex: 1.0x, Sab-Dom: 1.2x
  antecedencia: number;     // >30 dias: 0.8x
}
```

**Taxas Adicionais:**
- Limpeza: R$ 50 fixo
- Equipamentos extras: Varivel (projetor R$ 100, coffee break R$ 200)

### 4. Limites Operacionais

- Antecedência mínima: 2 horas
- Antecedência máxima: 180 dias
- Duração mínima: 1 hora
- Duração máxima: 24 horas
- Max reservas simultneas por cliente: 5

---

## = Padrões e Patterns

### CQRS (Command Query Responsibility Segregation)

**Commands (escrita):**
```typescript
// MS1 - Reservas
class CriarReservaCommand {
  constructor(
    public readonly espacoId: string,
    public readonly clienteId: string,
    public readonly dataInicio: Date,
    public readonly dataFim: Date,
  ) {}
}

@CommandHandler(CriarReservaCommand)
export class CriarReservaHandler implements ICommandHandler {
  async execute(command: CriarReservaCommand): Promise<Result<Reserva>> {
    // 1. Validar domínio
    const periodo = PeriodoReserva.create(command.dataInicio, command.dataFim);
    if (periodo.isFailure) return Result.fail(periodo.error);

    // 2. Verificar conflitos
    const conflitos = await this.repo.findOverlapping(
      command.espacoId,
      periodo.value
    );
    if (conflitos.length > 0) {
      return Result.fail(new EspacoIndisponivelError());
    }

    // 3. Criar agregado
    const reserva = Reserva.create({
      espacoId: EspacoId.create(command.espacoId),
      clienteId: ClienteId.create(command.clienteId),
      periodo: periodo.value,
    });

    // 4. Persistir
    await this.repo.save(reserva);

    // 5. Emitir eventos
    await this.eventBus.publish(reserva.domainEvents);

    return Result.ok(reserva);
  }
}
```

**Queries (leitura):**
```typescript
@QueryHandler(ListarReservasQuery)
export class ListarReservasHandler implements IQueryHandler {
  async execute(query: ListarReservasQuery): Promise<ReservaDto[]> {
    // Usa read replica
    return this.repo.findMany({
      clienteId: query.clienteId,
      dataInicio: { gte: query.periodoInicio },
    });
  }
}
```

### Saga Pattern (Orquestrao Distribuída)

**Fluxo: Criar Reserva  Criar Cobrana  Confirmar Reserva**

```typescript
@Injectable()
export class ReservaSaga {
  // 1. Reserva criada  Criar cobrança
  @Saga()
  reservaCriada = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(ReservaCriadaEvent),
      map((event) => new CriarCobrancaCommand(
        event.reservaId,
        event.clienteId,
        event.valor,
      )),
    );
  };

  // 2. Pagamento aprovado  Confirmar reserva
  @Saga()
  pagamentoAprovado = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PagamentoAprovadoEvent),
      mergeMap((event) => [
        new ConfirmarReservaCommand(event.reservaId, event.pagamentoId),
        new EnviarNotificacaoCommand('reserva-confirmada', event.clienteId),
      ]),
    );
  };

  // 3. Pagamento recusado  Cancelar reserva (compensação)
  @Saga()
  pagamentoRecusado = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PagamentoRecusadoEvent),
      mergeMap((event) => [
        new CancelarReservaCommand(event.reservaId, 'PAGAMENTO_RECUSADO'),
        new EnviarNotificacaoCommand('pagamento-recusado', event.clienteId),
      ]),
    );
  };
}
```

### Domain Events

```typescript
// Domnio
class Reserva extends AggregateRoot {
  private domainEvents: DomainEvent[] = [];

  criar(): void {
    // Lógica de criação...
    this.addDomainEvent(new ReservaCriadaEvent(
      this.id,
      this.espacoId,
      this.clienteId,
      this.valor,
    ));
  }

  confirmar(pagamentoId: string): void {
    this.status = 'CONFIRMADA';
    this.pagamentoId = pagamentoId;
    this.addDomainEvent(new ReservaConfirmadaEvent(this.id, pagamentoId));
  }
}

// Repositório publica eventos ao salvar
@Injectable()
export class ReservasRepository {
  async save(reserva: Reserva): Promise<void> {
    await this.db.save(reserva);

    // Outbox Pattern (garantia de entrega)
    for (const event of reserva.domainEvents) {
      await this.outbox.insert({
        eventType: event.constructor.name,
        payload: JSON.stringify(event),
        status: 'PENDING',
      });
    }

    reserva.clearDomainEvents();
  }
}
```

### Event Sourcing (MS2 - Pagamentos)

```typescript
// Event Store
class PagamentoAggregate {
  private id: string;
  private version: number = 0;
  private status: string;

  static fromEvents(events: DomainEvent[]): PagamentoAggregate {
    const aggregate = new PagamentoAggregate();
    events.forEach(event => aggregate.apply(event));
    return aggregate;
  }

  apply(event: DomainEvent): void {
    switch (event.constructor) {
      case CobrancaCriadaEvent:
        this.id = event.pagamentoId;
        this.status = 'PENDENTE';
        break;
      case PagamentoAprovadoEvent:
        this.status = 'APROVADO';
        break;
      case PagamentoRecusadoEvent:
        this.status = 'RECUSADO';
        break;
    }
    this.version++;
  }
}

// Uso
const events = await eventStore.getEvents(pagamentoId);
const pagamento = PagamentoAggregate.fromEvents(events);
// Estado reconstrudo a partir de eventos
```

---

## = Resiliência

### Circuit Breakers

```typescript
// MS1  MS2 (criar cobrança)
@Injectable()
export class PagamentosClient {
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,      // 5 falhas consecutivas
    successThreshold: 2,      // 2 sucessos para fechar
    timeout: 5000,            // 5s timeout
    resetTimeout: 30000,      // 30s Até tentar novamente
  });

  async criarCobranca(dto: CriarCobrancaDto): Promise<Cobranca> {
    return this.circuitBreaker.execute(async () => {
      return this.httpClient.post('/pagamentos', dto, {
        timeout: 5000,
        retry: {
          count: 3,
          delay: (attempt) => Math.pow(2, attempt) * 1000, // Backoff exponencial
        },
      });
    });
  }
}
```

### Graceful Degradation

```typescript
// MS1 - Se MS2 estiver fora, ainda cria reserva
async criarReserva(dto: CriarReservaDto): Promise<Reserva> {
  const reserva = await this.criarReservaLocal(dto);

  try {
    await this.pagamentosClient.criarCobranca({
      reservaId: reserva.id,
      valor: reserva.valor,
    });
  } catch (error) {
    // MS2 fora? Cria reserva com status "PENDENTE_COBRANCA"
    // Event listener vai retry quando MS2 voltar
    this.logger.warn('MS2 indisponível, reserva criada sem cobrança', {
      reservaId: reserva.id,
    });

    // Emite evento para retry posterior
    this.eventBus.publish(new ReservaSemCobrancaEvent(reserva.id));
  }

  return reserva;
}
```

### Dead Letter Queue

```typescript
// RabbitMQ config
export const rabbitmqConfig = {
  exchanges: [
    { name: 'reservas.events', type: 'topic' },
    { name: 'reservas.events.dlq', type: 'topic' },
  ],
  queues: [
    {
      name: 'reservas.confirmacao',
      deadLetterExchange: 'reservas.events.dlq',
      messageTtl: 60000, // 1 min
    },
  ],
};

// Retry com backoff
@EventPattern('reserva.confirmada')
async handleReservaConfirmada(@Payload() event: any, @Ctx() context: RmqContext) {
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();

  try {
    await this.processEvent(event);
    channel.ack(originalMsg);
  } catch (error) {
    const retryCount = originalMsg.properties.headers['x-retry-count'] || 0;

    if (retryCount < 3) {
      // Retry com backoff (1s, 2s, 4s)
      setTimeout(() => {
        channel.publish('reservas.events', 'reserva.confirmada',
          Buffer.from(JSON.stringify(event)),
          { headers: { 'x-retry-count': retryCount + 1 } }
        );
      }, Math.pow(2, retryCount) * 1000);

      channel.ack(originalMsg);
    } else {
      // Após 3 tentativas  DLQ
      channel.publish('reservas.events.dlq', 'reserva.confirmada.failed',
        Buffer.from(JSON.stringify(event))
      );
      channel.ack(originalMsg);
    }
  }
}
```

---

## > Estratégia de Testes

### Pirmide de Testes

```
        E2E (5%)
       /      \
    Integration (15%)
   /              \
  Unit Tests (80%)
```

### 1. Testes Unitários (>90% coverage)

```typescript
// MS1 - CriarReservaHandler.spec.ts
describe('CriarReservaHandler', () => {
  let handler: CriarReservaHandler;
  let repo: jest.Mocked<ReservasRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CriarReservaHandler,
        { provide: ReservasRepository, useValue: createMock() },
      ],
    }).compile();

    handler = module.get(CriarReservaHandler);
    repo = module.get(ReservasRepository);
  });

  it('deve criar reserva quando espaço disponível', async () => {
    repo.findOverlapping.mockResolvedValue([]);

    const command = new CriarReservaCommand(
      'espaco-1',
      'cliente-1',
      new Date('2025-01-01T10:00'),
      new Date('2025-01-01T12:00')
    );

    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('deve falhar quando espaço indisponível', async () => {
    repo.findOverlapping.mockResolvedValue([{ id: 'outra-reserva' }]);

    const result = await handler.execute(command);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(EspacoIndisponivelError);
  });
});
```

### 2. Testes de Integração (banco real)

```typescript
// MS1 - reservas.integration.spec.ts
describe('Reservas Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.clearDatabase();
    await app.close();
  });

  it('POST /reservas - deve criar e persistir no banco', async () => {
    const espaco = await prisma.espaco.create({
      data: { nome: 'Sala A', capacidade: 10, precoPorHora: 50 },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/reservas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        espacoId: espaco.id,
        dataInicio: '2025-01-01T10:00:00Z',
        dataFim: '2025-01-01T12:00:00Z',
      })
      .expect(201);

    const reservaDb = await prisma.reserva.findUnique({
      where: { id: response.body.id },
    });

    expect(reservaDb).toBeDefined();
    expect(reservaDb.status).toBe('PENDENTE_PAGAMENTO');
  });
});
```

### 3. Testes E2E (fluxo completo)

```typescript
// test/e2e/reserva-flow.e2e.spec.ts
describe('Fluxo Completo: Criar Reserva  Pagar  Confirmar', () => {
  it('deve completar fluxo end-to-end', async () => {
    // 1. Cadastro
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({ nome: 'Joo', email: 'joao@test.com', password: 'Senha@123' })
      .expect(201);

    // 2. Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'joao@test.com', password: 'Senha@123' })
      .expect(200);

    const token = loginRes.body.accessToken;

    // 3. Criar reserva
    const reservaRes = await request(app)
      .post('/api/v1/reservas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        espacoId: 'espaco-123',
        dataInicio: '2025-02-01T14:00:00Z',
        dataFim: '2025-02-01T16:00:00Z',
      })
      .expect(201);

    const reservaId = reservaRes.body.id;
    expect(reservaRes.body.status).toBe('PENDENTE_PAGAMENTO');

    // 4. Simular webhook Stripe (pagamento aprovado)
    await request(app)
      .post('/api/v1/webhooks/stripe')
      .send({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            metadata: { reservaId },
          },
        },
      })
      .expect(200);

    // 5. Aguardar processamento assíncrono
    await sleep(3000);

    // 6. Verificar confirmao
    const reservaAtualizada = await request(app)
      .get(`/api/v1/reservas/${reservaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(reservaAtualizada.body.status).toBe('CONFIRMADA');
  });
});
```

### 4. Contract Testing (Pact)

```typescript
// MS1  MS2 contract
describe('MS1  MS2 Contract', () => {
  const provider = new Pact({
    consumer: 'MS1-Reservas',
    provider: 'MS2-Pagamentos',
  });

  it('deve criar cobrança no formato esperado', async () => {
    await provider.addInteraction({
      state: 'reserva criada',
      uponReceiving: 'request para criar cobrança',
      withRequest: {
        method: 'POST',
        path: '/api/v1/pagamentos',
        headers: { 'Content-Type': 'application/json' },
        body: {
          reservaId: like('res_a3Bx9'),
          clienteId: like('cli_b2Cy8'),
          valor: like(100),
        },
      },
      willRespondWith: {
        status: 201,
        body: {
          id: like('pag_c4Dz7'),
          status: 'PENDENTE',
          checkoutUrl: like('https://stripe.com/checkout/xxx'),
        },
      },
    });

    // MS1 faz request
    const response = await ms1Client.criarCobranca({
      reservaId: 'res_a3Bx9',
      clienteId: 'cli_b2Cy8',
      valor: 100,
    });

    expect(response.id).toBe('pag_c4Dz7');
  });
});
```

### 5. Load Testing (k6)

```javascript
// load-tests/create-reserva.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Stay
    { duration: '2m', target: 200 },   // Spike
    { duration: '5m', target: 200 },   // Stay
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% < 500ms
    http_req_failed: ['rate<0.01'],    // <1% erro
  },
};

export default function () {
  const payload = JSON.stringify({
    espacoId: 'espaco-123',
    clienteId: `cliente-${__VU}`,
    dataInicio: '2025-01-01T10:00:00Z',
    dataFim: '2025-01-01T12:00:00Z',
  });

  const res = http.post(
    'http://localhost:8000/api/v1/reservas',
    payload,
    { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
  );

  check(res, {
    'status 201': (r) => r.status === 201,
    'tempo <500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

---

##  Observabilidade

### Mtricas (Prometheus)

```typescript
// src/shared/observability/metrics.service.ts
@Injectable()
export class MetricsService {
  // Contadores
  httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total de requests HTTP',
    labelNames: ['method', 'route', 'status_code'],
  });

  reservasCriadas = new Counter({
    name: 'reservas_criadas_total',
    help: 'Total de reservas criadas',
    labelNames: ['espaco_id', 'status'],
  });

  // Histogramas (latência)
  httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duração de requests em segundos',
    labelNames: ['method', 'route'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10],
  });

  // Gauges (valores instantneos)
  activeReservations = new Gauge({
    name: 'active_reservations',
    help: 'Reservas ativas agora',
  });
}
```

### Distributed Tracing (Jaeger)

```typescript
// OpenTelemetry setup
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

async criarReserva(dto: CriarReservaDto): Promise<Reserva> {
  const tracer = trace.getTracer('reservas-service');

  return tracer.startActiveSpan('criarReserva', async (span) => {
    span.setAttribute('reserva.espaco_id', dto.espacoId);

    try {
      const reserva = await this.repo.save(dto);
      span.setStatus({ code: SpanStatusCode.OK });
      return reserva;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Logs Estruturados (ELK)

```typescript
// Winston + Elasticsearch
const logger = WinstonModule.createLogger({
  transports: [
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: { node: 'http://elasticsearch:9200' },
      index: 'logs-ms1-reservas',
    }),
  ],
});

// Uso
this.logger.log({
  message: 'Reserva criada',
  reservaId: reserva.id,
  espacoId: reserva.espacoId,
  clienteId: reserva.clienteId,
  valor: reserva.valor,
});
```

### Dashboards Grafana

**Dashboard: Reservas Overview**
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate (%)
- Reservas criadas/hora
- Taxa de ocupação por espaço
- RabbitMQ queue depth
- Redis cache hit rate

---

## = Estrutura de Pastas (DDD)

```
apps/
 ms1-reservas/
    src/
       modules/
          reservas/
             domain/
                entities/
                   reserva.entity.ts
                value-objects/
                   periodo-reserva.vo.ts
                   money.vo.ts
                repositories/
                   reservas.repository.interface.ts
                events/
                    reserva-criada.event.ts
                    reserva-confirmada.event.ts
             application/
                commands/
                   criar-reserva/
                      criar-reserva.command.ts
                      criar-reserva.handler.ts
                queries/
                   listar-reservas/
                       listar-reservas.query.ts
                       listar-reservas.handler.ts
                sagas/
                    reserva.saga.ts
             infrastructure/
                persistence/
                   typeorm/
                       entities/
                          reserva.schema.ts
                       repositories/
                           reservas.repository.ts
                messaging/
                   rabbitmq/
                       reserva-events.publisher.ts
                http/
                    clients/
                        pagamentos.client.ts
             presentation/
                 controllers/
                    reservas.controller.ts
                 dto/
                     criar-reserva.dto.ts
                     reserva-response.dto.ts
          espacos/
              ... (mesma estrutura)
       shared/
          auth/
             guards/
                jwt-auth.guard.ts
                roles.guard.ts
             decorators/
                 current-user.decorator.ts
          filters/
          interceptors/
          pipes/
       config/
           database.config.ts
           rabbitmq.config.ts
    test/
        unit/
        integration/
        e2e/
 ms2-pagamentos/
 ms3-auth/
 packages/
     @app/domain/
        value-objects/
           email.vo.ts
           cpf.vo.ts
        base/
            entity.base.ts
            aggregate-root.base.ts
     @app/common/
        decorators/
        filters/
        utils/
     @app/testing/
         mocks/
         factories/
 ms4-notificacoes/
```

---

## = Plano de Implementação (14-20 semanas)

### FASE 0: Fundação (1-2 semanas)

**Objetivos:**
- Setup monorepo
- Docker Compose base
- CI/CD pipeline
- Shared libraries

**Tarefas:**
- [ ] Criar monorepo (Turborepo)
- [ ] Configurar ESLint, Prettier, Biome
- [ ] Docker Compose:
  - [ ] Kong + PostgreSQL (Kong DB)
  - [ ] Redis Sentinel (master + 3 sentinels)
  - [ ] PostgreSQL (4 databases)
  - [ ] RabbitMQ
  - [ ] Prometheus + Grafana
  - [ ] Jaeger
  - [ ] Elasticsearch + Kibana
- [ ] GitHub Actions:
  - [ ] Lint + Format
  - [ ] Unit tests
  - [ ] Build Docker images
- [ ] Shared packages:
  - [ ] @app/domain (Value Objects, base entities)
  - [ ] @app/common (guards, filters, decorators)
  - [ ] @app/testing (mocks, factories)

---

### FASE 1: MS4 (Auth) - Primeiro sempre (2-3 semanas)

**Por que primeiro?**
Todos outros MS dependem de autenticao.

**Funcionalidades:**
- [ ] Registro de usuário
- [ ] Login com JWT (RS256)
- [ ] Refresh Token
- [ ] MFA (TOTP com speakeasy)
- [ ] OAuth2 (Google via Passport)
- [ ] User CRUD
- [ ] Distribuir public key para outros MS

**Testes:**
- [ ] Unit (>90% coverage)
- [ ] Integration (testcontainers)
- [ ] E2E (fluxo completo auth)

**Kong:**
- [ ] Configurar rotas pblicas: `/auth/login`, `/auth/register`
- [ ] Configurar rotas protegidas: `/users/*`
- [ ] Plugin JWT validation

**Observabilidade:**
- [ ] Mtricas (login rate, token generation rate)
- [ ] Tracing (cada request tem trace ID)
- [ ] Logs estruturados

---

### FASE 2: MS1 (Reservas) - Core do Negcio (3-4 semanas)

**DDD Exemplar:**
- [ ] Agregados: Reserva (raiz), Disponibilidade
- [ ] Value Objects: PeriodoReserva, Money, EspacoId
- [ ] Domain Events: ReservaCriada, ReservaConfirmada, ReservaCancelada
- [ ] Repositories: ReservasRepo, EspacosRepo

**Funcionalidades:**
- [ ] CRUD de Espaços
- [ ] Criar Reserva (com validao de conflitos)
- [ ] Cancelar Reserva (com regras de poltica)
- [ ] Confirmar Reserva (aps pagamento)
- [ ] Listar Reservas (com filtros)
- [ ] Consultar Disponibilidade

**CQRS:**
- [ ] Commands: CriarReserva, CancelarReserva, ConfirmarReserva
- [ ] Queries: ObterReserva, ListarReservas, ConsultarDisponibilidade

**Performance:**
- [ ] Indexes: `(espaco_id, data_inicio, data_fim)`
- [ ] Cache Redis (disponibilidade, TTL 1min)
- [ ] Read replica para queries pesadas

**Testes:**
- [ ] Unit (agregados, value objects, handlers)
- [ ] Integration (repository, conflitos)
- [ ] E2E (criar  cancelar)

---

### FASE 3: MS2 (Pagamentos) - Integração Crítica (2-3 semanas)

**Funcionalidades:**
- [ ] Integração Stripe
- [ ] Criar Cobrana
- [ ] Webhook Stripe (confirmar/rejeitar)
- [ ] Estorno (cancelamento de reserva)
- [ ] Listar Transaes

**Event Sourcing:**
- [ ] EventStoreDB setup
- [ ] Event stream para cada pagamento
- [ ] Reconstruir estado a partir de eventos
- [ ] Snapshotting (a cada 100 eventos)

**Idempotência:**
- [ ] Redis cache (chave: reservaId)
- [ ] Evitar cobranças duplicadas

**Saga:**
- [ ] ReservaCriada  CriarCobranca
- [ ] PagamentoAprovado  ConfirmarReserva
- [ ] PagamentoRecusado  CancelarReserva (compensação)

**Resiliência:**
- [ ] Circuit Breaker para Stripe
- [ ] Retry com backoff (3 tentativas)
- [ ] Dead Letter Queue

**Testes:**
- [ ] Unit (event sourcing, idempotncia)
- [ ] Integration (webhook handling)
- [ ] E2E (fluxo completo com mock Stripe)

---

### FASE 4: MS3 (Notificações) - Fire-and-Forget (1-2 semanas)

**Funcionalidades:**
- [ ] Email (SendGrid ou Resend)
- [ ] SMS (Twilio) - opcional
- [ ] Push (Firebase) - opcional

**Templates:**
- [ ] Reserva Confirmada
- [ ] Reserva Cancelada
- [ ] Lembrete (1 dia antes)
- [ ] Pagamento Aprovado/Recusado

**Event Listeners:**
- [ ] ReservaConfirmada  Enviar Email
- [ ] ReservaCancelada  Enviar Email
- [ ] PagamentoRecusado  Enviar Email

**Histórico:**
- [ ] MongoDB (append-only log)
- [ ] Query: "Quais emails para clienteX?"

**Testes:**
- [ ] Unit (template rendering)
- [ ] Integration (mock SendGrid)

---

### FASE 5: Integração e Resiliência (2-3 semanas)

**Circuit Breakers:**
- [ ] MS1  MS2 (criar cobrança)
- [ ] MS1  MS4 (validar permissões - se necessário)

**Contract Testing (Pact):**
- [ ] MS1  MS2 contracts
- [ ] MS1  MS4 contracts

**Load Testing:**
- [ ] k6 scenarios:
  - [ ] Normal: 100 req/s  10min
  - [ ] Pico: 500 req/s  5min
  - [ ] Stress: aumentar Até quebrar
- [ ] Analisar bottlenecks
- [ ] Otimizaes necessrias

**Chaos Engineering (opcional hardcore):**
- [ ] Toxiproxy: injetar latência/erros
- [ ] Derrubar MS2 aleatoriamente
- [ ] Verificar degradao graceful

---

### FASE 6: Observabilidade Showcase (1-2 semanas)

**Grafana Dashboards:**
- [ ] Overview Dashboard:
  - [ ] Request rate (req/s)
  - [ ] Error rate (%)
  - [ ] Response time (p50, p95, p99)
- [ ] Per-service Dashboard
- [ ] Business Metrics:
  - [ ] Reservas criadas/hora
  - [ ] Taxa de ocupação por espaço
  - [ ] Receita total
- [ ] Infrastructure:
  - [ ] RabbitMQ queue depth
  - [ ] Redis memory usage
  - [ ] PostgreSQL connections

**Distributed Tracing:**
- [ ] Trace completo: Cliente  Kong  MS1  MS2  Stripe
- [ ] Identificar bottlenecks
- [ ] Screenshots de traces reais

**Alerting:**
- [ ] Error rate > 1%
- [ ] P95 latency > 500ms
- [ ] RabbitMQ queue > 1000 msgs
- [ ] Redis memory > 80%

---

### FASE 7: Documentação Final (1 semana)

**ADRs (Architecture Decision Records):**
- [ ] ADR-001: Por que NestJS? (vs Express/Fastify)
- [ ] ADR-002: Por que Kong? (vs Nginx/AWS API Gateway)
- [ ] ADR-003: Por que Base62+Redis para IDs? (vs UUID/Snowflake)
- [ ] ADR-004: Por que PostgreSQL para Reservas? (vs MongoDB)
- [ ] ADR-005: Por que RabbitMQ? (vs Kafka/AWS SQS)
- [ ] ADR-006: Por que Event Sourcing no MS2? (trade-offs)
- [ ] ADR-007: Por que RS256? (vs HS256)

**Diagramas:**
- [ ] C4: Context (sistema inteiro)
- [ ] C4: Container (microserviços)
- [ ] C4: Component (MS1 interno)
- [ ] Sequence Diagrams (fluxos crticos):
  - [ ] Criar Reserva  Pagar  Confirmar
  - [ ] Cancelar Reserva  Estornar
  - [ ] Autenticao (login, refresh token)
- [ ] Deployment Diagram (Docker Compose)

**OpenAPI:**
- [ ] Swagger completo de cada MS
- [ ] Exportar para arquivo `.yaml`

**Runbooks:**
- [ ] Como fazer rollback de deploy
- [ ] Como fazer failover do Redis
- [ ] Como debugar evento perdido no RabbitMQ
- [ ] Como investigar lentidão (tracing + logs)

**README Principal:**
- [ ] Visão geral do projeto
- [ ] Como rodar local (Docker Compose)
- [ ] Como rodar testes
- [ ] Screenshots de dashboards
- [ ] Links para ADRs, diagramas

---

## = Próximos Passos Imediatos

### 1. Criar ADRs Crticos (2-3 dias)

Template ADR:
```markdown
# ADR-001: Escolha do Framework Backend (NestJS)

## Status
Aceito

## Contexto
Precisamos escolher framework Node.js para microserviços.

Opções consideradas:
- NestJS
- Express puro
- Fastify

## Deciso
Usar NestJS.

## Consequências

PRÓS:
-  TypeScript first-class
-  Dependency Injection nativo
-  Suporte built-in para CQRS, Event Sourcing
-  Estrutura opinativa (menos decisões)
-  Decorators (@Controller, @Injectable)

CONTRAS:
- L Curva de aprendizado
- L Overhead de abstrações
- L ~5% mais lento que Express puro

## Quando Revisitar
Se performance virar gargalo crtico (>10k req/s) e profiling apontar NestJS como bottleneck.
```

**Criar:**
- [ ] ADR-001: NestJS vs Express/Fastify
- [ ] ADR-002: Kong vs Nginx vs AWS API Gateway
- [ ] ADR-003: Base62+Redis vs UUID vs Snowflake
- [ ] ADR-004: PostgreSQL vs MongoDB para Reservas
- [ ] ADR-005: RabbitMQ vs Kafka vs AWS SQS

---

### 2. Detalhar Regras de Negcio (1-2 dias)

**Criar arquivos:**

`docs/business-rules/conflitos-reserva.md`:
```markdown
# Regras de Conflito de Reservas

## Matriz de Conflitos

| Reserva A | Reserva B | Conflito? | Motivo |
|-----------|-----------|-----------|--------|
| 10h-12h | 10h-12h |  SIM | Overlap total |
| 10h-12h | 11h-13h |  SIM | Overlap parcial |
| 10h-12h | 12h-14h |  DEPENDE | Buffer time |
| 10h-12h | 12h15-14h | L NO | 15min buffer OK |

## SQL de Detecção

```sql
SELECT * FROM reservas
WHERE espaco_id = $1
  AND status IN ('CONFIRMADA', 'PENDENTE_PAGAMENTO')
  AND (
    (data_inicio < $3 AND data_fim > $2) -- Overlap
    OR
    (data_fim + interval '15 minutes' > $2 AND data_inicio < $3) -- Buffer
  );
```

## Buffer Time

- **Padro:** 15 minutos
- **Configurável:** Por espaço (campo `buffer_minutes`)
- **Exemplos:**
  - Sala reunião: 15min (limpeza rápida)
  - Auditrio: 30min (limpeza + setup)
  - Quadra esportiva: 0min (sem buffer)
```

`docs/business-rules/cancelamento.md`:
`docs/business-rules/precificacao.md`:

---

### 3. Setup Inicial (3-5 dias)

**Criar estrutura:**
```bash
# Criar monorepo
npx create-turbo@latest

# Estrutura
booking-management-system/
 apps/
    ms1-reservas/
    ms2-pagamentos/
    ms3-notificacoes/
    ms4-auth/
 packages/
    @app/domain/
    @app/common/
    @app/testing/
 docker/
    docker-compose.yml
    kong/
       kong.yml (declarative config)
    redis/
       sentinel.conf
    postgres/
        init.sql
 docs/
    adrs/
    architecture/
    business-rules/
    runbooks/
 .github/
    workflows/
        ci.yml
 README.md
```

**Docker Compose v1:**
```yaml
version: '3.8'

services:
  # Kong
  kong-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: kong
      POSTGRES_DB: kong
      POSTGRES_PASSWORD: kong

  kong:
    image: kong:3.4-alpine
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: kong-db
      KONG_PG_USER: kong
      KONG_PG_PASSWORD: kong
      KONG_PROXY_LISTEN: 0.0.0.0:8000
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
    ports:
      - "8000:8000"  # Proxy
      - "8001:8001"  # Admin API
    depends_on:
      - kong-db

  # Redis Sentinel
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes

  redis-sentinel-1:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./docker/redis/sentinel.conf:/etc/redis/sentinel.conf

  # PostgreSQL (MS1)
  postgres-ms1:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: reservas
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret

  # RabbitMQ
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "15672:15672"  # Management UI

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml

  # Grafana
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"

  # Jaeger
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
```

---

### 4. Comear MS4 (Auth)

**Estrutura inicial:**
```bash
cd apps/ms4-auth
nest new . --skip-git
```

**Instalar dependncias:**
```bash
npm install @nestjs/passport @nestjs/jwt passport-jwt
npm install @nestjs/typeorm typeorm pg
npm install bcrypt speakeasy qrcode
npm install --save-dev @types/bcrypt @types/speakeasy
```

**Primeiro teste (TDD):**
```typescript
// src/modules/auth/application/commands/registrar-usuario/registrar-usuario.handler.spec.ts
describe('RegistrarUsuarioHandler', () => {
  it('deve registrar usuário com senha hasheada', async () => {
    // Arrange
    const command = new RegistrarUsuarioCommand(
      'Joo Silva',
      'joao@example.com',
      'Senha@123'
    );

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value.email).toBe('joao@example.com');
    expect(result.value.senha).not.toBe('Senha@123'); // Deve estar hasheada
  });
});
```

---

## < Critérios de Sucesso

### Funcionalidades
- [ ] 4 microserviços funcionando
- [ ] Fluxo completo: Criar Reserva  Pagar  Confirmar  Notificar
- [ ] Kong validando JWT
- [ ] Event-driven (RabbitMQ)
- [ ] Event Sourcing no MS2

### Qualidade
- [ ] Cobertura de testes >90%
- [ ] Testes E2E passando
- [ ] Load test: >100 req/s com <500ms p95
- [ ] Zero warnings no CI

### Observabilidade
- [ ] Dashboards Grafana funcionando
- [ ] Distributed tracing completo (screenshots)
- [ ] Logs estruturados no Elasticsearch

### Documentação
- [ ] 5+ ADRs escritos
- [ ] Diagramas C4 completos
- [ ] OpenAPI de cada MS
- [ ] README com setup instructions
- [ ] Runbooks operacionais

### Demonstrao de Senioridade
- [ ] DDD bem implementado (agregados, value objects)
- [ ] CQRS + Event Sourcing funcionando
- [ ] Circuit Breakers demonstrados
- [ ] Contract testing (Pact)
- [ ] Performance tuning (indexes, cache)
- [ ] Security hardening (RS256, rate limiting)

---

## = Referências

### Arquitetura
- [Domain-Driven Design - Eric Evans](https://www.domainlanguage.com/ddd/)
- [Implementing DDD - Vaughn Vernon](https://vaughnvernon.com/)
- [Building Microservices - Sam Newman](https://samnewman.io/books/building_microservices/)

### Patterns
- [Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CQRS](https://martinfowler.com/bliki/CQRS.html)

### NestJS
- [NestJS Documentation](https://docs.nestjs.com/)
- [NestJS CQRS](https://docs.nestjs.com/recipes/cqrs)

### Observabilidade
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [OpenTelemetry](https://opentelemetry.io/)

---

## Lembretes

1. **Qualidade > Velocidade** (no tem deadline,  showcase)
2. **TDD religioso** (testes antes do cdigo)
3. **Documentação contnua** (ADRs, diagramas)
4. **Observabilidade desde o início** (métricas, logs, tracing)
5. **Demonstre trade-offs** (justifique cada deciso)
