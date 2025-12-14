## **1. Arquivos Locais** ✅ (abordagem básica)

Sim, você pode salvar logs em arquivos no servidor:

```
/var/log/booking-system/
├── app.log
├── error.log
├── access.log
└── app.2025-12-13.log  (rotacionado)
```

**Vantagens**:
- Simples de implementar
- Não depende de serviços externos
- Útil para debugging local

**Problemas**:
- Em sistemas distribuídos, logs ficam espalhados em múltiplos servidores
- Difícil de pesquisar/consultar
- Arquivos crescem indefinidamente (precisa de rotação)
- Perde logs se o servidor falhar
- Como você vai analisar logs de 10 serviços diferentes em 5 servidores?

## **2. Centralização de Logs** 🎯 (recomendado para produção)

A solução moderna é **enviar logs para um sistema centralizado**:

### **Arquitetura Típica**:
```
[Seus Serviços] 
    ↓ (envia logs via stdout ou agent)
[Coletor/Agregador] (ex: Fluentd, Logstash, Vector)
    ↓ (processa e envia)
[Storage/Indexação] (ex: Elasticsearch, Loki, CloudWatch)
    ↓ (consulta via)
[Visualização] (ex: Kibana, Grafana, Console Web)
```

### **Opções Populares**:

**Stack ELK (Elasticsearch + Logstash + Kibana)**:
- Elasticsearch: armazena e indexa logs
- Logstash/Fluentd: coleta e processa logs
- Kibana: interface para buscar e visualizar
- **Uso**: On-premise ou self-hosted

**Grafana Loki**:
- Mais leve que ELK
- Integra bem com Grafana (que você já usaria para métricas)
- **Uso**: Kubernetes, ambientes cloud-native

**Cloud Providers**:
- AWS CloudWatch Logs
- Google Cloud Logging
- Azure Monitor
- **Uso**: Se você já está na nuvem

**SaaS**:
- Datadog
- New Relic
- Splunk
- **Uso**: Solução gerenciada (cara, mas completa)

## **3. Como funciona na prática?**

### **Opção 1: Stdout + Coletor** (recomendada para containers)
```javascript
// Seu código simplesmente escreve para stdout
console.log(JSON.stringify({
  level: 'info',
  message: 'Booking created',
  booking_id: 123
}));

// Um agent (Fluentd/Vector) captura e envia para o destino
```

### **Opção 2: SDK direto**
```javascript
// Envia direto para CloudWatch/Datadog/etc
logger.info('Booking created', { booking_id: 123 });
// SDK envia via HTTP para o serviço
```

### **Opção 3: Híbrida** (arquivo local + envio assíncrono)
```javascript
// Escreve em arquivo E envia para serviço centralizado
// Se o serviço cair, logs ficam no arquivo local
```

## **4. Rotação de Logs** (se usar arquivos)

Para evitar que arquivos cresçam infinitamente:

```bash
# logrotate (Linux) - configuração exemplo
/var/log/booking-system/*.log {
    daily                 # rotaciona diariamente
    rotate 7             # mantém 7 dias
    compress             # comprime logs antigos
    delaycompress        # não comprime o mais recente
    missingok            # não erro se arquivo não existir
    notifempty           # não rotaciona se vazio
}
```

## **5. Recomendação para seu Sistema de Booking**

**Fase de desenvolvimento**:
- Logs no **stdout** (terminal) + arquivos locais simples
- Fácil de debugar

**Produção (começo)**:
- **Grafana Loki** + Promtail (coletor)
  - Open-source, gratuito
  - Fácil de rodar com Docker
  - Integra com Grafana (métricas + logs no mesmo lugar)

**Produção (escalando)**:
- Se já usa AWS: **CloudWatch Logs**
- Se precisa de análise complexa: **ELK Stack**
- Se quer algo gerenciado e tem budget: **Datadog**

## **Exemplo Prático - Docker Compose com Loki**

```yaml
version: '3'
services:
  booking-api:
    image: your-booking-api
    logging:
      driver: \"json-file\"  # ou loki driver
      
  loki:
    image: grafana/loki:latest
    ports:
      - \"3100:3100\"
      
  promtail:  # coleta logs dos containers
    image: grafana/promtail:latest
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers
      
  grafana:
    image: grafana/grafana:latest
    ports:
      - \"3000:3000\"
```

Depois você acessa Grafana → Explore → seleciona Loki → busca logs:
```
{container=\"booking-api\"} |= \"error\"
```

---

1. **Domain/Application** define o **CONTRATO** (interface/port)
2. **Infrastructure** implementa o **ADAPTADOR** concreto
3. **Dependency Injection** injeta a implementação em runtime

Isso se chama **Dependency Inversion Principle** (o \"D\" do SOLID).

---

## **Arquitetura Correta**

```
┌─────────────────────────────────────────────────────────────┐
│                         DOMAIN                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  // Sem dependências externas                      │     │
│  │  class Booking { ... }                             │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │  // Define o CONTRATO (interface/port)             │     │
│  │  interface ILogger {                               │     │
│  │    info(message: string, context?: object): void   │     │
│  │    error(message: string, error?: Error): void     │     │
│  │  }                                                  │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  // Use Case depende da ABSTRAÇÃO                  │     │
│  │  class CreateBookingUseCase {                      │     │
│  │    constructor(                                     │     │
│  │      private bookingRepo: IBookingRepository,      │     │
│  │      private logger: ILogger  // ← INTERFACE       │     │
│  │    ) {}                                            │     │
│  │                                                     │     │
│  │    async execute(data: BookingData) {              │     │
│  │      this.logger.info('Creating booking', data);   │     │
│  │      // ...                                        │     │
│  │    }                                               │     │
│  │  }                                                  │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                            │
│  ┌────────────────────────────────────────────────────┐     │
│  │  // Implementação com console (dev)                │     │
│  │  class ConsoleLogger implements ILogger {          │     │
│  │    info(message: string, context?: object) {       │     │
│  │      console.log(message, context);                │     │
│  │    }                                               │     │
│  │  }                                                  │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  // Implementação com Loki (prod) - futuro         │     │
│  │  class LokiLogger implements ILogger {             │     │
│  │    constructor(private lokiClient: LokiClient) {}  │     │
│  │                                                     │     │
│  │    info(message: string, context?: object) {       │     │
│  │      this.lokiClient.push({                        │     │
│  │        level: 'info',                              │     │
│  │        message,                                    │     │
│  │        labels: { service: 'booking' },             │     │
│  │        ...context                                  │     │
│  │      });                                           │     │
│  │    }                                               │     │
│  │  }                                                  │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## **Estrutura de Pastas**

```
src/
├── domain/
│   └── booking/
│       ├── entities/
│       │   └── Booking.ts
│       └── value-objects/
│           └── BookingStatus.ts
│
├── application/
│   ├── ports/                          # ← CONTRATOS aqui!
│   │   ├── ILogger.ts                  # Interface de logging
│   │   ├── IBookingRepository.ts
│   │   └── IEventBus.ts
│   │
│   └── use-cases/
│       └── CreateBookingUseCase.ts     # Depende de ILogger
│
└── infrastructure/
    ├── logging/                         # ← IMPLEMENTAÇÕES aqui!
    │   ├── ConsoleLogger.ts            # Para dev
    │   ├── LokiLogger.ts               # Para prod (quando configurar)
    │   └── PinoLogger.ts               # Outra opção
    │
    ├── persistence/
    │   └── PrismaBookingRepository.ts  # Implementa IBookingRepository
    │
    └── di/                             # Dependency Injection
        └── container.ts                # Configura qual implementação usar
```

---

## **Código Prático**

### **1. Defina o contrato (Application Layer)**

```typescript
// src/application/ports/ILogger.ts

export interface LogContext {
  [key: string]: any;
}

export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
}
```

### **2. Use Case depende da abstração**

```typescript
// src/application/use-cases/CreateBookingUseCase.ts

import { ILogger } from '../ports/ILogger';
import { IBookingRepository } from '../ports/IBookingRepository';

export class CreateBookingUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly logger: ILogger  // ← Interface, não implementação!
  ) {}

  async execute(data: CreateBookingDTO): Promise<Booking> {
    this.logger.info('Creating booking', { 
      userId: data.userId, 
      roomId: data.roomId 
    });

    try {
      const booking = Booking.create(data);
      await this.bookingRepository.save(booking);
      
      this.logger.info('Booking created successfully', { 
        bookingId: booking.id 
      });
      
      return booking;
      
    } catch (error) {
      this.logger.error('Failed to create booking', error as Error, { 
        userId: data.userId 
      });
      throw error;
    }
  }
}
```

### **3. Implementação Simples (Infrastructure - começo)**

```typescript
// src/infrastructure/logging/ConsoleLogger.ts

import { ILogger, LogContext } from '../../application/ports/ILogger';

export class ConsoleLogger implements ILogger {
  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    console.debug(this.formatMessage('debug', message, context));
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const fullContext = {
      ...context,
      error: error?.message,
      stack: error?.stack
    };
    console.error(this.formatMessage('error', message, fullContext));
  }
}
```

### **4. Dependency Injection Container**

```typescript
// src/infrastructure/di/container.ts

import { ILogger } from '../../application/ports/ILogger';
import { ConsoleLogger } from '../logging/ConsoleLogger';
import { LokiLogger } from '../logging/LokiLogger';
import { CreateBookingUseCase } from '../../application/use-cases/CreateBookingUseCase';

class DIContainer {
  private static instance: DIContainer;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.registerServices();
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  private registerServices() {
    // Escolhe implementação baseado no ambiente
    const logger: ILogger = process.env.NODE_ENV === 'production'
      ? new LokiLogger(/* config */)
      : new ConsoleLogger();
    
    this.services.set('ILogger', logger);
    
    // Registra outros serviços
    // this.services.set('IBookingRepository', new PrismaBookingRepository());
  }

  resolve<T>(serviceName: string): T {
    return this.services.get(serviceName);
  }

  // Factory para use cases
  createBookingUseCase(): CreateBookingUseCase {
    return new CreateBookingUseCase(
      this.resolve('IBookingRepository'),
      this.resolve('ILogger')  // ← Injeta a implementação correta
    );
  }
}

export const container = DIContainer.getInstance();
```

### **5. Uso no Controller/Handler**

```typescript
// src/infrastructure/http/BookingController.ts

import { container } from '../di/container';

export class BookingController {
  async createBooking(req: Request, res: Response) {
    const useCase = container.createBookingUseCase();
    
    const booking = await useCase.execute(req.body);
    
    res.status(201).json(booking);
  }
}
```

---

## **Implementação Futura com Loki**

Quando você estiver pronto para adicionar Loki:

```typescript
// src/infrastructure/logging/LokiLogger.ts

import { ILogger, LogContext } from '../../application/ports/ILogger';
import { createLogger } from 'winston';
import LokiTransport from 'winston-loki';

export class LokiLogger implements ILogger {
  private logger;

  constructor() {
    this.logger = createLogger({
      transports: [
        new LokiTransport({
          host: process.env.LOKI_URL || 'http://localhost:3100',
          labels: { service: 'booking-system' },
          json: true,
          format: winston.format.json(),
          replaceTimestamp: true,
          onConnectionError: (err) => console.error(err)
        })
      ]
    });
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, {
      ...context,
      error: error?.message,
      stack: error?.stack
    });
  }

  // ... outros métodos
}
```

**E você NÃO PRECISA MUDAR NADA** no Application Layer! 🎉

---

## **Respondendo suas perguntas**

### **\"É melhor já configurar Grafana/Loki antes de qualquer coisa?\"**

**NÃO!** Faça assim:

**Fase 1 (AGORA)**:
- ✅ Defina a interface `ILogger` na Application Layer
- ✅ Implemente `ConsoleLogger` simples
- ✅ Use nos Use Cases
- ✅ Continue desenvolvendo funcionalidades

**Fase 2 (Quando tiver mais código)**:
- ✅ Adicione `PinoLogger` ou similar (melhor que console, mas ainda simples)
- ✅ Logs estruturados em JSON para stdout

**Fase 3 (Indo pra produção)**:
- ✅ Configure Docker Compose com Loki + Grafana
- ✅ Implemente `LokiLogger`
- ✅ Mude o container DI para usar LokiLogger em prod
- ✅ **ZERO MUDANÇAS** no Application/Domain!

### **\"Grafana/Loki fica na infra, não posso importar no Application/Domain né?\"**

**CORRETO!** E a solução é:
- Application define **O QUE** precisa (ILogger)
- Infrastructure define **COMO** faz (ConsoleLogger, LokiLogger)
- DI Container **conecta** os dois

---

## **Padrão Completo - Ports & Adapters (Hexagonal)**

```typescript
// APPLICATION LAYER - Define PORTS (interfaces)
export interface ILogger { ... }
export interface IEventBus { ... }
export interface IBookingRepository { ... }

// INFRASTRUCTURE LAYER - Implementa ADAPTERS
export class ConsoleLogger implements ILogger { ... }
export class RabbitMQEventBus implements IEventBus { ... }
export class PrismaBookingRepository implements IBookingRepository { ... }

// DI Container - Conecta tudo
container.register('ILogger', ConsoleLogger);
container.register('IEventBus', RabbitMQEventBus);
container.register('IBookingRepository', PrismaBookingRepository);
```

---

## **Benefícios dessa abordagem**

✅ **Testabilidade**: Mock fácil nos testes
```typescript
// test
const mockLogger: ILogger = {
  info: jest.fn(),
  error: jest.fn(),
  // ...
};

const useCase = new CreateBookingUseCase(mockRepo, mockLogger);
```

✅ **Flexibilidade**: Troca implementação sem quebrar nada
```typescript
// Dev: ConsoleLogger
// Staging: PinoLogger
// Prod: LokiLogger
// Testes: MockLogger
```

✅ **Independência**: Domain/Application não conhece Loki, Winston, Pino, etc.

✅ **SOLID**: Dependency Inversion Principle aplicado corretamente

---

## **Resumindo**


**Contratos**:
- Interface `ILogger` na Application Layer
- `ConsoleLogger` simples na Infrastructure
- Use nos Use Cases

**Implementações**:
- `LokiLogger` implementando a mesma interface
- Configuração Docker Compose
- Troca no DI Container

**NUNCA faça**:
- ❌ `import { Loki } from 'winston-loki'` no Application Layer
- ❌ `console.log()` direto no Use Case
- ❌ Dependência concreta no construtor do Use Case
