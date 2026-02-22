## 🔌 Circuit Breaker - O "Disjuntor" do Sistema

### Conceito Básico

É inspirado no **disjuntor elétrico** da sua casa:
- Quando há sobrecarga ou curto-circuito → Disjuntor desliga
- Protege a instalação de queimar
- Você precisa resetar manualmente depois

No software, funciona parecido:
- Quando um serviço está falhando muito → Circuit Breaker "abre" (bloqueia chamadas)
- Protege seu sistema de gastar recursos tentando chamar algo que está quebrado
- Após um tempo, tenta novamente automaticamente

---

## 🎯 Problema que Resolve

**Cenário sem Circuit Breaker:**

```
MS1 (Reservas) → MS2 (Pagamentos)

MS2 está FORA DO AR (ou muito lento)

Request 1: MS1 tenta chamar MS2 → Timeout após 5s → FALHA
Request 2: MS1 tenta chamar MS2 → Timeout após 5s → FALHA
Request 3: MS1 tenta chamar MS2 → Timeout após 5s → FALHA
...
Request 100: MS1 tenta chamar MS2 → Timeout após 5s → FALHA

PROBLEMA:
- MS1 fica travado esperando MS2 (5s por request)
- Threads bloqueadas
- Memória acumulando
- MS1 TAMBÉM cai (cascata de falhas)
- Usuários esperando sem resposta
```

**Com Circuit Breaker:**

```
Request 1: MS1 → MS2 → Timeout 5s → FALHA (1ª falha)
Request 2: MS1 → MS2 → Timeout 5s → FALHA (2ª falha)
Request 3: MS1 → MS2 → Timeout 5s → FALHA (3ª falha)
Request 4: MS1 → MS2 → Timeout 5s → FALHA (4ª falha)
Request 5: MS1 → MS2 → Timeout 5s → FALHA (5ª falha)

🔴 CIRCUIT BREAKER ABRE! (threshold atingido: 5 falhas)

Request 6: MS1 → ⚡ BLOQUEADO pelo Circuit Breaker → Retorna erro IMEDIATO
Request 7: MS1 → ⚡ BLOQUEADO → Erro imediato (não tenta chamar MS2)
...
Request 100: MS1 → ⚡ BLOQUEADO → Erro imediato

VANTAGEM:
- MS1 responde RÁPIDO (não espera 5s)
- Threads liberadas
- MS1 continua funcionando (degradação graceful)
- Após 30s, Circuit Breaker tenta novamente (meio aberto)
```

---

## 🚦 Os 3 Estados

```
┌─────────────┐
│   CLOSED    │ (Normal, tudo funcionando)
│  (Fechado)  │
└──────┬──────┘
       │
       │ Muitas falhas consecutivas
       ↓
┌─────────────┐
│    OPEN     │ (Bloqueando chamadas)
│   (Aberto)  │
└──────┬──────┘
       │
       │ Timeout passa (ex: 30s)
       ↓
┌─────────────┐
│ HALF-OPEN   │ (Testando se voltou)
│(Meio Aberto)│
└──────┬──────┘
       │
       ├─ Sucesso → Volta para CLOSED
       └─ Falha → Volta para OPEN
```

### 1️⃣ **CLOSED (Fechado)** - Estado Normal
```
✅ Todas as chamadas passam normalmente
✅ Circuit Breaker monitora erros
✅ Se erros < threshold → Continua CLOSED
❌ Se erros >= threshold → Muda para OPEN
```

### 2️⃣ **OPEN (Aberto)** - Bloqueado
```
⛔ Nenhuma chamada passa
⛔ Retorna erro IMEDIATAMENTE (fail-fast)
⏰ Espera um timeout (ex: 30s)
⏰ Depois muda para HALF-OPEN
```

### 3️⃣ **HALF-OPEN (Meio Aberto)** - Testando
```
🧪 Permite ALGUMAS chamadas (ex: 1 request)
✅ Se sucesso → Volta para CLOSED (recuperado!)
❌ Se falha → Volta para OPEN (ainda quebrado)
```

---

## 💻 Implementação Prática

### Exemplo Real (NestJS + TypeScript)

```typescript
// circuit-breaker.ts
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt: number = Date.now();

  constructor(
    private options: {
      failureThreshold: number;    // Quantas falhas para abrir
      successThreshold: number;    // Quantos sucessos para fechar
      timeout: number;             // Timeout da requisição (ms)
      resetTimeout: number;        // Tempo até tentar de novo (ms)
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 1. Se OPEN e timeout não passou → Falha rápida
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit Breaker is OPEN');
      }
      // Timeout passou → Tenta novamente (HALF_OPEN)
      this.state = 'HALF_OPEN';
    }

    try {
      // 2. Executa a função com timeout
      const result = await this.executeWithTimeout(fn);
      
      // 3. Sucesso!
      return this.onSuccess(result);
    } catch (error) {
      // 4. Falha!
      return this.onFailure(error);
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), this.options.timeout)
      ),
    ]);
  }

  private onSuccess<T>(result: T): T {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      // Sucessos suficientes → Fecha o circuito
      if (this.successCount >= this.options.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        console.log('Circuit Breaker: HALF_OPEN → CLOSED');
      }
    }

    return result;
  }

  private onFailure(error: any): never {
    this.successCount = 0;
    this.failureCount++;

    if (
      this.state === 'HALF_OPEN' ||
      this.failureCount >= this.options.failureThreshold
    ) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.resetTimeout;
      console.log(`Circuit Breaker: OPEN (próxima tentativa em ${this.options.resetTimeout}ms)`);
    }

    throw error;
  }
}
```

### Uso no MS1 chamando MS2:

```typescript
// pagamentos.client.ts
@Injectable()
export class PagamentosClient {
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,      // 5 falhas → OPEN
    successThreshold: 2,      // 2 sucessos → CLOSED
    timeout: 5000,            // 5s timeout por request
    resetTimeout: 30000,      // 30s até tentar de novo
  });

  async criarCobranca(dto: CriarCobrancaDto): Promise<Cobranca> {
    return this.circuitBreaker.execute(async () => {
      // Chamada HTTP real para MS2
      const response = await this.httpClient.post('/pagamentos', dto);
      return response.data;
    });
  }
}
```

---

## 🎬 Timeline Real (Exemplo)

```
10:00:00 - Request 1 → MS2 OK → Circuit: CLOSED
10:00:01 - Request 2 → MS2 OK → Circuit: CLOSED
10:00:02 - MS2 CAIU! (deploy quebrado)
10:00:03 - Request 3 → MS2 TIMEOUT (5s) → Falha 1/5 → Circuit: CLOSED
10:00:08 - Request 4 → MS2 TIMEOUT (5s) → Falha 2/5 → Circuit: CLOSED
10:00:13 - Request 5 → MS2 TIMEOUT (5s) → Falha 3/5 → Circuit: CLOSED
10:00:18 - Request 6 → MS2 TIMEOUT (5s) → Falha 4/5 → Circuit: CLOSED
10:00:23 - Request 7 → MS2 TIMEOUT (5s) → Falha 5/5 → Circuit: OPEN! ⚡

10:00:24 - Request 8 → ⛔ BLOQUEADO (erro imediato, 0s)
10:00:25 - Request 9 → ⛔ BLOQUEADO (erro imediato, 0s)
...
10:00:53 - Request 20 → ⛔ BLOQUEADO (30s passou)

10:00:54 - Circuit: OPEN → HALF_OPEN (vai testar)
10:00:54 - Request 21 → MS2 TIMEOUT → Falha → Circuit: OPEN de novo!
10:01:24 - Circuit: OPEN → HALF_OPEN (vai testar de novo)
10:01:25 - Request 22 → MS2 OK! → Sucesso 1/2 → Circuit: HALF_OPEN
10:01:26 - Request 23 → MS2 OK! → Sucesso 2/2 → Circuit: CLOSED! ✅

10:01:27 - Tudo volta ao normal
```

---

## 🎯 Benefícios

1. **Fail Fast** - Falha rápido ao invés de esperar timeout
2. **Protege MS1** - Não gasta recursos tentando chamar MS2 quebrado
3. **Evita Cascata** - MS2 fora não derruba MS1
4. **Auto-Recuperação** - Tenta sozinho quando timeout passa
5. **Degradação Graceful** - MS1 pode ter fallback enquanto MS2 está fora

---

## 🔄 Combinação com Outros Patterns

### Circuit Breaker + Retry
```typescript
async criarCobranca(dto: CriarCobrancaDto): Promise<Cobranca> {
  return this.circuitBreaker.execute(async () => {
    // Retry: 3 tentativas com backoff
    return retry(
      () => this.httpClient.post('/pagamentos', dto),
      {
        retries: 3,
        minTimeout: 1000,  // 1s, 2s, 4s
        factor: 2,
      }
    );
  });
}
```

### Circuit Breaker + Fallback
```typescript
async criarCobranca(dto: CriarCobrancaDto): Promise<Cobranca> {
  try {
    return await this.circuitBreaker.execute(async () => {
      return this.httpClient.post('/pagamentos', dto);
    });
  } catch (error) {
    if (error.message === 'Circuit Breaker is OPEN') {
      // Fallback: Cria reserva sem cobrança imediata
      return {
        id: 'pending',
        status: 'PENDENTE_COBRANCA',
        // Será processado depois quando MS2 voltar
      };
    }
    throw error;
  }
}
```

---

## 📊 Monitoramento

Métricas importantes para acompanhar:

```typescript
// Prometheus metrics
const circuitBreakerState = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Estado do circuit breaker (0=CLOSED, 1=OPEN, 2=HALF_OPEN)',
  labelNames: ['target_service'],
});

const circuitBreakerFailures = new Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total de falhas detectadas',
  labelNames: ['target_service'],
});

const circuitBreakerTransitions = new Counter({
  name: 'circuit_breaker_transitions_total',
  help: 'Total de mudanças de estado',
  labelNames: ['from_state', 'to_state', 'target_service'],
});
```

**Dashboard Grafana:**
- Gráfico de estado ao longo do tempo
- Alerta se ficar OPEN por >5min
- Taxa de requisições bloqueadas

---

## 🚨 Quando Usar?

✅ **USE em:**
- Chamadas HTTP entre microserviços
- Chamadas a APIs externas (Stripe, SendGrid)
- Conexões com banco de dados externo
- Qualquer I/O que pode falhar ou ser lento

❌ **NÃO use em:**
- Operações locais (processamento em memória)
- Queries no próprio banco de dados (use connection pooling)
- Chamadas síncronas ultra-rápidas (<10ms)

---

## 🎬 **Cenário Real 1: Múltiplos Usuários (Mais Comum)**

```
10:00:00 - User A: Clica em "Criar Reserva" → Request 1 para MS1
10:00:01 - User B: Clica em "Criar Reserva" → Request 2 para MS1
10:00:02 - User C: Clica em "Criar Reserva" → Request 3 para MS1
10:00:03 - User D: Clica em "Criar Reserva" → Request 4 para MS1
10:00:04 - User E: Clica em "Criar Reserva" → Request 5 para MS1

MS1 precisa chamar MS2 (Pagamentos) para cada uma dessas reservas

MS2 está FORA DO AR!

Request 1: MS1 → MS2 → Timeout 5s → User A recebe erro após 5s
Request 2: MS1 → MS2 → Timeout 5s → User B recebe erro após 5s
Request 3: MS1 → MS2 → Timeout 5s → User C recebe erro após 5s
Request 4: MS1 → MS2 → Timeout 5s → User D recebe erro após 5s
Request 5: MS1 → MS2 → Timeout 5s → User E recebe erro após 5s

🔴 Circuit Breaker ABRE (threshold: 5 falhas)

10:00:25 - User F: Clica em "Criar Reserva" → Request 6
          MS1 → ⚡ BLOQUEADO (erro imediato, 0s) → User F recebe erro instantâneo

10:00:26 - User G: Clica em "Criar Reserva" → Request 7
          MS1 → ⚡ BLOQUEADO → User G recebe erro instantâneo
```

**Vantagens:**
- User F e User G recebem erro **imediatamente** (não precisam esperar 5s)
- MS1 não desperdiça recursos tentando chamar MS2 que está quebrado
- Experiência melhor: "erro rápido" é melhor que "travado 5s"

---

## 🎬 **Cenário Real 2: Mesmo Usuário Tentando Novamente**

```
10:00:00 - User A: Clica "Criar Reserva"
10:00:05 - User A recebe timeout (esperou 5s, tela travada)
10:00:06 - User A: Clica "Tentar Novamente" (segunda tentativa)
10:00:11 - User A recebe timeout de novo (esperou mais 5s)
10:00:12 - User A: Clica "Tentar Novamente" (terceira tentativa)
10:00:17 - User A recebe timeout de novo (já são 15s esperando!)

Frustrante para o usuário! ❌
```

**Com Circuit Breaker:**
```
10:00:00 - User A: Clica "Criar Reserva"
10:00:05 - User A recebe timeout (primeira falha)
10:00:06 - User A: Clica "Tentar Novamente"
10:00:11 - User A recebe timeout (segunda falha)
...
(após 5 falhas, circuit abre)

10:00:25 - User A: Clica "Tentar Novamente"
10:00:25 - User A recebe erro IMEDIATO: "Serviço temporariamente indisponível"

Pelo menos não fica esperando 5s toda vez! ✅
```

---

## 🎬 **Cenário Real 3: Processamento Assíncrono (Background)**

Esse é interessante! Nem sempre é o usuário fazendo a requisição:

```
MS1 tem uma fila de 100 reservas pendentes que precisam ser processadas

10:00:00 - Worker 1: Processa Reserva #1 → MS1 → MS2 (timeout 5s)
10:00:00 - Worker 2: Processa Reserva #2 → MS1 → MS2 (timeout 5s)
10:00:00 - Worker 3: Processa Reserva #3 → MS1 → MS2 (timeout 5s)
10:00:05 - Worker 1: Processa Reserva #4 → MS1 → MS2 (timeout 5s)
10:00:05 - Worker 2: Processa Reserva #5 → MS1 → MS2 (timeout 5s)

🔴 Circuit Breaker ABRE

10:00:10 - Worker 1: Processa Reserva #6 → ⚡ BLOQUEADO
         → Reserva fica marcada como "PENDENTE_RETRY"
         → Será reprocessada quando MS2 voltar

10:00:11 - Worker 2: Processa Reserva #7 → ⚡ BLOQUEADO
         → Também fica como "PENDENTE_RETRY"

...

SEM circuit breaker: 100 reservas × 5s = 500s (8 minutos!) desperdiçados
COM circuit breaker: 5 reservas × 5s = 25s, resto falha rápido
```

---

## 💡 **Exemplo Detalhado com Timeline Real**

Vou simular um cenário mais realista:

### **Sistema de Reservas às 14h de uma sexta-feira (horário de pico)**

```
14:00:00 - Deploy do MS2 (Pagamentos) com bug → MS2 CAIU!

14:00:01 - User João (SP): "Criar Reserva Sala A" → Request #1
           MS1 tenta chamar MS2... aguardando...
           
14:00:02 - User Maria (RJ): "Criar Reserva Sala B" → Request #2
           MS1 tenta chamar MS2... aguardando...
           
14:00:03 - User Pedro (MG): "Criar Reserva Sala C" → Request #3
           MS1 tenta chamar MS2... aguardando...

14:00:04 - User Ana (RS): "Criar Reserva Sala D" → Request #4
           MS1 tenta chamar MS2... aguardando...

14:00:05 - User Carlos (BA): "Criar Reserva Sala E" → Request #5
           MS1 tenta chamar MS2... aguardando...

---

14:00:06 - Request #1 (João): TIMEOUT! ❌
           Navegador: "Erro ao processar reserva. Tente novamente."
           João: "Ué? Vou clicar de novo..."

14:00:07 - Request #2 (Maria): TIMEOUT! ❌
           Maria: "Travou? Vou recarregar..."

14:00:08 - Request #3 (Pedro): TIMEOUT! ❌
           Pedro: "Que site lento! Vou tentar de novo"

14:00:09 - Request #4 (Ana): TIMEOUT! ❌
14:00:10 - Request #5 (Carlos): TIMEOUT! ❌

🔴 CIRCUIT BREAKER ABRE! (5 falhas consecutivas)

---

14:00:06 - User João: Clica "Tentar Novamente" → Request #6
           ⚡ Circuit Breaker BLOQUEIA IMEDIATAMENTE
           Resposta: HTTP 503 "Serviço de pagamento temporariamente indisponível. 
                     Estamos trabalhando para resolver. Tente em alguns minutos."
           
           João recebe erro em 0.5 segundos (não espera 5s!)

14:00:07 - User Fernanda (CE): Primeira tentativa → Request #7
           ⚡ BLOQUEADO
           Fernanda: "Ah, sistema em manutenção. Vou voltar daqui a pouco."

14:00:08 - User Lucas (PR): Primeira tentativa → Request #8
           ⚡ BLOQUEADO
           
... (30 segundos se passam, circuit breaker tenta novamente) ...

14:00:36 - Circuit Breaker: Estado muda para HALF-OPEN
           "Vou testar se MS2 voltou..."

14:00:37 - User Roberto: "Criar Reserva" → Request #20
           Circuit Breaker permite TENTAR uma vez
           MS1 → MS2... ainda fora! → TIMEOUT
           
           🔴 Circuit Breaker volta para OPEN
           
14:00:67 - Circuit Breaker: HALF-OPEN novamente (testa a cada 30s)

14:01:07 - User Juliana: "Criar Reserva" → Request #30
           MS1 → MS2... SUCESSO! ✅ (MS2 voltou!)
           
           Circuit Breaker: "MS2 voltou! Mas vou testar mais uma vez..."

14:01:08 - User Rafael: "Criar Reserva" → Request #31
           MS1 → MS2... SUCESSO! ✅
           
           🟢 Circuit Breaker FECHA! (2 sucessos consecutivos)
           Sistema volta ao normal
```

---

## 🤔 **Respondendo Suas Dúvidas Específicas**

### **1. "Cada requisição é o usuário dando refresh?"**

**Não necessariamente!** Pode ser:

a) **Diferentes usuários** fazendo requisições ao mesmo tempo (mais comum)
   ```
   User A clica → Request 1
   User B clica → Request 2
   User C clica → Request 3
   ```

b) **Mesmo usuário** tentando novamente (também comum)
   ```
   User A clica → timeout → clica "tentar novamente" → timeout → clica de novo
   ```

c) **Processos automáticos** (workers, cron jobs, webhooks)
   ```
   Worker processa fila de 100 items
   Webhook do Stripe retentando delivery
   Scheduler executando job a cada minuto
   ```

---

### **2. "Requisição que leva >5s retorna timeout pro usuário?"**

**SIM!** Veja o fluxo:

```typescript
// Frontend (React)
async function criarReserva() {
  setLoading(true);
  
  try {
    const response = await fetch('/api/v1/reservas', {
      method: 'POST',
      body: JSON.stringify(dados),
      timeout: 10000, // Frontend tem seu próprio timeout (10s)
    });
    
    setLoading(false);
    navigate('/confirmacao');
  } catch (error) {
    setLoading(false);
    
    if (error.name === 'TimeoutError') {
      toast.error('Tempo esgotado. Tente novamente.'); // ⬅️ Usuário vê isso
    } else {
      toast.error('Erro ao criar reserva. Tente novamente.');
    }
  }
}
```

**Timeline do ponto de vista do usuário:**

```
User clica "Confirmar Reserva"
  ↓
Frontend: "Carregando..." (spinner girando)
  ↓
1 segundo... 2 segundos... 3 segundos... 4 segundos... 5 segundos...
  ↓
Backend retorna HTTP 500 (timeout interno)
  ↓
Frontend: "Erro ao processar. Tente novamente." (toast vermelho)
  ↓
User: "Vou clicar de novo" 😤
```

---

### **3. "Bloqueio é quando ele recarrega e recebe erro imediato?"**

**EXATAMENTE!** Veja a diferença:

#### **SEM Circuit Breaker:**
```
User clica "Tentar Novamente"
  ↓
Frontend: "Carregando..." 🔄
  ↓
Esperando... (tela travada)
  ↓
5 segundos depois...
  ↓
"Erro de timeout" ❌
  ↓
User frustrado 😡
```

#### **COM Circuit Breaker:**
```
User clica "Tentar Novamente"
  ↓
Frontend: "Carregando..." 🔄
  ↓
0.1 segundos depois... (quase instantâneo!)
  ↓
"Serviço temporariamente indisponível" ⚡
  ↓
User entende que sistema está em manutenção 👍
```

**Código no Backend:**

```typescript
// MS1 → MS2 (sem circuit breaker)
async criarReserva(dto) {
  const reserva = await this.criarReservaLocal(dto);
  
  // Tenta chamar MS2
  const pagamento = await this.ms2Client.post('/pagamentos', {
    timeout: 5000,
  });
  // ⬆️ Sempre espera 5s antes de falhar
  
  return reserva;
}

// MS1 → MS2 (com circuit breaker)
async criarReserva(dto) {
  const reserva = await this.criarReservaLocal(dto);
  
  // Circuit breaker intercepta
  const pagamento = await this.circuitBreaker.execute(async () => {
    return this.ms2Client.post('/pagamentos', { timeout: 5000 });
  });
  // ⬆️ Se circuit está OPEN, falha IMEDIATAMENTE (sem esperar 5s)
  
  return reserva;
}
```

---

## 📊 **Comparação de Experiência do Usuário**

### **Sistema SEM Circuit Breaker (MS2 fora do ar):**

| Tentativa | User clica | Espera | Resultado | Tempo total |
|-----------|-----------|--------|-----------|-------------|
| 1ª | 10:00:00 | 5s | Timeout ❌ | 5s |
| 2ª | 10:00:06 | 5s | Timeout ❌ | 10s |
| 3ª | 10:00:12 | 5s | Timeout ❌ | 15s |
| 4ª | 10:00:18 | 5s | Timeout ❌ | 20s |
| Desiste | - | - | 😡💢 | - |

**User experience:** PÉSSIMA

---

### **Sistema COM Circuit Breaker (MS2 fora do ar):**

| Tentativa | User clica | Espera | Resultado | Tempo total |
|-----------|-----------|--------|-----------|-------------|
| 1ª | 10:00:00 | 5s | Timeout ❌ | 5s |
| 2ª | 10:00:06 | 5s | Timeout ❌ | 10s |
| 3ª | 10:00:12 | 5s | Timeout ❌ | 15s |
| 4ª | 10:00:18 | 5s | Timeout ❌ | 20s |
| 5ª | 10:00:24 | 5s | Timeout ❌ | 25s |
| 🔴 **Circuit ABRE** | - | - | - | - |
| 6ª | 10:00:30 | **0.1s** | "Serviço indisponível" ⚡ | 25s |
| 7ª | 10:00:35 | **0.1s** | "Serviço indisponível" ⚡ | 25s |
| Desiste por enquanto | - | - | 😐 (entende) | - |

**User experience:** Ruim, mas compreensível

---

## 🎯 **Resumo Final**

**As requisições no exemplo são:**
1. ✅ Múltiplos usuários diferentes tentando usar o sistema
2. ✅ Mesmo usuário tentando novamente após erro
3. ✅ Processos automáticos/workers processando filas
4. ✅ Qualquer cliente (web, mobile, integração) chamando a API

**Sobre o timeout:**
- ✅ Sim, usuário espera até timeout (5s) e vê erro
- ✅ Depois de 5 falhas, circuit breaker "aprende" que serviço está fora
- ✅ Próximas requisições falham IMEDIATAMENTE (0.1s) sem tentar chamar MS2
- ✅ Isso economiza tempo do usuário E recursos do servidor

**Benefício principal:**
- **Fail fast** - "Errar rápido" é melhor que "travar lento"
- Usuário recebe feedback imediato ao invés de ficar esperando
- Sistema não desperdiça recursos tentando algo que está sabidamente quebrado