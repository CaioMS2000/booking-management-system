## 1. **Mantenha User Service Focado**

Mesmo sendo "magro", deixe ele bem definido:

```
user-service/
├── controllers/
│   ├── user.controller.js          ← CRUD de perfil
│   ├── verification.controller.js  ← Email/phone verification
│   └── internal.controller.js      ← Endpoints internos (service-to-service)
│
├── services/
│   ├── user.service.js             ← Lógica de negócio
│   └── verification.service.js     ← Lógica de verificação
│
├── repositories/
│   └── user.repository.js          ← Acesso ao banco
│
├── events/
│   ├── publishers.js               ← Publica user.created, user.updated
│   └── subscribers.js              ← Escuta eventos (se necessário)
│
├── middlewares/
│   ├── auth.middleware.js          ← Valida JWT
│   └── validation.middleware.js    ← Valida input
│
├── database/
│   ├── migrations/
│   └── connection.js
│
└── index.js
```

---

## 2. **Defina Contratos Claros Entre Auth ↔ User**

### **Fluxo de Registro:**

```javascript
// ============================================
// 1. AUTH SERVICE recebe request
// ============================================
// POST /auth/register
// Auth Service - auth.controller.js
async register(req, res) {
  const { email, password, name, phone, cpf, role } = req.body;
  
  // Gera ID único
  const userId = await generateUniqueId();
  
  // Salva credenciais no Auth Service
  await db.authUsers.create({
    id: userId,
    email: email,
    passwordHash: await bcrypt.hash(password, 10)
  });
  
  // ✅ PUBLICA EVENTO: user.registered
  await eventBus.publish('user.registered', {
    userId: userId,
    email: email,
    name: name,
    phone: phone,
    cpf: cpf,
    role: role,
    emailVerified: false,
    eventId: generateUUID(),
    timestamp: new Date().toISOString(),
    version: 1
  });
  
  return res.status(201).json({
    userId: userId,
    message: 'Usuário registrado com sucesso'
  });
}

// ============================================
// 2. USER SERVICE escuta e cria perfil completo
// ============================================
// User Service - events/subscribers.js
eventBus.subscribe('user.registered', async (event) => {
  const { userId, email, name, phone, cpf, role } = event;
  
  await db.users.create({
    id: userId, // MESMO ID do Auth Service!
    email: email,
    name: name,
    phone: phone,
    cpf_cnpj: cpf,
    role: role,
    email_verified: false,
    phone_verified: false,
    bio: null,
    avatar_url: null,
    is_active: true,
    version: event.version,
    created_at: event.timestamp
  });
  
  console.log(`[User Service] ✅ Perfil criado: ${userId}`);
});
```

### **Fluxo de Login:**

```javascript
// Auth Service - auth.controller.js
async login(req, res) {
  const { email, password } = req.body;
  
  // 1. Valida credenciais (Auth Service)
  const authUser = await db.authUsers.findOne({ email });
  if (!await bcrypt.compare(password, authUser.passwordHash)) {
    throw new UnauthorizedError();
  }
  
  // 2. ✅ BUSCA dados completos do User Service
  const userData = await axios.get(
    `http://user-service/internal/users/${authUser.id}`,
    {
      headers: {
        'X-Service-Token': process.env.INTERNAL_SERVICE_TOKEN
      },
      timeout: 3000
    }
  );
  
  const user = userData.data;
  
  // 3. Gera JWT com dados do User Service
  const accessToken = jwt.sign({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified
  }, SECRET, { expiresIn: '15m' });
  
  const refreshToken = await generateRefreshToken(user.id);
  
  return res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
}
```

**User Service precisa expor:**
```javascript
// User Service - internal.controller.js
// GET /internal/users/:id
async getById(req, res) {
  // ⚠️ Validar que é chamada interna!
  if (req.headers['x-service-token'] !== process.env.INTERNAL_SERVICE_TOKEN) {
    throw new UnauthorizedError();
  }
  
  const user = await db.users.findOne({ id: req.params.id });
  return res.json(user);
}
```

---

## 3. **Pontos de Atenção (Críticos!)**

### ⚠️ **Problema 1: Auth consulta User no login (latência)**

```
Cliente → Auth Service → [HTTP] → User Service (50ms)
                       ← [Response] ← (50ms)
         ← JWT criado ←

Total: ~100ms EXTRA apenas para buscar dados do user
```

**Mitigação:**
- Cache Redis (Auth Service cacheia dados de user)
- TTL curto (5 minutos)

```javascript
// Auth Service - com cache
async login(req, res) {
  const { email, password } = req.body;
  
  const authUser = await db.authUsers.findOne({ email });
  if (!await bcrypt.compare(password, authUser.passwordHash)) {
    throw new UnauthorizedError();
  }
  
  // 1. Tenta cache primeiro
  let user = await redis.get(`user:${authUser.id}`);
  
  if (!user) {
    // 2. Se não tem cache, busca User Service
    const userData = await axios.get(`http://user-service/internal/users/${authUser.id}`);
    user = userData.data;
    
    // 3. Cacheia por 5 minutos
    await redis.setex(`user:${authUser.id}`, 300, JSON.stringify(user));
  } else {
    user = JSON.parse(user);
  }
  
  // Gera JWT
  const token = jwt.sign({ ...user }, SECRET, { expiresIn: '15m' });
  
  return res.json({ token });
}
```

**E quando user atualiza perfil?**
```javascript
// User Service - user.controller.js
async updateProfile(req, res) {
  const user = await db.users.update(req.user.id, req.body);
  
  // Publica evento
  await eventBus.publish('user.updated', { userId: user.id, changes: req.body });
  
  // ✅ INVALIDA cache no Auth Service (via evento)
  await eventBus.publish('cache.invalidate', {
    service: 'auth-service',
    key: `user:${user.id}`
  });
  
  return res.json(user);
}

// Auth Service - escuta invalidação de cache
eventBus.subscribe('cache.invalidate', async (event) => {
  if (event.service === 'auth-service') {
    await redis.del(event.key);
    console.log(`[Auth] Cache invalidado: ${event.key}`);
  }
});
```

---

### ⚠️ **Problema 2: Sincronização entre Auth e User**

Se Auth cria credenciais mas User Service falha em criar perfil:

```
Auth Service: ✅ Credenciais criadas (user-123)
User Service: ❌ FALHOU! (banco down)

Resultado: User pode fazer login mas não tem perfil! 💥
```

**Mitigação:**

**Opção A: Saga Pattern**
```javascript
// Auth Service
async register(req, res) {
  // 1. Cria reserva temporária no Auth
  const userId = await generateUniqueId();
  await db.authUsers.create({
    id: userId,
    email: req.body.email,
    passwordHash: await bcrypt.hash(req.body.password, 10),
    status: 'PENDING' // ← Novo campo!
  });
  
  // 2. Publica evento
  await eventBus.publish('user.registration.started', {
    userId, ...req.body
  });
  
  // 3. Espera confirmação (ou timeout 10s)
  const confirmed = await waitForEvent(`user.registration.completed:${userId}`, 10000);
  
  if (confirmed) {
    // User Service confirmou!
    await db.authUsers.update(userId, { status: 'ACTIVE' });
    return res.status(201).json({ userId });
  } else {
    // Timeout! Compensa
    await db.authUsers.delete(userId);
    throw new Error('Falha ao criar perfil');
  }
}
```

**Opção B: Eventual Consistency + Reconciliação**
```javascript
// Aceita eventual consistency
// Mas tem job que verifica órfãos:

// Auth Service - cron job (roda a cada 5 minutos)
cron.schedule('*/5 * * * *', async () => {
  // Busca auth_users que estão PENDING há mais de 10 minutos
  const orphans = await db.authUsers
    .where({ status: 'PENDING' })
    .where('created_at', '<', moment().subtract(10, 'minutes'));
  
  for (const orphan of orphans) {
    // Tenta criar no User Service novamente
    await eventBus.publish('user.registration.retry', {
      userId: orphan.id,
      email: orphan.email
    });
  }
});
```

---

### ⚠️ **Problema 3: Dependência no Login**

Auth Service **depende** de User Service estar online para fazer login.

```
User Service DOWN → Login FALHA 💥
```

**Mitigação:**

**Circuit Breaker + Fallback:**
```javascript
// Auth Service - com circuit breaker
const CircuitBreaker = require('opossum');

const getUserServiceBreaker = new CircuitBreaker(
  async (userId) => {
    return await axios.get(`http://user-service/internal/users/${userId}`, {
      timeout: 3000
    });
  },
  {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  }
);

async login(req, res) {
  const authUser = await db.authUsers.findOne({ email: req.body.email });
  
  if (!await bcrypt.compare(req.body.password, authUser.passwordHash)) {
    throw new UnauthorizedError();
  }
  
  let user;
  
  try {
    // Tenta buscar User Service
    const response = await getUserServiceBreaker.fire(authUser.id);
    user = response.data;
  } catch (error) {
    // ⚠️ FALLBACK: Usa dados mínimos do Auth Service
    console.warn('[Auth] User Service indisponível, usando fallback');
    
    user = {
      id: authUser.id,
      email: authUser.email,
      name: 'Usuário', // placeholder
      role: 'client',  // default
      emailVerified: false
    };
  }
  
  // Gera JWT (pode ser com dados incompletos)
  const token = jwt.sign(user, SECRET, { expiresIn: '15m' });
  
  return res.json({ 
    token,
    degraded: !user.name || user.name === 'Usuário' // flag de degradação
  });
}
```

---

## 4. **Estrutura de Eventos Bem Definida**

### **User Service PUBLICA:**

```javascript
// 1. user.registered (Auth Service dispara, User Service consome)
{
  eventType: 'user.registered',
  eventId: 'uuid',
  timestamp: '2025-01-15T10:00:00Z',
  version: 1,
  data: {
    userId: 'user-123',
    email: 'joao@example.com',
    name: 'João Silva',
    phone: '+5511999999999',
    cpf: '12345678901',
    role: 'client',
    emailVerified: false,
    phoneVerified: false
  }
}

// 2. user.updated (User Service dispara)
{
  eventType: 'user.updated',
  eventId: 'uuid',
  timestamp: '2025-01-15T11:30:00Z',
  version: 2,
  data: {
    userId: 'user-123',
    changes: {
      name: 'João Silva Jr.',
      phone: '+5511988888888'
    },
    previousVersion: 1,
    newVersion: 2
  }
}

// 3. user.email_verified
{
  eventType: 'user.email_verified',
  eventId: 'uuid',
  timestamp: '2025-01-15T12:00:00Z',
  data: {
    userId: 'user-123',
    email: 'joao@example.com',
    verifiedAt: '2025-01-15T12:00:00Z'
  }
}

// 4. user.suspended
{
  eventType: 'user.suspended',
  eventId: 'uuid',
  timestamp: '2025-01-15T13:00:00Z',
  data: {
    userId: 'user-123',
    reason: 'fraud_detection',
    suspendedBy: 'admin-456'
  }
}

// 5. user.deleted (soft delete)
{
  eventType: 'user.deleted',
  eventId: 'uuid',
  timestamp: '2025-01-15T14:00:00Z',
  data: {
    userId: 'user-123',
    deletedAt: '2025-01-15T14:00:00Z'
  }
}
```

---

## 5. **Observabilidade (CRÍTICO!)**

Com Auth e User separados, **você PRECISA de tracing distribuído**:

```javascript
// Instalar Jaeger
docker run -d --name jaeger \
  -p 5775:5775/udp \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest

// Auth Service
const { initTracer } = require('jaeger-client');

const tracer = initTracer({
  serviceName: 'auth-service',
  sampler: { type: 'const', param: 1 }
}, {});

// Login com tracing
async login(req, res) {
  const span = tracer.startSpan('auth.login');
  span.setTag('user.email', req.body.email);
  
  try {
    // Valida credenciais
    const authUser = await db.authUsers.findOne({ email: req.body.email });
    span.log({ event: 'credentials_validated' });
    
    // Busca User Service (propaga trace context!)
    const childSpan = tracer.startSpan('call.user-service', { childOf: span });
    const userData = await axios.get(
      `http://user-service/internal/users/${authUser.id}`,
      {
        headers: {
          'uber-trace-id': childSpan.context().toString() // ← Propaga trace!
        }
      }
    );
    childSpan.finish();
    
    // Gera JWT
    const token = jwt.sign(userData.data, SECRET, { expiresIn: '15m' });
    span.log({ event: 'jwt_generated' });
    
    return res.json({ token });
    
  } catch (error) {
    span.setTag('error', true);
    span.log({ event: 'error', message: error.message });
    throw error;
  } finally {
    span.finish();
  }
}
```

**No Jaeger UI você vai ver:**
```
Login Request (200ms total)
  ├─ auth.login (50ms)
  ├─ call.user-service (100ms) ← Latência visível!
  │   └─ user.get_by_id (80ms)
  └─ jwt_generation (50ms)
```

---

## 6. **Testing Strategy**

### **Unit Tests (cada serviço)**
```javascript
// Auth Service - auth.service.test.js
describe('AuthService', () => {
  it('should register user and publish event', async () => {
    const eventBusMock = jest.spyOn(eventBus, 'publish');
    
    await authService.register({
      email: 'test@example.com',
      password: 'senha123'
    });
    
    expect(eventBusMock).toHaveBeenCalledWith(
      'user.registered',
      expect.objectContaining({
        email: 'test@example.com'
      })
    );
  });
});
```

### **Integration Tests (entre serviços)**
```javascript
// tests/integration/auth-user.test.js
describe('Auth → User Integration', () => {
  it('should create user profile after registration', async () => {
    // 1. Registra via Auth Service
    const response = await request(authServiceUrl)
      .post('/auth/register')
      .send({
        email: 'integration@test.com',
        password: 'senha123',
        name: 'Integration Test'
      });
    
    const userId = response.body.userId;
    
    // 2. Aguarda eventual consistency (2 segundos)
    await sleep(2000);
    
    // 3. Verifica se User Service criou perfil
    const userResponse = await request(userServiceUrl)
      .get(`/internal/users/${userId}`)
      .set('X-Service-Token', INTERNAL_TOKEN);
    
    expect(userResponse.body).toMatchObject({
      id: userId,
      email: 'integration@test.com',
      name: 'Integration Test'
    });
  });
});
```

---

## Resumo: Como Fazer Direito

### ✅ **Mantenha separado, MAS:**

1. **Defina contratos claros** entre Auth ↔ User
2. **Use cache** (Redis) para reduzir latência no login
3. **Implemente Circuit Breaker** + fallback
4. **Adicione tracing distribuído** (Jaeger) - OBRIGATÓRIO!
5. **Tenha reconciliação** para casos de falha
6. **Testes de integração** entre os serviços
7. **Monitoramento** específico para latência Auth → User

### 📊 **Métricas que você DEVE acompanhar:**

```
- auth.login.duration (deve ser < 200ms)
- auth.user_service_calls.success_rate (deve ser > 99%)
- auth.cache.hit_rate (deve ser > 80%)
- user.event_processing.lag (deve ser < 2s)
```

---