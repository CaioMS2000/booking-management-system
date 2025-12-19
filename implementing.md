# Plano de Implementação - Sistema de Reservas (Ordem de Desenvolvimento)
## 🎯 ORDEM RECOMENDADA DE IMPLEMENTAÇÃO

### **FASE 1: Fundação & Infraestrutura Local** (Semana 1-2)

#### 1.1. Docker & Infraestrutura Local
**Objetivo:** Ambiente de desenvolvimento funcional

**Criar:**
- `docker-compose.yml` (root do projeto)
  - PostgreSQL (6 instâncias - uma por serviço)
  - Redis (cache e sessions)
  - Kafka + Zookeeper (ou RabbitMQ como alternativa)
  - Elasticsearch (para Search Service)

**Por que começar aqui:**
- ✅ Todos os serviços dependem de banco de dados
- ✅ Event Bus é crítico para comunicação
- ✅ Permite testar localmente desde o início
- ✅ Desenvolvedores rodam `docker-compose up` e têm tudo funcionando

**Entregável:**
```bash
docker-compose up
# → 6 PostgreSQL rodando
# → Kafka/RabbitMQ rodando
# → Redis rodando
# → Elasticsearch rodando
```

---

#### 1.2. Schemas de Banco de Dados
**Objetivo:** Definir estrutura de dados de todos os serviços

**Criar migrations SQL para 6 serviços:**

1. **Auth Service** (`apps/auth-service/migrations/`)
   - `auth_users` (id, email, password_hash)
   - `refresh_tokens`

2. **User Service** (`apps/user-service/migrations/`)
   - `users` (id, name, email, phone, role, permissions, verified)
   - `reviews`

3. **Property Management Service** (`apps/property-management-service/migrations/`)
   - `listings` (id, host_id, title, price, city, status)
   - `listing_photos`
   - `bookings` (id, listing_id, guest_id, check_in, check_out, status)
   - `availability` (id, listing_id, date, status, booking_id)
   - `space_blocks` (id, space_id, blocked_from, blocked_until, reason)
   - `saga_instances` (orquestração de sagas)
   - `users` (cópia local denormalizada)

4. **Payment Service** (`apps/payment-service/migrations/`)
   - `payments` (id, booking_id, amount, status, gateway_transaction_id)
   - `refunds`
   - `users` (cópia local)

5. **Notification Service** (`apps/notification-service/migrations/`)
   - `notifications` (id, user_id, type, status, sent_at)
   - `email_templates`

6. **Search Service** (Elasticsearch)
   - Índice `listings` (schema JSON)
   - Índice `hosts` (schema JSON)

**Por que agora:**
- ✅ Define contratos de dados
- ✅ Facilita desenvolvimento paralelo
- ✅ Migrations versionadas desde o início

---

### **FASE 2: Property Management Service (Core Business)** (Semana 3-6)

**Por que começar aqui:**
- 🫀 É o coração do sistema (Listing + Booking + Availability)
- 🔑 Define os eventos que outros serviços consumirão
- ✅ Permite testar fluxos end-to-end sem depender de outros MS

---

#### 2.1. Módulo Listing (Semana 3)
**Objetivo:** CRUD de propriedades + publicação de eventos

**Implementar:**
```
apps/property-management-service/
├── src/
│   ├── modules/
│   │   └── listing/
│   │       ├── listing.controller.ts
│   │       ├── listing.service.ts
│   │       ├── listing.repository.ts
│   │       ├── listing.model.ts
│   │       └── listing.routes.ts
│   ├── shared/
│   │   ├── database.ts          # Knex/TypeORM
│   │   └── eventBus.ts          # Kafka client
│   └── index.ts
```

**Endpoints:**
- `POST /listings` - Criar propriedade
- `GET /listings` - Listar todas
- `GET /listings/:id` - Ver detalhes
- `PUT /listings/:id` - Atualizar
- `DELETE /listings/:id` - Soft delete
- `POST /listings/:id/photos` - Upload foto

**Eventos publicados:**
- `listing.created`
- `listing.updated`
- `listing.deleted`
- `listing.activated`
- `listing.deactivated`

**Quick Win (Dia 1-2):**
- CRUD básico funcionando
- PostgreSQL conectado
- 1 endpoint testável

---

#### 2.2. Módulo Availability (Semana 4)
**Objetivo:** Gestão de disponibilidade e bloqueios manuais

**Implementar:**
```
└── modules/
    └── availability/
        ├── availability.controller.ts
        ├── availability.service.ts
        ├── availability.repository.ts
        └── availability.routes.ts
```

**Endpoints:**
- `GET /listings/:id/calendar` - Ver calendário
- `POST /listings/:id/blocks` - Criar bloqueio manual
- `DELETE /listings/:id/blocks/:blockId` - Remover bloqueio
- `GET /listings/:id/availability?start=...&end=...` - Verificar disponibilidade

**Lógica crítica:**
- Algoritmo: `isAvailable(spaceId, startTime, endTime)`
  - Verifica bloqueios manuais
  - Verifica reservas confirmadas
  - Retorna true/false

**Eventos publicados:**
- `availability.blocked`
- `availability.released`

---

#### 2.3. Módulo Booking + Saga (Semana 5-6)
**Objetivo:** Fluxo completo de reserva com Saga Pattern

**Implementar:**
```
└── modules/
    └── booking/
        ├── booking.controller.ts
        ├── booking.service.ts
        ├── booking.saga.ts        # ⭐ Orquestração
        ├── booking.repository.ts
        └── booking.routes.ts
```

**Endpoints:**
- `POST /bookings` - Criar reserva (inicia saga)
- `GET /bookings/:id` - Buscar reserva
- `GET /bookings/me?role=guest` - Minhas reservas como guest
- `GET /bookings/me?role=host` - Reservas nos meus espaços
- `POST /bookings/:id/cancel` - Cancelar reserva

**Saga Orquestrada (CreateBookingSaga):**
```
Step 1: Reserve availability (internal)
  ↓ success
Step 2: Request payment (via event)
  ↓ payment.completed
Step 3: Confirm booking
  ↓ success
Step 4: Publish booking.completed
```

**Compensações (rollback):**
```
Payment falhou → Release availability
Booking expirou → Release availability
```

**Estados da reserva:**
- `PENDING` → aguardando pagamento
- `CONFIRMED` → paga e confirmada
- `CANCELLED` → cancelada
- `EXPIRED` → timeout de pagamento
- `COMPLETED` → cliente já usou
- `FAILED` → falha na saga

**Eventos publicados:**
- `booking.created`
- `booking.completed`
- `booking.cancelled`
- `booking.failed`
- `booking.expired`

**Eventos consumidos:**
- `payment.completed` (confirma saga)
- `payment.failed` (reverte saga)

**Mock inicial (Semana 5):**
- Simular Payment Service com mock
- Testar saga completa localmente
- Validar compensações

---

### **FASE 3: Auth Service** (Semana 7-8)

**Por que agora:**
- Property Management já está testável
- Agora precisamos de autenticação real para proteger endpoints

**Objetivo:** Autenticação JWT com RS256

**Implementar:**
```
apps/auth-service/
├── src/
│   ├── controllers/
│   │   └── auth.controller.ts
│   ├── services/
│   │   └── auth.service.ts
│   ├── repositories/
│   │   └── auth.repository.ts
│   └── index.ts
```

**Endpoints:**
- `POST /auth/register` - Criar conta
- `POST /auth/login` - Login (retorna JWT)
- `POST /auth/refresh` - Renovar token
- `POST /auth/logout` - Invalidar refresh token
- `POST /auth/forgot-password` - Recuperar senha

**JWT Claims:**
```json
{
  "sub": "user-123",
  "email": "joao@example.com",
  "name": "João Silva",
  "role": "host",
  "permissions": ["create_listing", "book_property"],
  "emailVerified": true,
  "exp": 1735689600
}
```

**Eventos publicados:**
- `user.registered` (para User Service criar perfil)

**Tecnologias:**
- RS256 (public/private key)
- Redis para refresh tokens
- bcrypt para hash de senhas

---

### **FASE 4: User Service** (Semana 9)

**Por que agora:**
- Auth Service já publica `user.registered`
- User Service é simples (CRUD de perfis)

**Objetivo:** Gestão de perfis e fonte da verdade para usuários

**Implementar:**
```
apps/user-service/
├── src/
│   ├── controllers/
│   │   └── user.controller.ts
│   ├── services/
│   │   └── user.service.ts
│   ├── repositories/
│   │   └── user.repository.ts
│   └── index.ts
```

**Endpoints:**
- `GET /users/:id` - Perfil público
- `GET /users/me` - Perfil completo (autenticado)
- `PUT /users/me` - Atualizar perfil
- `GET /users/:id/reviews` - Avaliações
- `POST /internal/users/by-email/:email` - Buscar por email (interno)

**Eventos consumidos:**
- `user.registered` (Auth Service)

**Eventos publicados:**
- `user.updated` (outros serviços atualizam cópias locais)
- `user.suspended`
- `user.verified`

**Dados gerenciados:**
- Nome, email, telefone, bio, avatar
- Roles e permissions
- Verificações (email, telefone)
- Estatísticas (total reservas, receita)

---

### **FASE 5: Payment Service** (Semana 10-11)

**Por que agora:**
- Booking Service já está mockando pagamentos
- Hora de integrar gateway real

**Objetivo:** Integração com Stripe/Mercado Pago + reembolsos

**Implementar:**
```
apps/payment-service/
├── src/
│   ├── controllers/
│   │   └── payment.controller.ts
│   ├── services/
│   │   ├── payment.service.ts
│   │   └── stripe.service.ts    # ou mercadopago.service.ts
│   ├── repositories/
│   │   └── payment.repository.ts
│   └── index.ts
```

**Endpoints:**
- `POST /payments/checkout` - Criar checkout
- `POST /webhooks/stripe` - Receber notificações
- `GET /payments/:id` - Consultar status
- `POST /internal/payments/refund` - Reembolso (interno)

**Eventos consumidos:**
- `booking.created` (cria cobrança)
- `booking.cancelled` (processa reembolso)

**Eventos publicados:**
- `payment.processing`
- `payment.completed` (Booking Service confirma saga)
- `payment.failed` (Booking Service reverte saga)
- `payment.refunded`

**Fluxo webhook:**
```
Stripe → POST /webhooks/stripe
  → Valida assinatura
  → Atualiza status payment
  → Publica payment.completed
  → Booking Service escuta
  → Atualiza booking para CONFIRMED
```

**Tecnologias:**
- Stripe SDK ou Mercado Pago SDK
- Validação de webhooks (HMAC)

---

### **FASE 6: Notification Service** (Semana 12)

**Por que agora:**
- Todos os eventos de domínio já estão sendo publicados
- Notification Service apenas escuta e envia emails

**Objetivo:** Emails transacionais essenciais

**Implementar:**
```
apps/notification-service/
├── src/
│   ├── services/
│   │   ├── email.service.ts
│   │   └── template.service.ts
│   ├── subscribers/
│   │   ├── booking.subscriber.ts
│   │   └── user.subscriber.ts
│   └── index.ts
```

**Eventos consumidos:**
- `user.registered` → email boas-vindas
- `booking.created` → email "aguardando pagamento"
- `booking.completed` → email confirmação (cliente + host)
- `booking.cancelled` → email cancelamento
- `payment.completed` → email recibo

**Templates essenciais:**
1. Boas-vindas
2. Confirmação de reserva (cliente)
3. Nova reserva (proprietário)
4. Cancelamento
5. Lembrete (1 dia antes - opcional)

**Tecnologias:**
- SendGrid ou AWS SES
- Handlebars para templates
- Apenas consome eventos (zero endpoints HTTP públicos)

---

### **FASE 7: Search Service (CQRS)** (Semana 13-15)

**Por que agora:**
- Property Management já publica todos os eventos
- Listings já existem no PostgreSQL
- Search Service é read model (CQRS)

**Objetivo:** Busca avançada com Elasticsearch

**Implementar:**
```
apps/search-service/
├── src/
│   ├── controllers/
│   │   └── search.controller.ts
│   ├── services/
│   │   ├── search.service.ts
│   │   └── elasticsearch.service.ts
│   ├── subscribers/
│   │   └── listing.subscriber.ts
│   └── index.ts
```

**Endpoints:**
- `GET /search?city=...&price=...&capacity=...` - Busca com filtros
- `GET /search/suggestions?q=...` - Autocomplete
- `GET /search/nearby?lat=...&lon=...` - Busca geolocalização
- `GET /health` - Health check (verifica lag de indexação)

**Eventos consumidos:**
- `listing.created` → indexa no Elasticsearch
- `listing.updated` → atualiza índice
- `listing.deleted` → remove do índice
- `listing.deactivated` → marca como INACTIVE
- `booking.completed` → atualiza availability_score
- `user.updated` → atualiza dados do host

**Estrutura índice Elasticsearch:**
```json
{
  "id": "prop-123",
  "title": "Apartamento em Copacabana",
  "price": 150,
  "city": "Rio de Janeiro",
  "location": { "lat": -22.9711, "lon": -43.1822 },
  "amenities": ["wifi", "piscina"],
  "host": { "id": "host-789", "name": "João", "verified": true },
  "status": "ACTIVE",
  "availability_score": 0.85,
  "version": 5
}
```

**Estratégias de consistência:**
1. **Idempotência com versionamento** (só atualiza se version > current)
2. **Reconciliação periódica** (cron job a cada 1 hora)
3. **Fallback para fonte da verdade** (sempre valida no PostgreSQL ao clicar)

---

### **FASE 8: API Gateway** (Semana 16-17)

**Por que por último:**
- Todos os serviços já estão implementados
- Gateway apenas roteia e valida tokens

**Objetivo:** Ponto único de entrada

**Implementar:**
- Kong, Traefik ou AWS API Gateway

**Responsabilidades:**
- ✅ Routing (`/listings/*` → Property Management)
- ✅ Rate limiting (proteção contra abuso)
- ✅ Validação de JWT (assinatura e expiração)
- ✅ CORS centralizado
- ✅ Logging/Monitoring
- ❌ NÃO faz autorização de negócio

**Rotas:**
```
POST   /auth/login           → Auth Service
POST   /auth/register        → Auth Service
GET    /users/me             → User Service
POST   /listings             → Property Management
GET    /listings/:id         → Property Management
POST   /bookings             → Property Management
GET    /search               → Search Service
```

**Injeção de headers:**
```
Authorization: Bearer <jwt>
  ↓ Gateway valida e extrai claims
  ↓ Injeta headers para microserviços
X-User-Id: user-123
X-User-Role: host
X-User-Permissions: ["create_listing"]
```

---

## 📦 RESUMO DA ORDEM DE IMPLEMENTAÇÃO

### ✅ Checkpoint de Cada Fase

| Fase | Serviço | Semanas | Entregável | Dependências |
|------|---------|---------|-----------|--------------|
| **1.1** | Infra Local | 1-2 | Docker Compose up | Nenhuma |
| **1.2** | DB Schemas | 1-2 | 6 migrations SQL | Docker |
| **2.1** | Listing Module | 3 | CRUD + eventos | DB Schema |
| **2.2** | Availability Module | 4 | Calendário + bloqueios | Listing |
| **2.3** | Booking Module + Saga | 5-6 | Reserva + saga mock | Availability |
| **3** | Auth Service | 7-8 | JWT RS256 | DB Schema |
| **4** | User Service | 9 | CRUD perfis | Auth |
| **5** | Payment Service | 10-11 | Stripe/MP + webhooks | Booking |
| **6** | Notification Service | 12 | Emails transacionais | Eventos |
| **7** | Search Service | 13-15 | Elasticsearch + CQRS | Listing events |
| **8** | API Gateway | 16-17 | Kong/Traefik | Todos os MS |

---

## 🎯 MILESTONES IMPORTANTES

### **Milestone 1: Property Management Funcional (Semana 6)**
✅ Criar listing
✅ Ver calendário
✅ Fazer reserva (mock payment)
✅ Cancelar reserva
✅ Saga funcionando

### **Milestone 2: Autenticação Real (Semana 8)**
✅ Registro de usuários
✅ Login com JWT
✅ Endpoints protegidos

### **Milestone 3: Pagamento Real (Semana 11)**
✅ Integração Stripe/MP
✅ Webhooks funcionando
✅ Saga completa (sem mock)
✅ Reembolsos

### **Milestone 4: Sistema Completo (Semana 15)**
✅ Busca funcionando
✅ Emails sendo enviados
✅ 6 microserviços rodando
✅ Event-driven funcionando

### **Milestone 5: Production-Ready (Semana 17)**
✅ API Gateway
✅ Rate limiting
✅ CORS configurado
✅ Sistema end-to-end funcionando

---

## 🔑 PRINCÍPIOS DA ORDEM ESCOLHIDA

### 1. **Core Business Primeiro**
Property Management é o coração → implementar antes de tudo

### 2. **Independência Máxima**
Cada fase pode ser desenvolvida e testada isoladamente

### 3. **Mock → Real**
Começar com mocks (payment) e substituir por implementação real depois

### 4. **Infraestrutura Cedo**
Docker/DB primeiro para não bloquear desenvolvimento

### 5. **Validação Contínua**
Cada fase tem entregável testável

### 6. **Eventos Definem Contratos**
Property Management define eventos → outros serviços se adaptam

---

## 🚀 QUICK WINS POR FASE

**Semana 1:** `docker-compose up` rodando todos os bancos ✅
**Semana 3:** Primeiro endpoint funcionando (POST /listings) ✅
**Semana 4:** Calendário visual rodando ✅
**Semana 6:** Primeira reserva completa (mock payment) ✅
**Semana 8:** Login funcionando ✅
**Semana 11:** Pagamento real processado ✅
**Semana 12:** Primeiro email enviado ✅
**Semana 15:** Busca funcionando ✅
**Semana 17:** Sistema completo em produção ✅

---

## 📁 ESTRUTURA FINAL DO MONOREPO

```
booking-management-system/
├── apps/
│   ├── property-management-service/    # ⭐ Fase 2
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── listing/
│   │       │   ├── booking/
│   │       │   └── availability/
│   │       ├── shared/
│   │       └── index.ts
│   ├── auth-service/                   # Fase 3
│   ├── user-service/                   # Fase 4
│   ├── payment-service/                # Fase 5
│   ├── notification-service/           # Fase 6
│   └── search-service/                 # Fase 7
├── packages/
│   ├── shared/                         # Utils, types, etc
│   └── typescript-config/
├── infrastructure/
│   ├── docker-compose.yml              # ⭐ Fase 1.1
│   ├── api-gateway/                    # Fase 8
│   └── kubernetes/                     # Futuro
└── migrations/                         # ⭐ Fase 1.2
    ├── auth-service/
    ├── user-service/
    ├── property-management-service/
    ├── payment-service/
    └── notification-service/
```

---
