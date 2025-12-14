## **Unit of Work** 🔄

### **O que é?**
Um **padrão de design** (não específico de DDD) que mantém uma lista de objetos afetados por uma transação de negócio e **coordena a persistência dessas mudanças como uma única operação atômica**.

### **Conceito abstrato ou código específico?**
**Ambos!** É um conceito abstrato que **requer implementação concreta**.

### **Propósito**:
- Garantir **atomicidade** (tudo ou nada)
- Rastrear mudanças em memória
- Escrever no banco de dados **uma única vez** ao final
- Gerenciar **transações de banco de dados**

### **Exemplo Conceitual**:
```
Sem UoW:
1. Criar reserva → INSERT imediato
2. Atualizar inventário → UPDATE imediato  
3. Erro! Criar pagamento → FALHA
❌ Resultado: Dados inconsistentes (reserva criada mas pagamento falhou)

Com UoW:
1. Criar reserva → marcado para inserção (memória)
2. Atualizar inventário → marcado para update (memória)
3. Criar pagamento → marcado para inserção (memória)
4. uow.commit() → BEGIN TRANSACTION + todos os INSERTs/UPDATEs + COMMIT
✅ Resultado: Tudo ou nada
```

### **Código Exemplo (TypeScript/Node.js)**:

```typescript
// Interface do padrão
interface UnitOfWork {
  start(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// Implementação com Prisma (exemplo)
class PrismaUnitOfWork implements UnitOfWork {
  private transaction: any;

  async start() {
    // Inicia transação
  }

  async commit() {
    await this.transaction.$commit();
  }

  async rollback() {
    await this.transaction.$rollback();
  }
}

// Uso em um caso de uso
class CreateBookingUseCase {
  constructor(
    private bookingRepo: BookingRepository,
    private inventoryRepo: InventoryRepository,
    private uow: UnitOfWork
  ) {}

  async execute(data: BookingData) {
    await this.uow.start();
    
    try {
      // Todas as operações usam a mesma transação
      const booking = await this.bookingRepo.create(data);
      await this.inventoryRepo.decreaseAvailability(data.roomId);
      
      await this.uow.commit(); // Tudo persistido junto
    } catch (error) {
      await this.uow.rollback(); // Desfaz tudo
      throw error;
    }
  }
}
```

### **Escopo**:
- **Mesmo banco de dados**
- **Única transação ACID**
- **Síncrono**
- **Curta duração** (milissegundos)

---

## **Saga** 🎭

### **O que é?**
Um **padrão de orquestração** para gerenciar **transações distribuídas de longa duração** entre múltiplos serviços/agregados que **não compartilham o mesmo banco de dados**.

### **Conceito abstrato ou código específico?**
Principalmente **conceito abstrato** - há várias formas de implementar.

### **Propósito**:
- Manter **consistência eventual** em sistemas distribuídos
- Coordenar operações entre **múltiplos serviços**
- Implementar **compensação** (reverter operações em caso de falha)

### **Problema que resolve**:
```
Cenário: Criar reserva em microserviços

Serviço 1 (Booking): Cria reserva ✅
    ↓
Serviço 2 (Payment): Processa pagamento ✅
    ↓
Serviço 3 (Notification): Envia email ❌ FALHA!

❓ Como desfazer a reserva e o pagamento que já foram commitados?
→ Não dá para usar transação ACID tradicional (bancos diferentes)
→ Solução: SAGA com compensações
```

### **Tipos de Saga**:

#### **1. Choreography (Coreografia)** - Descentralizada
Serviços reagem a eventos, sem coordenador central:

```typescript
// BookingService
async createBooking(data) {
  const booking = await this.repo.save(data);
  
  // Publica evento
  await this.eventBus.publish(new BookingCreatedEvent(booking));
}

// PaymentService (escuta eventos)
@EventHandler(BookingCreatedEvent)
async handleBookingCreated(event) {
  try {
    await this.processPayment(event.bookingId);
    await this.eventBus.publish(new PaymentSucceededEvent(...));
  } catch (error) {
    // Publica evento de falha
    await this.eventBus.publish(new PaymentFailedEvent(...));
  }
}

// BookingService (escuta falhas)
@EventHandler(PaymentFailedEvent)
async handlePaymentFailed(event) {
  // COMPENSAÇÃO: cancela a reserva
  await this.cancelBooking(event.bookingId);
  await this.eventBus.publish(new BookingCancelledEvent(...));
}
```

#### **2. Orchestration (Orquestração)** - Centralizada
Um coordenador (saga manager) controla o fluxo:

```typescript
// Saga Orchestrator
class BookingCreationSaga {
  async execute(data: BookingData) {
    const sagaState = { bookingId: null, paymentId: null };
    
    try {
      // Passo 1: Criar reserva
      sagaState.bookingId = await this.bookingService.create(data);
      
      // Passo 2: Processar pagamento
      sagaState.paymentId = await this.paymentService.process(data);
      
      // Passo 3: Enviar notificação
      await this.notificationService.send(data);
      
      return sagaState.bookingId;
      
    } catch (error) {
      // COMPENSAÇÃO em ordem reversa
      if (sagaState.paymentId) {
        await this.paymentService.refund(sagaState.paymentId);
      }
      if (sagaState.bookingId) {
        await this.bookingService.cancel(sagaState.bookingId);
      }
      throw error;
    }
  }
}
```

### **Escopo**:
- **Múltiplos bancos/serviços**
- **Sem transação ACID global**
- **Assíncrono** (geralmente)
- **Longa duração** (segundos, minutos, até dias)

---

## **Comparação Direta**

| Aspecto | Unit of Work | Saga |
|---------|--------------|------|
| **Escopo** | Mesma transação DB | Múltiplos serviços |
| **Consistência** | ACID (imediata) | Eventual |
| **Duração** | Milissegundos | Segundos a dias |
| **Rollback** | ROLLBACK automático | Compensação manual |
| **Complexidade** | Baixa | Alta |
| **Quando usar** | Operações no mesmo agregado/DB | Operações entre agregados/serviços |

---

## **Exemplo Prático no seu Sistema de Booking**

### **Cenário 1: Criar reserva simples** → **Unit of Work**
```
- Criar registro de booking
- Atualizar disponibilidade do quarto
- Criar histórico de auditoria

→ Tudo no mesmo banco, mesma transação
→ UoW garante atomicidade
```

### **Cenário 2: Processo completo de reserva** → **Saga**
```
1. BookingService: Criar reserva (DB1)
2. PaymentService: Cobrar cartão (API externa + DB2)
3. InventoryService: Bloquear quarto (DB3)
4. NotificationService: Enviar confirmação (Email API)

→ Múltiplos serviços/DBs
→ Saga coordena + implementa compensações se falhar
```

---

## **Podem ser usados juntos?**

**SIM!** É comum:

```typescript
// Saga Orchestrator
class BookingCreationSaga {
  async execute(data: BookingData) {
    try {
      // Cada serviço usa UoW internamente
      const bookingId = await this.bookingService.create(data); 
      // ↑ Internamente usa UoW para sua própria transação
      
      const paymentId = await this.paymentService.process(data);
      // ↑ Internamente usa UoW para sua própria transação
      
    } catch (error) {
      // Saga faz compensação entre serviços
    }
  }
}
```

---

## **Resumindo**

- **Unit of Work**: Padrão **tático** para gerenciar transações em **um único banco**. Requer código específico.
- **Saga**: Padrão **estratégico** para coordenar operações entre **múltiplos serviços**. Conceito abstrato com várias implementações possíveis.

**No DDD**:
- **UoW**: Usado dentro de um **Bounded Context** para persistir agregados
- **Saga**: Usado para coordenar **entre Bounded Contexts**

## **Por que Saga quase sempre usa Pub/Sub (eventos assíncronos)?**

### **O Problema de manter execução \"viva\"**:

```typescript
// ❌ IMPOSSÍVEL manter isso rodando por dias
class BookingCreationSaga {
  async execute(data: BookingData) {
    const booking = await this.bookingService.create(data);
    
    // Imagina que o pagamento demora 3 dias para confirmar (boleto, transferência)
    const payment = await this.paymentService.process(data); 
    // ↑ O processo HTTP ficaria travado por 3 DIAS?
    // ↑ E se o servidor reiniciar? Perde tudo?
    
    await this.notificationService.send(data);
  }
}
```

**Problemas**:
- Conexão HTTP timeout
- Processo seria morto
- Memória ocupada indefinidamente
- Se servidor reiniciar, perde o estado
- Impossível escalar

---

## **Solução: Pub/Sub + Persistência de Estado**

### **Abordagem 1: Choreography com Eventos** (mais comum para sagas longas)

```typescript
// ========================================
// PASSO 1: BookingService cria reserva
// ========================================
class BookingService {
  async createBooking(data: BookingData) {
    const booking = await this.repo.save({
      ...data,
      status: 'PENDING_PAYMENT'
    });
    
    // Publica evento e TERMINA a execução
    await this.eventBus.publish(new BookingCreatedEvent({
      bookingId: booking.id,
      amount: booking.totalAmount,
      userId: booking.userId
    }));
    
    return booking;
    // ↑ Função termina aqui! Não fica esperando
  }
}

// ========================================
// PASSO 2: PaymentService escuta (pode ser dias depois)
// ========================================
class PaymentService {
  @EventHandler(BookingCreatedEvent)
  async handleBookingCreated(event: BookingCreatedEvent) {
    // Cria cobrança (ex: boleto com vencimento em 3 dias)
    const payment = await this.repo.save({
      bookingId: event.bookingId,
      status: 'WAITING_PAYMENT',
      dueDate: addDays(new Date(), 3)
    });
    
    // Função termina, mas deixa um webhook configurado
    await this.configurePaymentWebhook(payment.id);
  }
  
  // ========================================
  // PASSO 3: Webhook chamado quando pagamento confirmar (3 dias depois)
  // ========================================
  async handlePaymentWebhook(paymentId: string) {
    const payment = await this.repo.findById(paymentId);
    payment.status = 'PAID';
    await this.repo.save(payment);
    
    // Publica novo evento
    await this.eventBus.publish(new PaymentConfirmedEvent({
      bookingId: payment.bookingId,
      paymentId: payment.id
    }));
  }
}

// ========================================
// PASSO 4: BookingService escuta confirmação (3 dias depois do início)
// ========================================
class BookingService {
  @EventHandler(PaymentConfirmedEvent)
  async handlePaymentConfirmed(event: PaymentConfirmedEvent) {
    const booking = await this.repo.findById(event.bookingId);
    booking.status = 'CONFIRMED';
    await this.repo.save(booking);
    
    await this.eventBus.publish(new BookingConfirmedEvent({
      bookingId: booking.id
    }));
  }
  
  // Compensação se pagamento expirar
  @EventHandler(PaymentExpiredEvent)
  async handlePaymentExpired(event: PaymentExpiredEvent) {
    await this.cancelBooking(event.bookingId);
  }
}
```

**Timeline**:
```
Dia 1, 10:00 → Usuário cria reserva
              ↓ BookingCreatedEvent
Dia 1, 10:01 → PaymentService cria boleto
              [processo termina, aguarda webhook]
              
              ... 3 dias depois ...
              
Dia 4, 15:30 → Usuário paga boleto
              ↓ Webhook recebido
              ↓ PaymentConfirmedEvent
Dia 4, 15:31 → BookingService confirma reserva
              ↓ BookingConfirmedEvent
Dia 4, 15:32 → NotificationService envia email
```

---

## **Abordagem 2: Orchestration com Estado Persistido**

Para sagas longas com orquestração, você precisa **persistir o estado da saga**:

```typescript
// ========================================
// Entidade que guarda o estado da saga
// ========================================
interface SagaState {
  id: string;
  bookingId: string;
  currentStep: 'BOOKING_CREATED' | 'PAYMENT_PENDING' | 'PAYMENT_CONFIRMED' | 'COMPLETED';
  compensating: boolean;
  data: any;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// Saga Orchestrator
// ========================================
class BookingCreationSagaOrchestrator {
  
  // Inicia a saga
  async start(bookingData: BookingData) {
    // Cria estado persistido
    const saga = await this.sagaRepo.save({
      currentStep: 'BOOKING_CREATED',
      data: bookingData,
      compensating: false
    });
    
    // Executa primeiro passo
    const booking = await this.bookingService.create(bookingData);
    saga.bookingId = booking.id;
    saga.currentStep = 'PAYMENT_PENDING';
    await this.sagaRepo.save(saga);
    
    // Solicita pagamento (assíncrono)
    await this.eventBus.publish(new InitiatePaymentCommand({
      sagaId: saga.id,
      bookingId: booking.id,
      amount: bookingData.totalAmount
    }));
    
    // ↑ Função termina aqui!
  }
  
  // Continua a saga quando pagamento confirmar
  @EventHandler(PaymentConfirmedEvent)
  async handlePaymentConfirmed(event: PaymentConfirmedEvent) {
    // Recupera estado da saga
    const saga = await this.sagaRepo.findById(event.sagaId);
    
    if (saga.currentStep !== 'PAYMENT_PENDING') {
      return; // Evento duplicado ou fora de ordem
    }
    
    // Avança para próximo passo
    saga.currentStep = 'PAYMENT_CONFIRMED';
    await this.sagaRepo.save(saga);
    
    // Envia notificação
    await this.notificationService.send(saga.bookingId);
    
    // Finaliza saga
    saga.currentStep = 'COMPLETED';
    await this.sagaRepo.save(saga);
  }
  
  // Compensa se pagamento expirar
  @EventHandler(PaymentExpiredEvent)
  async handlePaymentExpired(event: PaymentExpiredEvent) {
    const saga = await this.sagaRepo.findById(event.sagaId);
    
    saga.compensating = true;
    await this.sagaRepo.save(saga);
    
    // Cancela reserva
    await this.bookingService.cancel(saga.bookingId);
    
    saga.currentStep = 'COMPLETED';
    await this.sagaRepo.save(saga);
  }
}
```

---

## **Tecnologias Pub/Sub comuns para Sagas**

### **Message Brokers**:
- **RabbitMQ**: Filas persistentes, retry automático, dead letter queues
- **Apache Kafka**: Log distribuído, replay de eventos
- **AWS SQS/SNS**: Gerenciado, escala automática
- **Google Pub/Sub**: Similar ao SNS
- **Redis Pub/Sub**: Mais simples, mas perde mensagens se subscriber offline

### **Frameworks de Saga**:
- **NestJS Saga** (Node.js)
- **MassTransit** (.NET)
- **Axon Framework** (Java)
- **Temporal/Cadence**: Workflow engines que gerenciam estado automaticamente

---

## **Sagas Curtas vs Longas**

### **Saga Curta (segundos)** - Pode ser síncrona ou assíncrona

```typescript
// Exemplo: Reserva + Pagamento com cartão (1-5 segundos no total)
// Pode usar HTTP síncrono com timeout adequado
class QuickBookingSaga {
  async execute(data: BookingData) {
    try {
      const booking = await this.bookingService.create(data); // 200ms
      const payment = await this.paymentService.charge(data); // 2s (chamada API gateway)
      await this.notificationService.sendEmail(booking.id); // 500ms
      return booking;
    } catch (error) {
      // Compensação síncrona
      if (booking) await this.bookingService.cancel(booking.id);
      throw error;
    }
  }
}
```

### **Saga Longa (minutos/dias)** - **DEVE** ser assíncrona com Pub/Sub

```typescript
// Exemplo: Reserva + Boleto bancário (até 3 dias)
// OBRIGATÓRIO usar eventos + persistência de estado
```

---

## **Exemplo Prático: Sistema de Booking**

### **Fluxo com Pub/Sub**:

```
┌─────────────┐
│   User API  │
└──────┬──────┘
       │ POST /bookings
       ↓
┌─────────────────┐      BookingCreated      ┌─────────────────┐
│ Booking Service │─────────────────────────→│ Payment Service │
└─────────────────┘                          └────────┬────────┘
       ↑                                              │
       │                                              │ (aguarda webhook)
       │                                              ↓
       │                                      [3 dias depois...]
       │                                              │
       │          PaymentConfirmed                    │
       │←─────────────────────────────────────────────┘
       │
       ↓
   [Atualiza status]
       │
       │         BookingConfirmed
       ├────────────────────────────→┌──────────────────────┐
                                     │ Notification Service │
                                     └──────────────────────┘
```

**Persistência**:
```sql
-- Tabela de eventos (Event Store)
CREATE TABLE saga_events (
  id UUID PRIMARY KEY,
  saga_id UUID,
  event_type VARCHAR,
  payload JSONB,
  created_at TIMESTAMP,
  processed BOOLEAN
);

-- Tabela de estado da saga
CREATE TABLE saga_state (
  id UUID PRIMARY KEY,
  booking_id UUID,
  current_step VARCHAR,
  status VARCHAR, -- 'RUNNING' | 'COMPLETED' | 'COMPENSATING' | 'FAILED'
  data JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## **Resumindo**

✅ **Sim, Saga quase sempre usa Pub/Sub** porque:
1. Não dá para manter processo HTTP/execução viva por dias
2. Precisa sobreviver a restarts do servidor
3. Precisa escalar horizontalmente
4. Eventos permitem retry automático
5. Desacopla serviços

✅ **Estado precisa ser persistido** (banco de dados ou event store)

✅ **Choreography** (eventos) é mais comum para sagas longas

✅ **Orchestration** também usa eventos, mas com coordenador que mantém estado

Quer que eu mostre um exemplo completo de implementação com RabbitMQ ou Kafka para o seu sistema?