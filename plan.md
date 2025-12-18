# Planejamento Arquitetural - Sistema de Reservas (Airbnb-like)

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura de Microserviços](#arquitetura-de-microserviços)
3. [Divisão de Serviços](#divisão-de-serviços)
4. [Estratégia de Consistência Distribuída](#estratégia-de-consistência-distribuída)
5. [Autenticação e Autorização](#autenticação-e-autorização)
6. [Fluxos de Negócio](#fluxos-de-negócio)
7. [Tecnologias e Ferramentas](#tecnologias-e-ferramentas)
8. [Patterns Aplicados](#patterns-aplicados)

---

## Visão Geral

Sistema de cadastro e agendamento de reservas tipo Airbnb, implementado com arquitetura de microserviços production-grade.

### Objetivos
- ✅ Validação de senioridade técnica
- ✅ Sistema robusto a nível produção
- ✅ Aplicação completa de patterns de sistemas distribuídos
- ✅ Alta disponibilidade e resiliência

### Requisitos Técnicos
- Arquitetura de microserviços
- Cada serviço com banco de dados próprio
- Consistência eventual aceitável
- Event-driven architecture
- API Gateway como ponto único de entrada
- Distributed tracing e observability

---

## Arquitetura de Microserviços

### Visão Geral da Arquitetura

```
Internet
   ↓
[Load Balancer]
   ↓
[API Gateway] ← Ponto único de entrada
   ↓
[Service Mesh - Opcional] ← Comunicação inter-serviços
   ↓
┌─────────────────────────────────────────────────────┐
│              Microserviços de Negócio               │
├─────────────────────────────────────────────────────┤
│ MS1: Property Management (Modular Monolith) ⭐      │
│      - Listing Module                               │
│      - Booking Module                               │
│      - Availability Module                          │
│ MS2: Payment Service                                │
│ MS3: User Service                                   │
│ MS4: Auth Service                                   │
│ MS5: Notification Service                           │
│ MS6: Search Service (Elasticsearch)                 │
└─────────────────────────────────────────────────────┘
   ↓
[Event Bus - Kafka/RabbitMQ]
   ↓
[Bancos de Dados Independentes por Serviço]
```

### Decisão Arquitetural: Modular Monolith

**Por que Listing + Booking + Availability foram unificados?**

✅ **Mesma tecnologia** - PostgreSQL para todos
✅ **Transações ACID** - Evita saga complexa para operações simples
✅ **Baixa latência** - Zero network overhead
✅ **Domínios relacionados** - Compartilham o calendário de disponibilidade
✅ **Escala similar** - Não há diferença de 10x+ em throughput
✅ **Deploy único** - Simplifica operações
✅ **Pode evoluir** - Se necessário, separar depois

**Por que Search Service permanece separado?**

✅ **Tecnologia diferente** - Elasticsearch vs PostgreSQL
✅ **CQRS Pattern** - Read Model separado do Write Model
✅ **Pode cair** - Não afeta core business (degradação aceitável)
✅ **Escala diferente** - 10x+ mais reads que Property Management
✅ **Dados denormalizados** - Estrutura otimizada para busca

### Responsabilidades do API Gateway

**O Gateway FAZ:**
- ✅ Routing - direciona `/listings/*` → Listing Service
- ✅ Rate Limiting - proteção contra abuso
- ✅ Validação de Token JWT - verifica assinatura e expiração
- ✅ CORS - configuração centralizada
- ✅ Request/Response Transformation
- ✅ Logging/Monitoring centralizado

**O Gateway NÃO FAZ:**
- ❌ Autorização de negócio ("usuário pode editar ESSA propriedade?")
- ❌ CRUD de usuários
- ❌ Validação de regras de negócio

---

## Divisão de Serviços

### MS1: Property Management Service (Modular Monolith)

**Responsabilidades:**
Este serviço unifica três módulos relacionados em um único serviço:
- **Listing Module:** Gestão de propriedades (CRUD, fotos, descrições)
- **Booking Module:** Gestão de reservas (criar, cancelar, histórico)
- **Availability Module:** Calendário compartilhado entre listing e booking

**Estrutura do Projeto:**
```
property-management-service/
├── modules/
│   ├── listing/
│   │   ├── listing.controller.js
│   │   ├── listing.service.js
│   │   ├── listing.repository.js
│   │   └── listing.model.js
│   │
│   ├── booking/
│   │   ├── booking.controller.js
│   │   ├── booking.service.js
│   │   ├── booking.saga.js        ← Orquestração de saga
│   │   └── booking.model.js
│   │
│   └── availability/
│       ├── availability.service.js
│       ├── availability.repository.js
│       └── availability.model.js
│
├── shared/
│   ├── database.js                ← Conexão única PostgreSQL
│   ├── eventBus.js                ← Client do Kafka/RabbitMQ
│   └── auth.middleware.js
│
├── events/
│   ├── publishers.js              ← Publica eventos de domínio
│   └── subscribers.js             ← Escuta eventos de outros serviços
│
└── index.js                       ← Entry point
```

**Banco de Dados (PostgreSQL único):**
```sql
-- Schema: listings
CREATE TABLE listings (
  id UUID PRIMARY KEY,
  host_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  address JSONB,
  city VARCHAR(100),
  amenities JSONB,
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, DELETED
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

CREATE TABLE listing_photos (
  id UUID PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Schema: bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  listing_id UUID REFERENCES listings(id),
  guest_id UUID NOT NULL,
  host_id UUID NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', 
  -- PENDING, PROCESSING, CONFIRMED, CANCELLED, FAILED, EXPIRED, COMPLETED
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancellation_reason TEXT
);

-- Schema: availability (compartilhado entre listing e booking)
CREATE TABLE availability (
  id UUID PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'AVAILABLE', 
  -- AVAILABLE, RESERVED (temp), BOOKED, BLOCKED
  booking_id UUID REFERENCES bookings(id),
  reservation_id UUID, -- ID temporário durante saga
  expires_at TIMESTAMP, -- Para reservas temporárias
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(listing_id, date)
);

CREATE INDEX idx_availability_listing_date ON availability(listing_id, date);
CREATE INDEX idx_availability_status ON availability(status);

-- Saga State Management
CREATE TABLE saga_instances (
  id UUID PRIMARY KEY,
  saga_type VARCHAR(50) NOT NULL,
  booking_id UUID,
  current_step VARCHAR(50),
  status VARCHAR(20), -- RUNNING, COMPLETED, COMPENSATING, FAILED
  data JSONB,
  executed_steps JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cópia local de usuários (duplicação estratégica)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(50), -- guest, host, admin
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  suspended BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Endpoints - Listing Module:**
- `POST /listings` - Criar propriedade (apenas hosts)
- `GET /listings/:id` - Buscar propriedade específica
- `PUT /listings/:id` - Atualizar propriedade
- `DELETE /listings/:id` - Remover propriedade (soft delete)
- `GET /listings/:id/calendar` - Ver calendário de disponibilidade
- `PUT /listings/:id/calendar` - Host bloqueia/desbloqueia datas
- `POST /listings/:id/photos` - Upload de fotos

**Endpoints - Booking Module:**
- `POST /bookings` - Criar reserva (inicia saga)
- `GET /bookings/:id` - Buscar reserva específica
- `GET /bookings/me?role=guest` - Minhas reservas como guest
- `GET /bookings/me?role=host` - Reservas nas minhas propriedades
- `POST /bookings/:id/cancel` - Cancelar reserva

**Endpoints - Internal (Service-to-Service):**
- `GET /internal/listings/:id` - Buscar listing (sem auth pública)
- `GET /internal/listings/ids` - Todos os IDs ativos (para reconciliação)
- `POST /internal/availability/reserve` - Reservar datas (saga)
- `POST /internal/availability/release` - Liberar datas (compensação)

**Eventos Publicados:**
```javascript
// Listing events
'listing.created'      // Novo listing cadastrado
'listing.updated'      // Listing editado (preço, descrição, etc)
'listing.deleted'      // Listing removido
'listing.activated'    // Host ativou listing
'listing.deactivated'  // Host desativou listing

// Booking events  
'booking.created'      // Tentativa de reserva iniciada
'booking.completed'    // Reserva confirmada com sucesso
'booking.failed'       // Reserva falhou
'booking.cancelled'    // Reserva cancelada
'booking.expired'      // Reserva temporária expirou

// Availability events
'availability.blocked'   // Host bloqueou datas
'availability.released'  // Datas liberadas
```

**Eventos Consumidos:**
```javascript
'user.registered'   // Cria cópia local do usuário
'user.updated'      // Atualiza dados locais do usuário
'user.suspended'    // Marca usuário como suspenso
'payment.completed' // Confirma pagamento (parte da saga)
'payment.failed'    // Falha no pagamento (compensa saga)
```

**Vantagens do Modular Monolith:**
- ✅ Transação ACID entre listing, booking e availability
- ✅ Zero latência de rede
- ✅ Código organizado em módulos com bounded contexts
- ✅ Deploy único mais simples
- ✅ Debug mais fácil
- ✅ Pode ser dividido em microserviços futuramente se necessário

---

### MS2: Payment Service (Pagamentos)

### MS2: Payment Service (Pagamentos)

**Responsabilidades:**
- Processar pagamentos (Stripe/similar)
- Splits (host recebe X%, plataforma Y%)
- Reembolsos
- Histórico financeiro

**Banco de Dados:**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL,
  guest_id UUID NOT NULL,
  amount DECIMAL(10,2),
  currency VARCHAR(3),
  status VARCHAR(20), -- PENDING, COMPLETED, FAILED, REFUNDED
  stripe_charge_id VARCHAR(255),
  created_at TIMESTAMP
);

CREATE TABLE refunds (
  id UUID PRIMARY KEY,
  payment_id UUID REFERENCES payments(id),
  amount DECIMAL(10,2),
  reason VARCHAR(255),
  stripe_refund_id VARCHAR(255),
  created_at TIMESTAMP
);

-- Cópia local de usuários
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  payment_suspended BOOLEAN
);
```

**Comunicação:**
- Escuta eventos via message broker (não tem endpoints HTTP públicos)
- `payment.process` - Processar pagamento
- `payment.refund` - Reembolsar pagamento

---

### MS3: User Service (Usuários & Perfis)

**Responsabilidades:**
- CRUD de usuários
- Perfis (host/guest)
- Verificações (email, telefone, documentos)
- Reviews/ratings
- **Fonte da verdade para dados de usuário**

**Banco de Dados:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  bio TEXT,
  avatar_url TEXT,
  role VARCHAR(50), -- guest, host, admin
  permissions JSONB, -- ["create_listing", "book_property"]
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  suspended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  reviewer_id UUID REFERENCES users(id),
  reviewed_id UUID REFERENCES users(id),
  booking_id UUID,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP
);
```

**Endpoints:**
- `GET /users/:id` - Perfil público
- `GET /users/me` - Perfil completo (autenticado)
- `PUT /users/me` - Atualizar perfil
- `GET /users/:id/reviews` - Avaliações
- `POST /internal/users/by-email/:email` - Buscar por email (interno)

---

### MS4: Auth Service (Autenticação & Autorização)

**Responsabilidades:**
- Login/logout/refresh tokens
- OAuth (Google, Facebook)
- Emissão de JWTs
- **Separado do User Service!**

**Banco de Dados:**
```sql
CREATE TABLE auth_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Refresh tokens (Redis é melhor)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id),
  token_hash VARCHAR(255),
  expires_at TIMESTAMP,
  created_at TIMESTAMP
);
```

**Endpoints:**
- `POST /auth/register` - Criar conta
- `POST /auth/login` - Login (retorna JWT)
- `POST /auth/refresh` - Renovar token
- `POST /auth/logout` - Invalidar refresh token
- `POST /auth/forgot-password` - Recuperar senha

---

### MS5: Notification Service (Comunicação)

**Responsabilidades:**
- Emails (confirmação reserva, lembretes)
- SMS
- Push notifications
- Mensagens in-app entre host/guest

**Comunicação:**
- Escuta eventos do Event Bus
- `booking.completed` → envia confirmações
- `booking.cancelled` → envia notificações de cancelamento
- `user.registered` → envia email de boas-vindas

**Tecnologias:**
- SendGrid/AWS SES para emails
- Twilio para SMS
- Firebase Cloud Messaging para push

---

### MS6: Search Service (Busca & Descoberta)

**Responsabilidades:**
- Busca por localização, preço, datas
- Filtros avançados e faceted search
- Geolocalização e busca por proximidade
- Ordenação por relevância e popularidade
- **Read Model do pattern CQRS**

**Arquitetura:**
```
Property Management (Write Model)
         ↓
   Publica eventos
         ↓
     Event Bus
         ↓
   Search Service (Read Model)
         ↓
   Indexa no Elasticsearch
```

**Banco de Dados:**
- **Elasticsearch** para índices de busca
- **Redis** para cache de resultados

**Estrutura do Índice Elasticsearch:**
```json
{
  "id": "prop-123",
  "title": "Apartamento em Copacabana",
  "description": "Vista para o mar...",
  "price": 150,
  "location": {
    "city": "Rio de Janeiro",
    "neighborhood": "Copacabana",
    "lat": -22.9711,
    "lon": -43.1822
  },
  "amenities": ["wifi", "piscina", "ar-condicionado"],
  "host": {
    "id": "host-789",
    "name": "João Silva",
    "rating": 4.8,
    "verified": true
  },
  "status": "ACTIVE",
  "availability_score": 0.85,
  "popularity_score": 92,
  "total_reviews": 45,
  "average_rating": 4.7,
  "searchable_text": "Apartamento em Copacabana Vista para o mar...",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-12-18T15:30:00Z",
  "indexed_at": "2024-12-18T15:30:02Z",
  "version": 5
}
```

**Endpoints:**
- `GET /search` - Busca com filtros (city, price, amenities, etc)
- `GET /search/suggestions` - Autocomplete de cidades/bairros
- `GET /search/nearby` - Busca por geolocalização
- `GET /health` - Health check (verifica lag de indexação)

**Sincronização via Eventos:**

Search Service é **eventualmente consistente** com Property Management. Ele escuta eventos e mantém o índice sincronizado:

```javascript
// Search Service - Event Subscribers

// 1. Listing criado → Indexa no Elasticsearch
eventBus.subscribe('listing.created', async (event) => {
  await elasticsearch.index({
    index: 'listings',
    id: event.listingId,
    document: {
      id: event.listingId,
      title: event.title,
      description: event.description,
      price: event.price,
      location: {
        city: event.city,
        lat: event.latitude,
        lon: event.longitude
      },
      amenities: event.amenities,
      status: 'ACTIVE',
      host: {
        id: event.hostId,
        name: event.hostName
      },
      popularity_score: 0,
      availability_score: 1.0,
      searchable_text: `${event.title} ${event.description} ${event.city}`,
      created_at: event.createdAt,
      indexed_at: new Date(),
      version: event.version || 1
    }
  });
});

// 2. Listing atualizado → Atualiza índice
eventBus.subscribe('listing.updated', async (event) => {
  // Verifica versão para evitar eventos antigos
  const current = await elasticsearch.get({
    index: 'listings',
    id: event.listingId
  });
  
  if (event.version > current._source.version) {
    await elasticsearch.update({
      index: 'listings',
      id: event.listingId,
      doc: {
        ...event.changes,
        updated_at: event.updatedAt,
        indexed_at: new Date(),
        version: event.version
      }
    });
  }
});

// 3. Listing deletado → Remove do índice
eventBus.subscribe('listing.deleted', async (event) => {
  await elasticsearch.delete({
    index: 'listings',
    id: event.listingId
  });
});

// 4. Listing desativado → Marca como INACTIVE (não aparece em buscas)
eventBus.subscribe('listing.deactivated', async (event) => {
  await elasticsearch.update({
    index: 'listings',
    id: event.listingId,
    doc: { 
      status: 'INACTIVE',
      updated_at: event.updatedAt
    }
  });
});

// 5. Booking completado → Atualiza score de disponibilidade
eventBus.subscribe('booking.completed', async (event) => {
  await elasticsearch.update({
    index: 'listings',
    id: event.listingId,
    script: {
      source: 'ctx._source.availability_score = Math.max(0, ctx._source.availability_score - 0.05)',
      lang: 'painless'
    }
  });
});

// 6. Booking cancelado → Aumenta disponibilidade
eventBus.subscribe('booking.cancelled', async (event) => {
  await elasticsearch.update({
    index: 'listings',
    id: event.listingId,
    script: {
      source: 'ctx._source.availability_score = Math.min(1.0, ctx._source.availability_score + 0.05)',
      lang: 'painless'
    }
  });
});

// 7. User atualizado → Atualiza dados do host no índice
eventBus.subscribe('user.updated', async (event) => {
  if (event.changes.name || event.changes.verified) {
    // Atualiza todos os listings deste host
    await elasticsearch.updateByQuery({
      index: 'listings',
      body: {
        script: {
          source: `
            if (ctx._source.host.id == params.hostId) {
              if (params.name != null) ctx._source.host.name = params.name;
              if (params.verified != null) ctx._source.host.verified = params.verified;
            }
          `,
          params: {
            hostId: event.userId,
            name: event.changes.name,
            verified: event.changes.verified
          }
        },
        query: {
          term: { 'host.id': event.userId }
        }
      }
    });
  }
});
```

**Estratégias de Consistência:**

1. **Idempotência:**
   - Eventos possuem `version` incremental
   - Só atualiza se versão do evento > versão no índice
   - Previne eventos duplicados ou fora de ordem

2. **Retry com Backoff:**
   - Falhas são retentadas 3x com backoff exponencial
   - Após 3 falhas, vai para Dead Letter Queue

3. **Reconciliação Periódica:**
   ```javascript
   // Job roda a cada 1 hora
   cron.schedule('0 * * * *', async () => {
     // Compara IDs no Elasticsearch vs PostgreSQL
     const searchIds = await getAllSearchIds();
     const dbIds = await getActiveListingIds(); // via API interna
     
     const missing = dbIds.filter(id => !searchIds.includes(id));
     const deleted = searchIds.filter(id => !dbIds.includes(id));
     
     // Re-indexa faltantes
     for (const id of missing) {
       await reindexListing(id);
     }
     
     // Remove deletados
     for (const id of deleted) {
       await elasticsearch.delete({ index: 'listings', id });
     }
   });
   ```

4. **Fallback para Source of Truth:**
   ```javascript
   // Quando guest clica num resultado da busca
   GET /listings/:id
   
   // Sempre consulta Property Management (PostgreSQL)
   // Se não existir ou estiver inativo, retorna 404
   // Isso garante que dados desatualizados no search não causem problema
   ```

**Eventual Consistency:**
- **Latência típica:** 0.5s - 2s entre mudança no PostgreSQL e indexação
- **Aceitável para busca:** Usuários não esperam resultados 100% em tempo real
- **Mitigação:** Sempre valida na fonte da verdade ao abrir detalhes

**Tecnologias:**
- Elasticsearch 8.x
- Redis para cache de resultados populares
- Node.js com cliente oficial do Elasticsearch

---

## Estratégia de Consistência Distribuída

### Desafio
Cada microserviço tem seu próprio banco de dados, perdendo consistência transacional do monolith.

### Solução: Abordagem Híbrida

**1. JWT com Claims Essenciais**
Evita consultas síncronas constantes ao incluir dados relevantes no token:

```javascript
{
  "sub": "user-123",           // ID do usuário
  "email": "joao@example.com",
  "name": "João Silva",
  "role": "host",              // guest, host, admin
  "permissions": [
    "create_listing",
    "book_property"
  ],
  "emailVerified": true,
  "phoneVerified": false,
  "avatarUrl": "https://...",
  "exp": 1735689600,
  "iss": "auth-service",
  "aud": ["api-gateway", "all-services"]
}
```

**2. Duplicação Estratégica**
Cada serviço mantém cópia local dos dados de usuário que precisa:

| Serviço | Dados Duplicados de User |
|---------|--------------------------|
| Property Management | id, name, email, role, emailVerified, suspended |
| Payment Service | id, email, name, stripeCustomerId, paymentSuspended |
| User Service | Dados completos (fonte da verdade) |
| Auth Service | id, email, passwordHash (apenas credenciais) |
| Search Service | Índices denormalizados no Elasticsearch |

**3. Eventos Assíncronos**
Sincronização de mudanças via Event Bus (Kafka/RabbitMQ):

```javascript
// User Service publica evento quando usuário atualiza perfil
eventBus.publish('user.updated', {
  userId: 'user-123',
  changes: {
    name: 'João Silva Jr.',
    email: 'novo@email.com'
  },
  timestamp: new Date()
});

// Outros serviços escutam e atualizam cópias locais
eventBus.subscribe('user.updated', async (event) => {
  const { userId, changes } = event;
  
  // Atualiza apenas campos relevantes
  const relevantChanges = pick(changes, ['name', 'email']);
  
  if (Object.keys(relevantChanges).length > 0) {
    await db.users.update(userId, relevantChanges);
  }
});
```

**4. Internal Endpoints (quando inevitável)**
Para casos raros que precisam de dados frescos:

```javascript
// Listing Service consulta User Service
async verifyUserIsHost(userId) {
  const response = await axios.get(
    `http://user-service/internal/users/${userId}/role`,
    {
      headers: {
        'X-Service-Token': process.env.INTERNAL_SERVICE_TOKEN
      },
      timeout: 3000
    }
  );
  
  return response.data.role === 'host';
}
```

### Quando Usar Cada Abordagem

| Cenário | Estratégia |
|---------|-----------|
| Dados raramente mudam (nome) | Duplicação com eventos |
| Dados mudam muito (saldo) | Consulta síncrona ou event sourcing |
| Operação crítica multi-serviço | Saga Pattern |
| Leitura simples | Duplicação com eventual consistency |

---

## Sincronização via Eventos (Event-Driven Data Sync)

### Visão Geral

A sincronização de dados entre microserviços é feita através de **eventos de domínio** publicados no Event Bus (Kafka/RabbitMQ). Este padrão permite:
- ✅ Desacoplamento temporal - serviços não precisam estar online simultaneamente
- ✅ Duplicação estratégica - cada serviço mantém dados relevantes localmente
- ✅ Eventual consistency - dados convergem em segundos
- ✅ Auditoria - histórico completo de mudanças

### Fluxo Completo: Registro de Usuário

```javascript
// 1. User registra via Auth Service
POST /auth/register
{
  "email": "maria@example.com",
  "password": "senha123",
  "name": "Maria Silva",
  "role": "guest"
}

// 2. Auth Service cria credenciais e publica evento
class AuthService {
  async register(data) {
    // Salva credenciais
    const authUser = await db.authUsers.create({
      id: generateId(),
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 10)
    });
    
    // Publica evento USER_REGISTERED
    await eventBus.publish('user.registered', {
      userId: authUser.id,
      email: data.email,
      name: data.name,
      role: data.role,
      emailVerified: false,
      phoneVerified: false,
      permissions: data.role === 'host' 
        ? ['create_listing', 'book_property']
        : ['book_property'],
      
      // Metadata
      eventId: generateId(),
      timestamp: new Date(),
      version: 1
    });
    
    return authUser;
  }
}

// 3. User Service escuta e cria perfil completo
eventBus.subscribe('user.registered', async (event) => {
  await db.users.create({
    id: event.userId, // MESMO ID
    email: event.email,
    name: event.name,
    role: event.role,
    permissions: event.permissions,
    emailVerified: false,
    phoneVerified: false,
    bio: null,
    avatarUrl: null,
    createdAt: event.timestamp
  });
  
  console.log(`[User Service] ✅ Perfil criado: ${event.userId}`);
});

// 4. Property Management escuta e cria cópia local
eventBus.subscribe('user.registered', async (event) => {
  await db.users.create({
    id: event.userId,
    name: event.name,
    email: event.email,
    role: event.role,
    emailVerified: false,
    suspended: false
  });
  
  console.log(`[Property Mgmt] ✅ User copiado: ${event.userId}`);
});

// 5. Payment Service escuta e cria cópia local
eventBus.subscribe('user.registered', async (event) => {
  await db.users.create({
    id: event.userId,
    email: event.email,
    name: event.name,
    stripeCustomerId: null, // será preenchido depois
    paymentSuspended: false
  });
  
  console.log(`[Payment] ✅ User copiado: ${event.userId}`);
});

// 6. Search Service escuta e cria índice de host (se for host)
eventBus.subscribe('user.registered', async (event) => {
  if (event.role === 'host') {
    await elasticsearch.index({
      index: 'hosts',
      id: event.userId,
      document: {
        id: event.userId,
        name: event.name,
        verified: false,
        rating: 0,
        total_listings: 0
      }
    });
  }
  
  console.log(`[Search] ✅ Host indexado: ${event.userId}`);
});
```

### Fluxo: Atualização de Perfil

```javascript
// 1. User atualiza perfil no User Service
PUT /users/me
{
  "name": "Maria Silva Santos",
  "bio": "Adoro viajar!",
  "phone": "+5511999999999"
}

// 2. User Service atualiza e publica evento
class UserService {
  async updateProfile(userId, updates) {
    const user = await db.users.update(userId, updates);
    
    // Publica evento USER_UPDATED
    await eventBus.publish('user.updated', {
      userId: userId,
      changes: updates, // Apenas campos alterados
      
      // Metadata
      eventId: generateId(),
      timestamp: new Date(),
      version: user.version + 1
    });
    
    return user;
  }
}

// 3. Outros serviços escutam e atualizam cópias locais
eventBus.subscribe('user.updated', async (event) => {
  const { userId, changes } = event;
  
  // Filtra apenas campos relevantes para este serviço
  const relevantFields = ['name', 'email', 'phone'];
  const relevantChanges = pick(changes, relevantFields);
  
  if (Object.keys(relevantChanges).length > 0) {
    await db.users.update(userId, relevantChanges);
    console.log(`[${SERVICE_NAME}] ✅ User atualizado: ${userId}`);
  }
});
```

### Fluxo: Criação de Listing

```javascript
// 1. Host cria listing no Property Management
POST /listings
{
  "title": "Apartamento em Copacabana",
  "price": 150,
  "city": "Rio de Janeiro"
}

// 2. Property Management salva e publica evento
class ListingService {
  async createListing(hostId, data) {
    const listing = await db.transaction(async (trx) => {
      return await trx('listings').insert({
        id: generateId(),
        host_id: hostId,
        title: data.title,
        price: data.price,
        city: data.city,
        status: 'ACTIVE',
        created_at: new Date()
      }).returning('*');
    });
    
    // Publica evento LISTING_CREATED
    await eventBus.publish('listing.created', {
      listingId: listing.id,
      hostId: hostId,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      city: listing.city,
      amenities: data.amenities || [],
      status: 'ACTIVE',
      
      // Dados do host (para Search Service)
      hostName: await this.getHostName(hostId),
      
      // Metadata
      eventId: generateId(),
      timestamp: new Date(),
      version: 1
    });
    
    return listing;
  }
}

// 3. Search Service indexa no Elasticsearch
eventBus.subscribe('listing.created', async (event) => {
  await elasticsearch.index({
    index: 'listings',
    id: event.listingId,
    document: {
      id: event.listingId,
      title: event.title,
      price: event.price,
      city: event.city,
      host: {
        id: event.hostId,
        name: event.hostName
      },
      status: 'ACTIVE',
      indexed_at: new Date()
    }
  });
});

// 4. Notification Service notifica hosts próximos (exemplo)
eventBus.subscribe('listing.created', async (event) => {
  // Lógica de notificação...
});
```

### Garantias e Estratégias

#### 1. At-Least-Once Delivery

**Kafka/RabbitMQ garante entrega pelo menos uma vez:**
```javascript
// Configuração do consumer
const consumer = kafka.consumer({
  groupId: 'property-management-service',
  retry: {
    retries: 5,
    multiplier: 2, // Backoff exponencial
    initialRetryTime: 300
  }
});

await consumer.subscribe({
  topic: 'user.events',
  fromBeginning: false
});
```

#### 2. Idempotência (Previne Processamento Duplicado)

```javascript
// Handler idempotente usando version
eventBus.subscribe('user.updated', async (event) => {
  const currentUser = await db.users.findOne({ id: event.userId });
  
  // Só processa se versão do evento é maior
  if (event.version > currentUser.version) {
    await db.users.update(event.userId, {
      ...event.changes,
      version: event.version
    });
  } else {
    console.log(`[SKIP] Evento duplicado/antigo: ${event.eventId}`);
  }
});

// Ou usando eventId único
const processed = await redis.get(`event:processed:${event.eventId}`);
if (processed) {
  console.log(`[SKIP] Evento já processado: ${event.eventId}`);
  return;
}

// Processa evento
await handleEvent(event);

// Marca como processado (TTL 7 dias)
await redis.set(`event:processed:${event.eventId}`, '1', 'EX', 7*24*60*60);
```

#### 3. Dead Letter Queue (Falhas Persistentes)

```javascript
// Configuração de retry policy
const retryPolicy = {
  maxAttempts: 3,
  backoff: 'exponential',
  
  onFailure: async (event, error) => {
    console.error(`[DLQ] Evento falhou após 3 tentativas: ${event.eventId}`);
    
    // Envia para Dead Letter Queue
    await deadLetterQueue.push({
      originalEvent: event,
      error: error.message,
      stackTrace: error.stack,
      service: SERVICE_NAME,
      timestamp: new Date(),
      attempts: 3
    });
    
    // Alerta equipe de ops
    await alerting.critical({
      message: 'Evento não pôde ser processado',
      eventId: event.eventId,
      service: SERVICE_NAME
    });
  }
};

eventBus.subscribe('user.registered', handler, { retry: retryPolicy });
```

#### 4. Reconciliação Periódica

```javascript
// Job que roda a cada hora em cada serviço
cron.schedule('0 * * * *', async () => {
  console.log('[RECONCILIATION] Iniciando...');
  
  // 1. Busca todos os user IDs no User Service (fonte da verdade)
  const sourceIds = await http.get('user-service/internal/users/ids');
  
  // 2. Busca todos os user IDs locais
  const localIds = await db.users.select('id');
  
  // 3. Encontra diferenças
  const missing = sourceIds.filter(id => !localIds.includes(id));
  const extra = localIds.filter(id => !sourceIds.includes(id));
  
  console.log(`[RECONCILIATION] Faltando: ${missing.length}, Sobrando: ${extra.length}`);
  
  // 4. Corrige inconsistências
  for (const id of missing) {
    const user = await http.get(`user-service/internal/users/${id}`);
    await db.users.create(user);
  }
  
  for (const id of extra) {
    // Usuário foi deletado na fonte, remove local
    await db.users.delete({ id });
  }
  
  console.log('[RECONCILIATION] ✅ Completa');
});
```

### Eventos de Domínio: Catálogo Completo

#### User Events
```javascript
'user.registered'     // Novo usuário criado
'user.updated'        // Perfil atualizado
'user.deleted'        // Usuário deletado (soft delete)
'user.verified'       // Email/telefone verificado
'user.suspended'      // Conta suspensa
'user.reactivated'    // Conta reativada
```

#### Listing Events
```javascript
'listing.created'     // Nova propriedade cadastrada
'listing.updated'     // Propriedade editada
'listing.deleted'     // Propriedade removida
'listing.activated'   // Propriedade ativada
'listing.deactivated' // Propriedade desativada
```

#### Booking Events
```javascript
'booking.created'     // Tentativa de reserva iniciada
'booking.completed'   // Reserva confirmada
'booking.failed'      // Reserva falhou
'booking.cancelled'   // Reserva cancelada
'booking.expired'     // Reserva temporária expirou
```

#### Payment Events
```javascript
'payment.processing'  // Pagamento em processamento
'payment.completed'   // Pagamento confirmado
'payment.failed'      // Pagamento falhou
'payment.refunded'    // Reembolso processado
```

### Tabela: Quem Publica e Quem Consome

| Evento | Publicado Por | Consumido Por |
|--------|---------------|---------------|
| user.registered | Auth Service | User, Property Mgmt, Payment, Search |
| user.updated | User Service | Property Mgmt, Payment, Search |
| listing.created | Property Mgmt | Search, Notification |
| listing.updated | Property Mgmt | Search |
| listing.deleted | Property Mgmt | Search |
| booking.completed | Property Mgmt | User, Notification, Search |
| booking.cancelled | Property Mgmt | Payment, Notification, Search |
| payment.completed | Payment | Property Mgmt (saga) |
| payment.failed | Payment | Property Mgmt (saga) |

---

## Search Service e Eventual Consistency

### Como Funciona a Sincronização Property Management ↔ Search

O Search Service **NÃO** tem acesso direto ao banco de dados do Property Management. Toda sincronização acontece via **eventos assíncronos**.

```
┌──────────────────────────────────┐
│  Property Management Service     │  ← FONTE DA VERDADE (PostgreSQL)
│  - Listing Module                │
│  - Booking Module                │
└────────────┬─────────────────────┘
             │
             │ 1. Host cria listing
             │ 2. Salva no PostgreSQL (COMMIT)
             │ 3. Publica evento: listing.created
             ↓
       [Event Bus - Kafka]
             │
             │ Atraso típico: 0.5s - 2s
             ↓
┌──────────────────────────────────┐
│  Search Service                  │  ← READ MODEL (Elasticsearch)
│  - Escuta evento                 │
│  - Indexa documento              │
└──────────────────────────────────┘
```

### Timeline de Sincronização

```
T=0s:    Host cria listing
         ✅ PostgreSQL: COMMIT
         ✅ Kafka: evento publicado

T=0.5s:  Search Service recebe evento
         ✅ Elasticsearch: documento indexado

T=1s:    Guest faz busca
         ✅ Listing aparece nos resultados

---
Eventual Consistency: ~0.5s a 2s (ACEITÁVEL!)
```

### Problema 1: Listing Deletado Mas Ainda Aparece na Busca

**Cenário:**
```
1. Host deleta listing → PostgreSQL (DELETED)
2. Evento demora 2 segundos
3. Guest busca → Elasticsearch ainda mostra listing
4. Guest clica → ???
```

**Solução: Fallback para Fonte da Verdade**

```javascript
// Guest clica num resultado da busca
GET /listings/prop-123

// API Gateway roteia para Property Management (não Search!)
class ListingController {
  async getListing(req, res) {
    const listing = await db.listings.findOne({ 
      id: req.params.id,
      status: 'ACTIVE' // Apenas ativos
    });
    
    if (!listing) {
      // Não existe mais!
      return res.status(404).json({
        error: 'Propriedade não encontrada',
        code: 'LISTING_NOT_FOUND'
      });
      
      // Em background, limpa do Elasticsearch
      await eventBus.publish('listing.cleanup', {
        listingId: req.params.id
      });
    }
    
    return res.json(listing);
  }
}
```

**Resultado:** Guest vê erro "Propriedade não disponível" (experiência degradada mas aceitável)

### Problema 2: Novo Listing Ainda Não Aparece na Busca

**Cenário:**
```
1. Host cria listing
2. Recebe confirmação "✅ Criado!"
3. Faz busca imediatamente
4. Não encontra próprio listing 😞
```

**Solução 1: Read Your Own Writes**

```javascript
// Property Management Service
class ListingController {
  async createListing(req, res) {
    const listing = await db.listings.create(...);
    
    await eventBus.publish('listing.created', ...);
    
    return res.status(201).json({
      ...listing,
      _meta: {
        justCreated: true,
        indexingInProgress: true,
        message: 'Aparecerá nos resultados em alguns segundos'
      }
    });
  }
}
```

**Solução 2: Endpoint Dedicado para "Meus Listings"**

```javascript
// Property Management Service
// Busca direto no PostgreSQL (sempre atualizado!)
GET /listings/me?role=host

class ListingController {
  async getMyListings(req, res) {
    const userId = req.user.id;
    
    // Busca direto no PostgreSQL (fonte da verdade)
    const listings = await db.listings
      .where({ host_id: userId })
      .where({ status: 'ACTIVE' })
      .orderBy('created_at', 'desc');
    
    return res.json(listings);
  }
}

// Frontend usa endpoints diferentes:
// - Hosts veem suas propriedades: GET /listings/me (PostgreSQL)
// - Guests fazem buscas: GET /search (Elasticsearch)
```

### Problema 3: Preço Desatualizado na Busca

**Cenário:**
```
1. Host atualiza preço: R$150 → R$200
2. Guest busca "até R$180"
3. Listing aparece (Elasticsearch tem R$150)
4. Guest clica → vê R$200 (PostgreSQL atualizado)
5. "Que pegadinha?!" 😠
```

**Solução: UI Transparente**

```javascript
// Search retorna resultados
GET /search?maxPrice=180
→ Retorna listings com preço ~R$150 (podem estar desatualizados)

// Property Management valida ao abrir
GET /listings/prop-123
→ Retorna preço atual: R$200

// Frontend mostra modal:
"⚠️ O preço foi atualizado para R$200
Deseja continuar mesmo assim?"

[Sim] [Buscar novamente]
```

### Estratégias de Resiliência

#### 1. Idempotência com Versionamento

```javascript
// Search Service
eventBus.subscribe('listing.updated', async (event) => {
  const currentDoc = await elasticsearch.get({
    index: 'listings',
    id: event.listingId
  });
  
  // Só atualiza se evento é mais recente
  if (event.version > currentDoc._source.version) {
    await elasticsearch.update({
      index: 'listings',
      id: event.listingId,
      doc: {
        ...event.changes,
        version: event.version,
        updated_at: event.timestamp
      }
    });
  } else {
    console.log(`[Search] ⚠️ Evento antigo ignorado v${event.version}`);
  }
});
```

#### 2. Dead Letter Queue

```javascript
// Search Service
const retryPolicy = {
  maxAttempts: 3,
  backoff: 'exponential',
  onFailure: async (event, error) => {
    // Salva para investigação manual
    await deadLetterQueue.push({
      topic: 'listing.events',
      event: event,
      error: error.message,
      service: 'search-service',
      attempts: 3,
      timestamp: new Date()
    });
    
    // Alerta ops
    await alerting.warning({
      title: 'Search indexing falhou',
      listingId: event.listingId,
      error: error.message
    });
  }
};

eventBus.subscribe('listing.created', handler, { retry: retryPolicy });
```

#### 3. Reconciliação Periódica

**Job que roda a cada hora para corrigir inconsistências:**

```javascript
// Search Service - Reconciliation Job
cron.schedule('0 * * * *', async () => {
  console.log('[Search] 🔄 Iniciando reconciliação...');
  
  // 1. IDs no Elasticsearch
  const searchIds = new Set(
    await elasticsearch.search({
      index: 'listings',
      _source: false,
      size: 10000
    }).then(r => r.hits.hits.map(h => h._id))
  );
  
  // 2. IDs ativos no PostgreSQL (Property Management)
  const dbIds = new Set(
    await axios.get(
      'http://property-management/internal/listings/ids',
      {
        headers: { 'X-Service-Token': process.env.INTERNAL_SERVICE_TOKEN },
        timeout: 5000
      }
    ).then(r => r.data.ids)
  );
  
  // 3. Encontra diferenças
  const missingInSearch = [...dbIds].filter(id => !searchIds.has(id));
  const deletedFromDb = [...searchIds].filter(id => !dbIds.has(id));
  
  console.log(`[Search] 📊 Faltando: ${missingInSearch.length}`);
  console.log(`[Search] 📊 Sobrando: ${deletedFromDb.length}`);
  
  // 4. Re-indexa faltantes
  for (const id of missingInSearch) {
    await reindexListing(id);
  }
  
  // 5. Remove deletados
  for (const id of deletedFromDb) {
    await elasticsearch.delete({
      index: 'listings',
      id: id
    });
  }
  
  console.log('[Search] ✅ Reconciliação completa');
});

async function reindexListing(listingId) {
  // Busca dados completos do Property Management
  const listing = await axios.get(
    `http://property-management/internal/listings/${listingId}/full`,
    {
      headers: { 'X-Service-Token': process.env.INTERNAL_SERVICE_TOKEN },
      timeout: 5000
    }
  );
  
  // Indexa no Elasticsearch
  await elasticsearch.index({
    index: 'listings',
    id: listingId,
    document: transformToSearchDocument(listing.data)
  });
  
  console.log(`[Search] ✅ Re-indexado: ${listingId}`);
}
```

#### 4. Health Check com Lag Monitor

```javascript
// Search Service
app.get('/health', async (req, res) => {
  try {
    // 1. Status do Elasticsearch
    const esHealth = await elasticsearch.cluster.health();
    
    // 2. Conexão com Event Bus
    const eventBusConnected = await eventBus.isHealthy();
    
    // 3. Lag de indexação
    const lastIndexed = await redis.get('search:last_indexed_at');
    const lagSeconds = (Date.now() - new Date(lastIndexed)) / 1000;
    
    // 4. Avalia saúde geral
    const isHealthy = 
      esHealth.status !== 'red' &&
      eventBusConnected &&
      lagSeconds < 60; // Menos de 1 minuto de lag
    
    return res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      elasticsearch: {
        status: esHealth.status,
        nodes: esHealth.number_of_nodes
      },
      eventBus: {
        connected: eventBusConnected
      },
      indexing: {
        lagSeconds: lagSeconds,
        lastIndexedAt: lastIndexed
      }
    });
    
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Eventos que Search Service Escuta

```javascript
// Search Service - Event Handlers Completo

// 1. LISTING CREATED
eventBus.subscribe('listing.created', async (event) => {
  await elasticsearch.index({
    index: 'listings',
    id: event.listingId,
    document: {
      id: event.listingId,
      title: event.title,
      description: event.description,
      price: event.price,
      city: event.city,
      location: {
        lat: event.latitude,
        lon: event.longitude
      },
      amenities: event.amenities,
      host: {
        id: event.hostId,
        name: event.hostName
      },
      status: 'ACTIVE',
      availability_score: 1.0,
      popularity_score: 0,
      version: event.version,
      created_at: event.createdAt,
      indexed_at: new Date()
    }
  });
});

// 2. LISTING UPDATED
eventBus.subscribe('listing.updated', async (event) => {
  // Com idempotência via version
  const current = await elasticsearch.get({ index: 'listings', id: event.listingId });
  
  if (event.version > current._source.version) {
    await elasticsearch.update({
      index: 'listings',
      id: event.listingId,
      doc: {
        ...event.changes,
        version: event.version,
        updated_at: event.updatedAt,
        indexed_at: new Date()
      }
    });
  }
});

// 3. LISTING DELETED
eventBus.subscribe('listing.deleted', async (event) => {
  await elasticsearch.delete({
    index: 'listings',
    id: event.listingId
  });
});

// 4. LISTING DEACTIVATED (host pausou)
eventBus.subscribe('listing.deactivated', async (event) => {
  await elasticsearch.update({
    index: 'listings',
    id: event.listingId,
    doc: { 
      status: 'INACTIVE' // Não aparece em buscas
    }
  });
});

// 5. BOOKING COMPLETED (atualiza disponibilidade)
eventBus.subscribe('booking.completed', async (event) => {
  // Reduz score de disponibilidade
  await elasticsearch.update({
    index: 'listings',
    id: event.listingId,
    script: {
      source: 'ctx._source.availability_score -= 0.05',
      lang: 'painless'
    }
  });
});

// 6. BOOKING CANCELLED (aumenta disponibilidade)
eventBus.subscribe('booking.cancelled', async (event) => {
  await elasticsearch.update({
    index: 'listings',
    id: event.listingId,
    script: {
      source: 'ctx._source.availability_score += 0.05',
      lang: 'painless'
    }
  });
});
```

### Quando Eventual Consistency É Aceitável?

✅ **Sistemas onde é OK:**
- Busca de imóveis/produtos (atraso de 2s é imperceptível)
- Feed de redes sociais (atraso de 10s não importa)
- Analytics e dashboards (atraso de minutos é OK)
- Recomendações (não precisa ser real-time)

❌ **Sistemas onde NÃO é OK:**
- Banking/finanças (saldo precisa estar correto SEMPRE)
- Inventário crítico (estoque de vacinas, por exemplo)
- Leilões em tempo real (cada segundo importa)
- Controle de acesso/segurança (permissões precisam ser imediatas)

**Para nosso sistema Airbnb-like: Eventual consistency é PERFEITAMENTE ACEITÁVEL!**

---

## Autenticação e Autorização

### Separação de Responsabilidades

**Auth Service (MS5):**
- Login/logout/registro
- Emissão de JWTs
- Gestão de refresh tokens
- Validação de credenciais
- Guarda: passwordHash, refreshTokens

**User Service (MS4):**
- Perfil completo do usuário
- Roles e permissions
- Verificações (email, telefone)
- Estatísticas e histórico
- Guarda: dados completos do perfil

**API Gateway:**
- Valida assinatura e expiração do JWT
- Extrai claims do token
- Injeta headers para microserviços
- NÃO valida regras de negócio

**Microserviços de Negócio:**
- Validam autorização de negócio
- Verificam permissões baseadas em claims
- Consultam dados locais duplicados

### Fluxo Completo: Login → Request → Autorização

#### 1. Login (Criação do JWT)

```javascript
// Cliente
POST /auth/login
{
  "email": "joao@example.com",
  "password": "senha123"
}

// Auth Service
class AuthController {
  async login(req, res) {
    const { email, password } = req.body;
    
    // Consulta User Service para buscar dados completos
    const user = await axios.get(
      `http://user-service/internal/users/by-email/${email}`,
      {
        headers: { 'X-Service-Token': process.env.INTERNAL_SERVICE_TOKEN }
      }
    );
    
    // Valida senha (hash está no Auth Service)
    const authUser = await db.authUsers.findOne({ email });
    if (!await bcrypt.compare(password, authUser.passwordHash)) {
      throw new UnauthorizedError('Credenciais inválidas');
    }
    
    // Gera JWT com claims essenciais
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    // Salva refresh token
    await redis.set(`refresh:${user.id}`, refreshToken, 'EX', 7*24*60*60);
    
    return res.json({ accessToken, refreshToken });
  }
}
```

#### 2. Request com Token (API Gateway)

```javascript
// Cliente
GET /listings?city=Rio
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// API Gateway valida token
class ApiGateway {
  async validateToken(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    try {
      // Valida apenas assinatura e expiração
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Injeta dados nos headers para microserviços
      req.headers['x-user-id'] = decoded.sub;
      req.headers['x-user-email'] = decoded.email;
      req.headers['x-user-name'] = decoded.name;
      req.headers['x-user-role'] = decoded.role;
      req.headers['x-user-permissions'] = JSON.stringify(decoded.permissions);
      req.headers['x-email-verified'] = decoded.emailVerified;
      
      next();
      
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  }
}
```

#### 3. Autorização de Negócio no Microserviço

```javascript
// Listing Service
POST /listings
Headers:
  X-User-Id: user-123
  X-User-Role: guest
  X-User-Permissions: ["book_property"]

class ListingController {
  async createListing(req, res) {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    const permissions = JSON.parse(req.headers['x-user-permissions']);
    
    // AUTORIZAÇÃO DE NEGÓCIO
    
    // Regra 1: Apenas hosts podem criar listings
    if (userRole !== 'host' && userRole !== 'admin') {
      return res.status(403).json({
        error: 'Apenas hosts podem criar propriedades'
      });
    }
    
    // Regra 2: Verifica permissão específica
    if (!permissions.includes('create_listing')) {
      return res.status(403).json({
        error: 'Você não tem permissão para criar listings'
      });
    }
    
    // Regra 3: Consulta dados locais (duplicados)
    const localUser = await db.users.findOne({ id: userId });
    
    if (!localUser.emailVerified) {
      return res.status(403).json({
        error: 'Você precisa verificar seu email'
      });
    }
    
    if (localUser.suspended) {
      return res.status(403).json({
        error: 'Sua conta está suspensa'
      });
    }
    
    // CRIA O LISTING
    const listing = await db.listings.create({
      id: generateId(),
      hostId: userId,
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      createdAt: new Date()
    });
    
    // Publica evento
    await eventBus.publish('listing.created', {
      listingId: listing.id,
      hostId: userId
    });
    
    return res.status(201).json(listing);
  }
}
```

### Sincronização Auth ↔ User via Eventos

#### Registro de Novo Usuário

```javascript
// Auth Service
POST /auth/register
{
  "email": "maria@example.com",
  "password": "senha123",
  "name": "Maria Silva",
  "role": "guest"
}

class AuthController {
  async register(req, res) {
    const { email, password, name, role } = req.body;
    
    // Cria usuário no Auth Service (apenas credenciais)
    const passwordHash = await bcrypt.hash(password, 10);
    const authUser = await db.authUsers.create({
      id: generateId(),
      email,
      passwordHash
    });
    
    // Publica evento USER_REGISTERED
    await eventBus.publish('user.registered', {
      userId: authUser.id,
      email,
      name,
      role,
      emailVerified: false,
      permissions: role === 'host' 
        ? ['create_listing', 'book_property']
        : ['book_property']
    });
    
    return res.status(201).json({ userId: authUser.id });
  }
}

// User Service escuta e cria perfil completo
eventBus.subscribe('user.registered', async (event) => {
  const { userId, email, name, role, permissions } = event;
  
  await db.users.create({
    id: userId, // MESMO ID do Auth Service
    email,
    name,
    role,
    permissions,
    emailVerified: false,
    phoneVerified: false,
    bio: null,
    avatarUrl: null
  });
});

// Listing Service também escuta (duplicação)
eventBus.subscribe('user.registered', async (event) => {
  const { userId, email, name, role } = event;
  
  await db.users.create({
    id: userId,
    name,
    email,
    role,
    emailVerified: false,
    suspended: false
  });
});

// Booking Service também escuta
eventBus.subscribe('user.registered', async (event) => {
  // Cria cópia local...
});

// Payment Service também escuta
eventBus.subscribe('user.registered', async (event) => {
  // Cria cópia local...
});
```

#### Atualização de Perfil

```javascript
// User Service
PUT /users/me
{
  "name": "João Silva Jr.",
  "bio": "Adoro viajar!"
}

class UserController {
  async updateProfile(req, res) {
    const userId = req.headers['x-user-id'];
    const updates = req.body;
    
    // Atualiza no User Service
    const user = await db.users.update(userId, updates);
    
    // Publica evento USER_UPDATED
    await eventBus.publish('user.updated', {
      userId,
      changes: updates
    });
    
    return res.json(user);
  }
}

// Outros serviços escutam e atualizam cópias
eventBus.subscribe('user.updated', async (event) => {
  const { userId, changes } = event;
  
  // Atualiza apenas campos relevantes
  const relevantChanges = pick(changes, ['name', 'email', 'phone']);
  
  if (Object.keys(relevantChanges).length > 0) {
    await db.users.update(userId, relevantChanges);
  }
});
```

---

## Fluxos de Negócio

### Fluxo 1: Booking End-to-End (Saga Orquestrada)

#### Cenário: Guest reserva propriedade por 3 noites

**Fase 1: Iniciação da Reserva**

```javascript
// Cliente
POST /bookings
Authorization: Bearer <jwt>
{
  "listingId": "prop-789",
  "checkIn": "2025-01-15",
  "checkOut": "2025-01-18",
  "guests": 2
}

// API Gateway valida token e roteia para Booking Service
```

**Fase 2: Booking Service - Criação da Saga**

```javascript
// Property Management Service - Booking Module
class BookingController {
  async createBooking(req, res) {
    const { listingId, checkIn, checkOut, guests } = req.body;
    const userId = req.user.id;
    
    // Cria booking em estado PENDING
    const booking = await db.bookings.create({
      id: generateId(),
      listingId,
      guestId: userId,
      checkIn,
      checkOut,
      guests,
      status: 'PENDING',
      createdAt: new Date()
    });
    
    // Inicia SAGA orquestrada
    await sagaOrchestrator.start('CREATE_BOOKING_SAGA', {
      bookingId: booking.id,
      listingId,
      guestId: userId,
      checkIn,
      checkOut,
      amount: 450.00
    });
    
    // Retorna imediatamente (assíncrono)
    return res.status(202).json({
      bookingId: booking.id,
      status: 'PROCESSING',
      message: 'Sua reserva está sendo processada'
    });
  }
}
```

**Fase 3: Saga Orquestrada - Coordenação**

```javascript
class CreateBookingSaga {
  async execute(data) {
    const { bookingId, listingId, guestId, checkIn, checkOut, amount } = data;
    
    try {
      // STEP 1: Reservar disponibilidade
      console.log('SAGA STEP 1: Reservando disponibilidade...');
      const reservation = await this.reserveAvailability(
        listingId, checkIn, checkOut
      );
      
      // STEP 2: Processar pagamento
      console.log('SAGA STEP 2: Processando pagamento...');
      const payment = await this.processPayment(
        guestId, amount, bookingId
      );
      
      // STEP 3: Confirmar reserva
      console.log('SAGA STEP 3: Confirmando reserva...');
      await this.confirmBooking(bookingId);
      
      // STEP 4: Publicar evento de sucesso
      await eventBus.publish('booking.completed', {
        bookingId,
        listingId,
        guestId,
        checkIn,
        checkOut,
        amount,
        paymentId: payment.id,
        timestamp: new Date()
      });
      
      console.log('✅ SAGA COMPLETA COM SUCESSO');
      
    } catch (error) {
      console.error('❌ SAGA FALHOU:', error);
      await this.compensate(data, error);
    }
  }
  
  async reserveAvailability(listingId, checkIn, checkOut) {
    const response = await eventBus.request('listing.reserve', {
      listingId,
      checkIn,
      checkOut,
      timeout: 5000
    });
    
    if (!response.success) {
      throw new Error('Datas não disponíveis');
    }
    
    return response.reservationId;
  }
  
  async processPayment(guestId, amount, bookingId) {
    const response = await eventBus.request('payment.process', {
      guestId,
      amount,
      bookingId,
      timeout: 10000
    });
    
    if (!response.success) {
      throw new Error(`Pagamento falhou: ${response.error}`);
    }
    
    return response;
  }
  
  async confirmBooking(bookingId) {
    await db.bookings.update(bookingId, {
      status: 'CONFIRMED',
      confirmedAt: new Date()
    });
  }
}
```

**Fase 4: Listing Service - Reserva de Disponibilidade**

```javascript
// Property Management Service - Availability Module
eventBus.on('listing.reserve', async (message, reply) => {
  const { listingId, checkIn, checkOut } = message;
  
  try {
    await db.transaction(async (trx) => {
      // Lock pessimista para evitar double booking
      const listing = await trx('listings')
        .where({ id: listingId })
        .forUpdate()
        .first();
      
      // Verifica conflitos
      const conflicts = await trx('availability')
        .where({ listing_id: listingId })
        .where('date', '>=', checkIn)
        .where('date', '<', checkOut)
        .where('status', 'RESERVED')
        .count();
      
      if (conflicts > 0) {
        throw new Error('Datas não disponíveis');
      }
      
      // Marca datas como RESERVED (não BOOKED ainda!)
      const reservationId = generateId();
      await trx('availability').insert(
        generateDateRange(checkIn, checkOut).map(date => ({
          listing_id: listingId,
          date: date,
          status: 'RESERVED',
          reservation_id: reservationId,
          expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 min
        }))
      );
      
      reply({ success: true, reservationId });
    });
    
  } catch (error) {
    reply({ success: false, error: error.message });
  }
});
```

**Fase 5: Payment Service - Processamento**

```javascript
eventBus.on('payment.process', async (message, reply) => {
  const { guestId, amount, bookingId } = message;
  
  try {
    const user = await db.users.findOne(guestId);
    
    // Integração com Stripe
    const charge = await stripe.charges.create({
      amount: amount * 100,
      currency: 'usd',
      customer: user.stripeCustomerId,
      description: `Reserva ${bookingId}`,
      metadata: { bookingId }
    });
    
    // Salva transação
    await db.payments.create({
      id: generateId(),
      bookingId,
      guestId,
      amount,
      status: 'COMPLETED',
      stripeChargeId: charge.id
    });
    
    reply({ success: true, id: charge.id, amount });
    
  } catch (error) {
    reply({ success: false, error: error.message });
  }
});
```

**Fase 6: Eventos de Domínio (Fire-and-Forget)**

```javascript
// Booking Service publica evento após saga completa
eventBus.publish('booking.completed', {
  bookingId: 'book-123',
  listingId: 'prop-789',
  guestId: 'user-456',
  hostId: 'user-999',
  checkIn: '2025-01-15',
  checkOut: '2025-01-18',
  amount: 450.00
});

// Notification Service escuta (assíncrono)
eventBus.subscribe('booking.completed', async (event) => {
  // Email para guest
  await emailService.send({
    to: guestEmail,
    template: 'booking-confirmation',
    data: { bookingId, checkIn, checkOut }
  });
  
  // Email para host
  await emailService.send({
    to: hostEmail,
    template: 'new-booking-alert',
    data: { bookingId, checkIn, checkOut }
  });
  
  // Push notification
  await pushService.send(guestId, {
    title: 'Reserva confirmada!',
    body: `Sua reserva para ${checkIn} foi confirmada`
  });
});

// User Service escuta (atualiza estatísticas)
eventBus.subscribe('booking.completed', async (event) => {
  await db.users.increment(event.guestId, 'total_bookings');
  await db.users.increment(event.hostId, 'total_hosted');
});

// Property Management (Availability Module) escuta (confirma disponibilidade)
eventBus.subscribe('booking.completed', async (event) => {
  const { listingId, checkIn, checkOut } = event;
  
  // Muda status de RESERVED para BOOKED
  await db.availability
    .where({ listing_id: listingId })
    .where('date', '>=', checkIn)
    .where('date', '<', checkOut)
    .update({ status: 'BOOKED' });
});
```

---

### Fluxo 2: Estratégia de Rollback (Compensação)

#### Cenário: Pagamento falha após disponibilidade já reservada

**Tabela de Compensações**

| Step | Ação Forward | Ação Compensatória |
|------|--------------|-------------------|
| 1 | Reserve availability | Release reservation |
| 2 | Process payment | Refund payment |
| 3 | Confirm booking | Cancel booking |
| 4 | Send notifications | Send cancellation notice |

**Implementação do Rollback**

```javascript
class CreateBookingSaga {
  constructor() {
    this.executedSteps = [];
  }
  
  async execute(data) {
    try {
      // STEP 1
      const reservation = await this.reserveAvailability(data);
      this.executedSteps.push({
        name: 'RESERVE_AVAILABILITY',
        data: { reservationId: reservation }
      });
      
      // STEP 2 (FALHA AQUI!)
      const payment = await this.processPayment(data);
      this.executedSteps.push({
        name: 'PROCESS_PAYMENT',
        data: { paymentId: payment.id }
      });
      
    } catch (error) {
      console.error('❌ SAGA FALHOU:', error);
      await this.compensate(data, error);
      
      await db.bookings.update(data.bookingId, {
        status: 'FAILED',
        failureReason: error.message
      });
      
      await eventBus.publish('booking.failed', {
        bookingId: data.bookingId,
        reason: error.message
      });
    }
  }
  
  async compensate(data, error) {
    console.log('🔄 Iniciando compensação...');
    
    // Executa compensações na ORDEM REVERSA
    for (let i = this.executedSteps.length - 1; i >= 0; i--) {
      const step = this.executedSteps[i];
      
      try {
        console.log(`Compensando step: ${step.name}`);
        
        switch (step.name) {
          case 'RESERVE_AVAILABILITY':
            await this.releaseReservation(
              data.listingId,
              step.data.reservationId
            );
            break;
            
          case 'PROCESS_PAYMENT':
            await this.refundPayment(step.data.paymentId);
            break;
            
          case 'CONFIRM_BOOKING':
            await this.cancelBooking(data.bookingId);
            break;
        }
        
        console.log(`✅ Compensação de ${step.name} completa`);
        
      } catch (compensationError) {
        // CRÍTICO: Compensação falhou!
        console.error(`❌ FALHA NA COMPENSAÇÃO: ${step.name}`);
        
        // Salva em dead letter queue para intervenção manual
        await deadLetterQueue.push({
          saga: 'CREATE_BOOKING',
          step: step.name,
          data: data,
          error: compensationError.message
        });
        
        // Alerta para ops
        await alerting.critical({
          message: 'COMPENSAÇÃO DE SAGA FALHOU',
          saga: 'CREATE_BOOKING',
          bookingId: data.bookingId
        });
      }
    }
  }
  
  async releaseReservation(listingId, reservationId) {
    await eventBus.request('listing.release', {
      listingId,
      reservationId
    });
  }
  
  async refundPayment(paymentId) {
    await eventBus.request('payment.refund', {
      paymentId,
      reason: 'booking_failed'
    });
  }
  
  async cancelBooking(bookingId) {
    await db.bookings.update(bookingId, {
      status: 'CANCELLED',
      cancelledAt: new Date()
    });
  }
}
```

**Listing Service - Liberar Reserva**

```javascript
// Property Management Service - Availability Module
eventBus.on('listing.release', async (message, reply) => {
  const { listingId, reservationId } = message;
  
  try {
    await db.transaction(async (trx) => {
      await trx('availability')
        .where({ reservation_id: reservationId })
        .delete();
    });
    
    reply({ success: true });
    
  } catch (error) {
    reply({ success: false, error: error.message });
  }
});
```

**Payment Service - Reembolso**

```javascript
eventBus.on('payment.refund', async (message, reply) => {
  const { paymentId, reason } = message;
  
  try {
    const payment = await db.payments.findOne(paymentId);
    
    // Reembolso no Stripe
    const refund = await stripe.refunds.create({
      charge: payment.stripeChargeId,
      reason: reason
    });
    
    await db.refunds.create({
      id: generateId(),
      paymentId,
      amount: payment.amount,
      reason,
      stripeRefundId: refund.id
    });
    
    await db.payments.update(paymentId, {
      status: 'REFUNDED'
    });
    
    reply({ success: true, refundId: refund.id });
    
  } catch (error) {
    reply({ success: false, error: error.message });
  }
});
```

**Estratégias de Resiliência**

1. **Timeouts e Expiração de Reservas**
```javascript
// Job que roda a cada minuto
cron.schedule('* * * * *', async () => {
  const expired = await db.availability
    .where('status', 'RESERVED')
    .where('expires_at', '<', new Date())
    .select('*');
  
  for (const reservation of expired) {
    await db.availability
      .where({ reservation_id: reservation.reservation_id })
      .delete();
    
    await db.bookings
      .where({ id: reservation.booking_id })
      .where({ status: 'PENDING' })
      .update({ status: 'EXPIRED' });
  }
});
```

2. **Idempotência nas Compensações**
```javascript
async releaseReservation(listingId, reservationId) {
  const exists = await db.availability
    .where({ reservation_id: reservationId })
    .first();
  
  if (!exists) {
    return { success: true, alreadyReleased: true };
  }
  
  await db.availability
    .where({ reservation_id: reservationId })
    .delete();
  
  return { success: true };
}
```

3. **Dead Letter Queue e Retry Policy**
```javascript
const retryPolicy = {
  maxAttempts: 3,
  backoff: 'exponential',
  onFailure: async (message, error) => {
    await deadLetterQueue.push({
      originalMessage: message,
      error: error.message,
      attempts: 3
    });
  }
};
```

**Diagrama de Estados do Booking**

```
PENDING → PROCESSING → CONFIRMED → COMPLETED
    ↓          ↓            ↓
  EXPIRED   FAILED    CANCELLED
                         ↓
                    REFUNDED
```

---

## Tecnologias e Ferramentas

### Infrastructure & Platform

**API Gateway:**
- Kong (recomendado)
- Traefik
- AWS API Gateway

**Service Mesh:**
- Istio (recomendado para produção)
- Linkerd
- Consul Connect

**Container Orchestration:**
- Kubernetes (k8s)
- Docker Compose (desenvolvimento)

**Load Balancer:**
- NGINX
- HAProxy
- Cloud-native (AWS ALB, GCP Load Balancer)

### Message Broker & Event Bus

**Event Bus:**
- Apache Kafka (recomendado para produção)
- RabbitMQ (mais simples, boa alternativa)
- Redis Streams (lightweight)

**Schema Registry:**
- Confluent Schema Registry (para Kafka)
- Avro schemas para validação de eventos

### Databases

**Relational:**
- PostgreSQL (recomendado para todos os MS)
- MySQL (alternativa)

**Cache:**
- Redis (sessions, cache, rate limiting)
- Memcached (alternativa)

**Search:**
- Elasticsearch (Search Service)
- Algolia (alternativa managed)

### Observability & Monitoring

**Distributed Tracing:**
- Jaeger (recomendado)
- Zipkin
- AWS X-Ray

**Metrics:**
- Prometheus (coleta de métricas)
- Grafana (visualização)
- Datadog (alternativa all-in-one)

**Logging:**
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Loki + Grafana
- CloudWatch (AWS)

**APM (Application Performance Monitoring):**
- New Relic
- Datadog APM
- Elastic APM

### Service Discovery

- Consul (recomendado)
- Etcd
- Kubernetes DNS (se usar k8s)

### CI/CD

**CI:**
- GitHub Actions (recomendado)
- GitLab CI
- Jenkins

**CD:**
- ArgoCD (GitOps para k8s)
- Flux
- Spinnaker

### Security

**Secrets Management:**
- HashiCorp Vault
- AWS Secrets Manager
- Kubernetes Secrets

**API Security:**
- OAuth 2.0 / OpenID Connect
- JWT para autenticação
- mTLS para service-to-service

### Testing

**Unit Tests:**
- Jest (Node.js)
- pytest (Python)

**Integration Tests:**
- Testcontainers (testes com dependências reais)
- Pact (contract testing entre serviços)

**Load Testing:**
- k6
- Gatling
- JMeter

---

## Patterns Aplicados

### Architectural Patterns

✅ **Microservices Architecture**
- Serviços independentes e deployáveis
- Bounded contexts do DDD

✅ **API Gateway Pattern**
- Ponto único de entrada
- Roteamento e validação centralizada

✅ **Database per Service**
- Cada MS com banco próprio
- Autonomia e isolamento

✅ **Event-Driven Architecture**
- Comunicação assíncrona via eventos
- Desacoplamento temporal

### Communication Patterns

✅ **Saga Pattern (Orchestrated)**
- Coordenação centralizada de transações distribuídas
- Booking Service como orquestrador

✅ **Event Sourcing (Light)**
- Histórico de eventos para auditoria
- Replay de eventos possível

✅ **CQRS (Command Query Responsibility Segregation)**
- Separação de leitura e escrita
- Search Service com índices otimizados

✅ **Request/Reply Pattern**
- Comunicação síncrona quando necessário
- Timeouts configurados

### Data Patterns

✅ **Data Duplication**
- Cópia estratégica de dados entre serviços
- Eventual consistency

✅ **Event-Driven Data Synchronization**
- Sincronização via eventos de domínio
- user.updated, listing.created, etc.

✅ **Compensating Transactions**
- Rollback distribuído via ações compensatórias
- Ordem reversa de execução

### Resilience Patterns

✅ **Circuit Breaker**
- Previne cascata de falhas
- Implementado em service mesh ou client

✅ **Timeout Pattern**
- Timeouts configurados para todas operações
- Evita bloqueios indefinidos

✅ **Retry with Exponential Backoff**
- Retry automático com intervalos crescentes
- Dead letter queue após tentativas esgotadas

✅ **Idempotency**
- Operações podem ser repetidas sem efeito colateral
- Crítico para compensações

✅ **Bulkhead Pattern**
- Isolamento de recursos
- Falha de um serviço não derruba outros

### Security Patterns

✅ **JWT Token Pattern**
- Claims essenciais no token
- Evita consultas constantes

✅ **API Key Pattern**
- Autenticação service-to-service
- X-Service-Token para internal endpoints

✅ **Role-Based Access Control (RBAC)**
- Roles: guest, host, admin
- Permissions granulares

### Observability Patterns

✅ **Distributed Tracing**
- Trace ID propagado entre serviços
- Visualização end-to-end de requests

✅ **Centralized Logging**
- Logs agregados de todos os serviços
- Correlation IDs para rastreamento

✅ **Health Check Pattern**
- Endpoints /health em todos os serviços
- Liveness e readiness probes

✅ **Metrics Collection**
- Prometheus para coleta
- Dashboards em Grafana

---

## Próximos Passos

### Fase 1: Setup Inicial
- [ ] Setup de repositório monorepo ou multi-repo
- [ ] Configuração de Docker Compose para desenvolvimento
- [ ] Setup de Kafka/RabbitMQ local
- [ ] Configuração de PostgreSQL para cada serviço
- [ ] Setup de Redis

### Fase 2: Implementação Core
- [ ] Auth Service + User Service
- [ ] API Gateway com validação JWT
- [ ] Event Bus wrapper (abstração do Kafka)
- [ ] Property Management Service (Modular Monolith)
  - [ ] Listing Module
  - [ ] Booking Module com Saga
  - [ ] Availability Module

### Fase 3: Integrações
- [ ] Payment Service + Stripe
- [ ] Notification Service
- [ ] Search Service + Elasticsearch (pode ser Fase 4)

### Fase 4: Observability
- [ ] Distributed tracing com Jaeger
- [ ] Logging centralizado (ELK)
- [ ] Métricas com Prometheus + Grafana
- [ ] Alerting

### Fase 5: Testes
- [ ] Unit tests (cobertura > 80%)
- [ ] Integration tests com Testcontainers
- [ ] Contract tests com Pact
- [ ] Load tests com k6

### Fase 6: Deploy
- [ ] Kubernetes manifests
- [ ] CI/CD com GitHub Actions
- [ ] GitOps com ArgoCD
- [ ] Secrets management com Vault

---

## Referências e Recursos

### Livros
- "Building Microservices" - Sam Newman
- "Microservices Patterns" - Chris Richardson
- "Designing Data-Intensive Applications" - Martin Kleppmann
- "Domain-Driven Design" - Eric Evans

### Links Úteis
- https://microservices.io/patterns
- https://martinfowler.com/microservices
- https://12factor.net
- https://kubernetes.io/docs

### Exemplos de Código
- https://github.com/microservices-patterns
- https://github.com/eventuate-tram

---

**Última Atualização:** Dezembro 2024
**Versão:** 2.0
**Status:** Planejamento Completo

---

## Notas sobre Decisões Arquiteturais

### Por Que Property Management é um Modular Monolith?

**Decisão:** Unificar Listing + Booking + Availability em um único serviço com módulos internos bem separados.

**Justificativa:**
1. **Transações ACID** - Evita saga complexa para operações que naturalmente fazem parte da mesma transação (verificar disponibilidade + criar reserva)
2. **Domínios relacionados** - Compartilham o mesmo calendário de disponibilidade
3. **Escala similar** - Não há diferença de 10x+ em throughput que justifique separação
4. **Simplicidade operacional** - Um deploy, um banco, debug mais fácil
5. **Evolução futura** - Pode ser dividido em microserviços posteriormente se necessário

**Quando considerar separação futura:**
- Diferença de >10x em throughput entre listing e booking
- Times completamente independentes (8+ devs por domínio)
- Necessidade de tecnologias diferentes
- Problemas de contenção de recursos

### Por Que Search Service Permanece Separado?

**Decisão:** Manter Search Service como microserviço independente usando Elasticsearch.

**Justificativa:**
1. **Tecnologia diferente** - Elasticsearch vs PostgreSQL
2. **Pattern CQRS** - Read Model separado do Write Model
3. **Pode cair** - Busca indisponível não impede core business (criar/ver listings específicos, fazer reservas)
4. **Escala assimétrica** - 10x+ mais buscas que operações de CRUD
5. **Dados denormalizados** - Estrutura completamente otimizada para busca, não para transações

### Total de Microserviços: 6

1. **Property Management** (Modular Monolith) - Core business
2. **Payment Service** - Compliance e isolamento financeiro
3. **User Service** - Fonte da verdade para usuários
4. **Auth Service** - Segurança e autenticação
5. **Notification Service** - Comunicações assíncronas
6. **Search Service** - Busca avançada com Elasticsearch

Esta arquitetura balanceia **simplicidade operacional** com **escalabilidade futura**, evitando over-engineering enquanto mantém os benefícios de microserviços onde realmente importa.
