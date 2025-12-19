# 🔴 Redis Strategy - Booking Management System

## 📋 Decisão Arquitetural: Uma Instância Redis

### **Por que uma única instância?**

✅ **Performance suficiente:** Redis consegue >100k ops/segundo
✅ **Simplicidade operacional:** Menos containers para gerenciar
✅ **Custo reduzido:** Uma instância consome menos recursos
✅ **Latência consistente:** Todos os serviços acessam o mesmo endpoint
✅ **MVP-friendly:** Evita over-engineering prematuro

---

## 🗂️ Organização: Databases Lógicas

Redis oferece **16 databases** (0-15) na mesma instância.

### **Mapeamento por Serviço:**

| Database | Serviço | Uso Principal |
|----------|---------|---------------|
| **0** | Auth Service | Refresh tokens, sessões ativas |
| **1** | User Service | Cache de perfis, rate limiting |
| **2** | Property Management | Cache de listings, disponibilidade temporária |
| **3** | Payment Service | Idempotência de pagamentos, deduplicação |
| **4** | Search Service | Cache de buscas populares, autocomplete |
| **5** | Notification Service | Queue de emails, tracking de envios |

**Databases 6-15:** Reservadas para uso futuro

---

## 💻 Exemplo de Uso no Código

### **Auth Service (Database 0)**
```typescript
import { createClient } from 'redis';

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
  },
  password: process.env.REDIS_PASSWORD,
  database: Number(process.env.REDIS_AUTH_DB) // 0
});

await redisClient.connect();

// Salvar refresh token
await redisClient.setEx(
  `refresh_token:${userId}`,
  7 * 24 * 60 * 60, // 7 dias
  refreshToken
);

// Buscar refresh token
const token = await redisClient.get(`refresh_token:${userId}`);
```

### **Property Management Service (Database 2)**
```typescript
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
  },
  password: process.env.REDIS_PASSWORD,
  database: Number(process.env.REDIS_PROPERTY_DB) // 2
});

// Cache de listing
await redisClient.setEx(
  `listing:${listingId}`,
  60 * 60, // 1 hora
  JSON.stringify(listing)
);

// Reserva temporária durante saga
await redisClient.setEx(
  `reservation:${reservationId}`,
  10 * 60, // 10 minutos
  JSON.stringify({ listingId, dates, status: 'PENDING' })
);
```

### **Payment Service (Database 3)**
```typescript
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
  },
  password: process.env.REDIS_PASSWORD,
  database: Number(process.env.REDIS_PAYMENT_DB) // 3
});

// Idempotência de webhook
const webhookKey = `webhook:stripe:${eventId}`;
const alreadyProcessed = await redisClient.get(webhookKey);

if (alreadyProcessed) {
  return { message: 'Webhook already processed' };
}

// Processa webhook...

// Marca como processado (TTL 24h)
await redisClient.setEx(webhookKey, 24 * 60 * 60, 'processed');
```

### **Search Service (Database 4)**
```typescript
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
  },
  password: process.env.REDIS_PASSWORD,
  database: Number(process.env.REDIS_SEARCH_DB) // 4
});

// Cache de resultados de busca
const cacheKey = `search:${city}:${price}:${capacity}`;
const cachedResults = await redisClient.get(cacheKey);

if (cachedResults) {
  return JSON.parse(cachedResults);
}

// Busca no Elasticsearch...
const results = await searchInElasticsearch(params);

// Cache por 5 minutos
await redisClient.setEx(cacheKey, 5 * 60, JSON.stringify(results));
```

### **User Service (Database 1)**
```typescript
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
  },
  password: process.env.REDIS_PASSWORD,
  database: Number(process.env.REDIS_USER_DB) // 1
});

// Rate limiting (exemplo: max 100 req/min por usuário)
const rateLimitKey = `ratelimit:${userId}:${Date.now() / 60000 | 0}`;
const count = await redisClient.incr(rateLimitKey);

if (count === 1) {
  await redisClient.expire(rateLimitKey, 60); // TTL 1 minuto
}

if (count > 100) {
  throw new Error('Rate limit exceeded');
}

// Cache de perfil
const profileKey = `profile:${userId}`;
await redisClient.setEx(profileKey, 15 * 60, JSON.stringify(profile));
```

---

## 🔍 Debug e Monitoramento

### **Conectar ao Redis CLI**
```bash
# Via Makefile
make redis-cli

# Ou diretamente
docker exec -it booking-redis redis-cli -a redis123
```

### **Trocar de Database**
```bash
127.0.0.1:6379> SELECT 0  # Auth Service
127.0.0.1:6379> KEYS *
127.0.0.1:6379> GET refresh_token:user-123

127.0.0.1:6379> SELECT 2  # Property Management
127.0.0.1:6379> KEYS listing:*
127.0.0.1:6379> GET listing:prop-789

127.0.0.1:6379> SELECT 4  # Search Service
127.0.0.1:6379> KEYS search:*
```

### **Monitorar comandos em tempo real**
```bash
make redis-monitor

# Ou
docker exec -it booking-redis redis-cli -a redis123 MONITOR
```

### **Ver estatísticas**
```bash
127.0.0.1:6379> INFO stats
127.0.0.1:6379> INFO memory
127.0.0.1:6379> DBSIZE  # Número de keys na database atual
```

---

## 🎯 Casos de Uso por Serviço

### **Auth Service (DB 0)**
- ✅ Refresh tokens (TTL: 7 dias)
- ✅ Sessões ativas (TTL: 15 min)
- ✅ Tokens de reset de senha (TTL: 1 hora)
- ✅ Blacklist de tokens revogados

### **User Service (DB 1)**
- ✅ Cache de perfis (TTL: 15 min)
- ✅ Rate limiting (TTL: 1 min)
- ✅ Cache de estatísticas (TTL: 1 hora)

### **Property Management (DB 2)**
- ✅ Cache de listings (TTL: 1 hora)
- ✅ Reservas temporárias durante saga (TTL: 10 min)
- ✅ Lock de disponibilidade (TTL: 5 min)
- ✅ Cache de calendário (TTL: 30 min)

### **Payment Service (DB 3)**
- ✅ Idempotência de webhooks (TTL: 24 horas)
- ✅ Deduplicação de cobranças (TTL: 1 hora)
- ✅ Estado de transações pendentes (TTL: 30 min)

### **Search Service (DB 4)**
- ✅ Cache de resultados de busca (TTL: 5 min)
- ✅ Autocomplete de cidades (TTL: 1 dia)
- ✅ Trending searches (TTL: 1 hora)

### **Notification Service (DB 5)**
- ✅ Queue de emails pendentes
- ✅ Tracking de envios (TTL: 7 dias)
- ✅ Rate limiting de emails (TTL: 1 hora)
- ✅ Deduplicação de notificações (TTL: 24 horas)

---

## 🚨 Quando Considerar Múltiplas Instâncias

### ❌ **Sinais de que você NÃO precisa separar:**
- Sistema com < 10k requests/segundo
- Uso de memória < 1GB
- Latência < 10ms consistente
- Zero downtime nos últimos 30 dias

### ✅ **Sinais de que você PRECISA separar:**

1. **Volume extremo em um serviço:**
   ```
   Search Service tem 100k buscas/segundo
   → Redis dedicado com cluster de 3 nós
   ```

2. **Compliance/isolamento:**
   ```
   PCI-DSS exige isolamento de dados de pagamento
   → Redis separado para Payment Service
   ```

3. **Contenção de recursos:**
   ```
   Um serviço consome 90% da memória
   → Redis dedicado para esse serviço
   ```

4. **Eviction policies conflitantes:**
   ```
   Auth precisa: allkeys-lru (remove keys antigas)
   Search precisa: noeviction (nunca remove)
   → Redis separados com policies diferentes
   ```

---

## 📊 Arquitetura de Escala (Futuro)

### **Fase 1: MVP (Agora)**
```
┌─────────────────────────────────────┐
│      Redis (1 instância)            │
│                                     │
│  DB 0-5: Todos os serviços          │
└─────────────────────────────────────┘
```

### **Fase 2: Produção Pequena (< 10k req/s)**
```
┌─────────────────────────────────────┐
│   Redis Primary + Replica           │
│                                     │
│  Master: Writes (DB 0-5)            │
│  Replica: Reads (failover)          │
└─────────────────────────────────────┘
```

### **Fase 3: Produção Média (10k-50k req/s)**
```
┌──────────────────┐  ┌──────────────────┐
│  Redis Cluster   │  │  Redis Search    │
│  (General)       │  │  (Cache only)    │
│                  │  │                  │
│  Auth, User,     │  │  High volume     │
│  Property,       │  │  3 nodes         │
│  Payment,        │  │                  │
│  Notification    │  └──────────────────┘
└──────────────────┘
```

### **Fase 4: Produção Grande (> 50k req/s)**
```
┌────────────┐  ┌────────────┐  ┌────────────┐
│ Redis Auth │  │ Redis Core │  │ Redis      │
│ (Cluster)  │  │ (Cluster)  │  │ Search     │
│            │  │            │  │ (Cluster)  │
│ Auth only  │  │ User,      │  │            │
│ 3 nodes    │  │ Property,  │  │ 5 nodes    │
│            │  │ Payment,   │  │            │
│            │  │ Notif      │  │            │
└────────────┘  └────────────┘  └────────────┘
```

---

## 🔧 Configuração Recomendada (Production)

### **Redis.conf Otimizações**
```conf
# Memória máxima
maxmemory 2gb

# Eviction policy (geral)
maxmemory-policy allkeys-lru

# Persistência
appendonly yes
appendfsync everysec

# Conexões
maxclients 10000
timeout 300

# Performance
tcp-backlog 511
tcp-keepalive 300
```

### **Docker Compose (Production-like)**
```yaml
redis:
  image: redis:7-alpine
  command: >
    redis-server
    --appendonly yes
    --requirepass ${REDIS_PASSWORD}
    --maxmemory 2gb
    --maxmemory-policy allkeys-lru
  deploy:
    resources:
      limits:
        memory: 2.5GB
      reservations:
        memory: 2GB
```

---

## ✅ Checklist de Boas Práticas

### **Desenvolvimento**
- [ ] Usar databases separadas (0-5) por serviço
- [ ] Sempre usar TTL para keys temporárias
- [ ] Namespacing consistente: `service:entity:id`
- [ ] Tratamento de conexão desconectada

### **Produção**
- [ ] Habilitar AOF (append-only file)
- [ ] Configurar maxmemory e eviction policy
- [ ] Monitorar uso de memória
- [ ] Setup de Redis Sentinel ou Cluster (HA)
- [ ] Backups automáticos
- [ ] Alertas de latência > 10ms

### **Segurança**
- [ ] Senha forte (não usar `redis123`!)
- [ ] Bind apenas IPs necessários
- [ ] TLS/SSL em produção
- [ ] Rename de comandos perigosos (FLUSHALL, CONFIG)

---

## 📚 Referências

- [Redis Database Separation](https://redis.io/docs/manual/database/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Redis Persistence](https://redis.io/docs/manual/persistence/)
- [Redis Cluster Tutorial](https://redis.io/docs/manual/scaling/)

---

## 🎯 Resumo

**Uma instância Redis é suficiente para MVP e produção inicial!**

Use **databases lógicas (0-5)** para organizar por serviço e só escale quando métricas reais indicarem necessidade.

**Regra de ouro:** Comece simples, escale quando necessário (baseado em dados reais, não em especulação). 🚀
