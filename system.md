# Sistema de Reserva de Espaços - Requisitos Funcionais

## 📋 Contexto do Sistema

**Tipo:** Multi-tenant (vários proprietários)  
**Modelo:** Marketplace de espaços para reserva  
**Usuários:**
- **Proprietário**: cadastra e gerencia espaços, recebe por reservas
- **Cliente**: busca e reserva espaços, paga por uso
- **Nota**: Um usuário pode ser AMBOS simultaneamente

---

## 🎯 CORE (MVP - essencial para funcionar)

### **1. Autenticação & Perfis de Usuário**

#### **Registro de Usuário (Self-Service)**
- Cliente pode se registrar
- Proprietário pode se registrar  
- Dados obrigatórios:
  - Nome completo
  - Email (único no sistema)
  - Telefone
  - CPF ou CNPJ
  - Senha (hash seguro)
- Um usuário pode ser cliente E proprietário simultaneamente

#### **Login/Logout**
- Login com email + senha
- Geração de token JWT usando algoritmo RS256
- Logout (invalidação de token/refresh token)
- Sessão: 15 min (access token), 7 dias (refresh token)

#### **Recuperação de Senha**
- Solicitar reset via email
- Receber link com token temporário (válido 1 hora)
- Redefinir senha

#### **Perfis de Acesso**
- **Cliente**: fazer reservas, ver histórico, gerenciar perfil
- **Proprietário**: cadastrar espaços, ver reservas, gerenciar perfil

---

### **2. Gestão de Espaços** (Proprietário)

#### **Cadastrar Espaço**
Informações obrigatórias:
- Nome do espaço
- Descrição detalhada
- Capacidade máxima (pessoas)
- Preço por hora (R$)
- 1 foto principal (MVP)
- Localização:
  - Endereço completo
  - CEP, Cidade, Estado
  - País (default: Brasil)
- Tipo: Sala reunião, Auditório, Estúdio, Coworking, Outro

#### **Listar Meus Espaços**
- Ver todos os espaços cadastrados
- Filtrar por status (ativo/inativo), cidade
- Ordenar por data criação, nome

#### **Atualizar Espaço**
- Editar qualquer informação
- Atualizar foto principal

#### **Ativar/Desativar Espaço**
- **Ativo**: aparece em buscas, aceita reservas
- **Inativo**: não aparece, não aceita novas reservas, mantém existentes

#### **Gerenciar Disponibilidade**
Ver seção dedicada abaixo ↓

---

### **2.1. Gestão de Disponibilidade - Bloqueios Manuais**

**Conceito:**
- Por padrão: espaço disponível 24 horas, 7 dias por semana
- Proprietário bloqueia datas/horários específicos quando necessário
- Exemplos de uso:
  - "Manutenção dia 25/12 → bloqueia 25/12 00:00-23:59"
  - "Evento particular 15/01 14h-18h → bloqueia 15/01 14:00-18:00"
  - "Viagem na semana do dia 10 → bloqueia 10/01 00:00 até 17/01 23:59"

**Implementação:**
```sql
CREATE TABLE space_blocks (
  id UUID PRIMARY KEY,
  space_id UUID REFERENCES spaces(id),
  blocked_from TIMESTAMP NOT NULL,
  blocked_until TIMESTAMP NOT NULL,
  reason VARCHAR(255), -- opcional: "manutenção", "evento particular", etc
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_space_blocks_space ON space_blocks(space_id);
CREATE INDEX idx_space_blocks_dates ON space_blocks(blocked_from, blocked_until);
```

**Funcionalidades para Proprietário:**
- Ver calendário visual do espaço
- Clicar em data/hora para marcar como bloqueado
- Definir período: data/hora início até data/hora fim
- Adicionar razão opcional (ex: "manutenção", "férias")
- Listar todos os bloqueios ativos
- Remover bloqueio (desbloquear)

**Algoritmo de Verificação de Disponibilidade:**
```javascript
async function isAvailable(spaceId, startTime, endTime) {
  // 1. Verifica se espaço está ativo
  const space = await db.spaces.findOne({ id: spaceId });
  if (!space || !space.is_active) {
    return false;
  }
  
  // 2. Verifica bloqueios manuais que sobrepõem o período solicitado
  const blocks = await db.space_blocks
    .where({ space_id: spaceId })
    .where('blocked_from', '<', endTime)
    .where('blocked_until', '>', startTime);
  
  if (blocks.length > 0) {
    return false; // Há bloqueio no período
  }
  
  // 3. Verifica reservas confirmadas que sobrepõem
  const bookings = await db.bookings
    .where({ space_id: spaceId })
    .where({ status: 'CONFIRMED' })
    .where('start_time', '<', endTime)
    .where('end_time', '>', startTime);
  
  if (bookings.length > 0) {
    return false; // Já existe reserva confirmada
  }
  
  return true; // Disponível! ✅
}
```

**Vantagens:**
- ✅ Simples de implementar (apenas 1 tabela adicional)
- ✅ Flexível (bloqueia qualquer período arbitrário)
- ✅ Proprietário não precisa configurar nada no início
- ✅ Baixo esforço de manutenção
- ✅ Intuitivo para o proprietário

---

### **3. Busca & Descoberta** (Cliente)

#### **Buscar Espaços**
Filtros:
- Cidade (obrigatório)
- Capacidade mínima
- Faixa de preço (R$/hora)
- Tipo de espaço
- Data/horário (opcional)

Ordenação:
- Preço (menor → maior)
- Capacidade
- Mais recentes

#### **Ver Detalhes**
- Todas informações do espaço
- Foto, preço, capacidade
- Endereço
- Proprietário (nome)
- Botão: "Verificar disponibilidade"

#### **Verificar Disponibilidade**
- Cliente seleciona data, hora início/fim
- Sistema retorna:
  - ✅ Disponível
  - ❌ Indisponível (sugere horários próximos)
- Mostra calendário visual

---

### **4. Gestão de Reservas**

#### **4.1. Fluxo Completo (Cliente)**

```
1. Buscar Espaço
2. Ver Detalhes
3. Selecionar Data/Hora
4. Sistema Verifica Disponibilidade
5. CHECKOUT - Revisar:
   → Espaço, Data, Horário
   → Duração (horas)
   → Valor total
   → Botão: "Confirmar e Pagar"
6. Sistema Cria Reserva (PENDING)
7. Redireciona para Gateway Pagamento
8. Cliente Paga
9. Gateway Notifica Sistema (webhook)
10. Sistema Confirma (CONFIRMED)
11. Email Confirmação
```

#### **4.2. Estados da Reserva**

| Status | Descrição | Pode Cancelar? |
|--------|-----------|----------------|
| PENDING | Aguardando pagamento | ✅ |
| CONFIRMED | Paga e confirmada | ✅ (até 24h antes) |
| COMPLETED | Cliente já usou | ❌ |
| CANCELLED | Cancelada por cliente | ❌ |
| CANCELLED_BY_OWNER | Cancelada por proprietário | ❌ |
| EXPIRED | Pagamento não recebido (30 min) | ❌ |

#### **4.3. Validações CRÍTICAS**

Ao criar reserva, sistema valida:
- ✅ Espaço está ativo
- ✅ Data/hora no futuro
- ✅ Horário não bloqueado
- ✅ Sem overlap com outra reserva CONFIRMED
- ✅ Duração mínima (1 hora)
- ✅ Respeita horário funcionamento (se Opção 2)

**Algoritmo:**
```javascript
function isAvailable(spaceId, start, end) {
  // 1. Verifica bloqueios
  const blocks = getBlocks(spaceId, start, end);
  if (blocks.length > 0) return false;
  
  // 2. Verifica reservas confirmadas
  const bookings = getConfirmedBookings(spaceId, start, end);
  if (bookings.length > 0) return false;
  
  return true; // Disponível!
}
```

#### **4.4. Funcionalidades**

**Cliente:**
- Criar reserva
- Ver minhas reservas (filtros: status, período)
- Ver detalhes
- Cancelar (até 24h antes)

**Proprietário:**
- Ver reservas dos meus espaços
- Ver detalhes
- Cancelar (excepcional, sempre reembolsa)
- Filtrar por espaço, status, período
- Dashboard simples: receita, total reservas, ocupação

#### **4.5. Política de Cancelamento (MVP)**

| Cenário | Reembolso | Status |
|---------|-----------|--------|
| Cliente cancela até 24h antes | 100% | CANCELLED |
| Cliente cancela < 24h antes | 0% | CANCELLED |
| Proprietário cancela | 100% | CANCELLED_BY_OWNER |
| Cliente não paga (30 min) | N/A | EXPIRED |

```javascript
function canRefund(booking) {
  const now = new Date();
  const start = new Date(booking.start_time);
  const hoursUntil = (start - now) / (1000 * 60 * 60);
  
  return hoursUntil >= 24;
}
```

---

### **5. Processamento de Pagamentos** (Payment Service)

#### **5.1. Criar Cobrança**
Quando reserva → PENDING:
- Cria cobrança no Payment Service
- Gera link/QR Code Pix/checkout cartão
- Armazena:
  - `booking_id`
  - `amount`
  - `payment_gateway_id`
  - `status` (pending)

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  status VARCHAR(20), -- pending, completed, failed, refunded
  payment_method VARCHAR(50), -- pix, credit_card, debit_card
  gateway_transaction_id VARCHAR(255),
  gateway_name VARCHAR(50), -- stripe, mercado_pago
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **5.2. Processar Pagamento**

**Fluxo:**
1. Cliente paga na gateway (Stripe, Mercado Pago)
2. Gateway processa
3. Gateway envia webhook
4. Payment Service valida webhook
5. Atualiza: `pending → completed`
6. Publica evento: `payment.completed`
7. Property Management escuta
8. Atualiza reserva: `PENDING → CONFIRMED`
9. Notification Service escuta
10. Envia email confirmação

#### **5.3. Processar Reembolso**

Quando cancelamento com reembolso:
1. Booking Service valida política
2. Calcula % reembolso
3. Publica: `booking.cancelled`
4. Payment Service escuta
5. Chama API gateway (refund)
6. Cria registro reembolso
7. Atualiza: `completed → refunded`
8. Notification envia email

```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY,
  payment_id UUID REFERENCES payments(id),
  amount DECIMAL(10,2),
  reason VARCHAR(100), -- cancelled_by_customer, cancelled_by_owner
  gateway_refund_id VARCHAR(255),
  refunded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **5.4. Consultar Status**
Cliente vê:
- Status: Pendente, Pago, Reembolsado, Falhou
- Método pagamento
- Data/hora transação

#### **5.5. Gateways Sugeridos**
**MVP:** Stripe ou Mercado Pago  
**Intermediário:** Múltiplos gateways

---

### **6. Notificações** (Notification Service)

#### **Emails Obrigatórios (MVP)**

**Bem-vindo**
- Trigger: Registro
- Para: Novo usuário
- Conteúdo: Boas-vindas, guia rápido

**Reserva Criada (Aguardando Pagamento)**
- Trigger: Reserva PENDING
- Para: Cliente
- Conteúdo: Detalhes, link pagamento, aviso "30 min"

**Reserva Confirmada**
- Trigger: Pagamento aprovado
- Para: Cliente E Proprietário
- Cliente: Confirmação, detalhes, endereço, política cancelamento
- Proprietário: Nova reserva, detalhes cliente

**Cancelamento**
- Trigger: Reserva cancelada
- Para: Cliente E Proprietário
- Conteúdo: Cancelamento, info reembolso, motivo

**Lembrete** (Opcional)
- Trigger: 1 dia antes
- Para: Cliente
- Conteúdo: Lembrete amigável

---

### **7. Gestão de Perfil** (User Service)

#### **Cliente:**
- Ver/editar: nome, telefone
- CPF/CNPJ não editável
- Alterar senha
- Estatísticas: total reservas, valor gasto

#### **Proprietário:**
- Igual cliente +
- Estatísticas: espaços, reservas recebidas, receita, ocupação

---

## 🚀 INTERMEDIÁRIO (polimento)

### **Validações Avançadas**
- Tempo mínimo/máximo reserva customizável
- Antecedência mínima/máxima
- **Horários de funcionamento por dia da semana** (evolução da disponibilidade)
  - Proprietário define horários padrão (ex: Seg-Sex 8h-18h)
  - Sistema bloqueia automaticamente fora desses horários
  - Mantém bloqueios manuais para exceções

### **Galeria de Fotos**
- Múltiplas fotos (até 10)
- Definir foto principal
- Reordenar

### **Precificação Avançada**
- Preços por período (fim semana, feriados, horário)
- Taxas adicionais
- Descontos (tempo, cupons)

### **Políticas Customizáveis**
- Flexível, Moderada, Rígida

### **Relatórios**
- Dashboard gráficos
- Exportar CSV/PDF
- Comparar períodos

### **Busca Avançada**
- Geolocalização (raio, mapa)
- Filtros: avaliação, amenidades
- Ordenação: avaliação, proximidade

### **Favoritos**
- Salvar espaços favoritos

### **Calendário Visual**
- Ver mês completo
- Criar bloqueios clicando

---

## ⭐ AVANÇADO (nice to have)

### **Avaliações**
- Cliente avalia espaço (1-5 ⭐)
- Proprietário avalia cliente

### **Add-ons**
- Equipamentos extras (projetor +R$20)

### **Pacotes**
- "Diária completa: 8h por R$300"

### **Reservas Recorrentes**
- "Toda segunda 14h-16h por 3 meses"

### **Chat Interno**
- Mensagens cliente ↔ proprietário

### **Google Calendar**
- Sincronização

### **Fidelidade**
- Pontos, descontos, níveis

### **Multi-idiomas**
- PT, EN, ES

### **Verificação Identidade**
- Upload documentos, selo "Verificado"

---

## 🔧 Detalhes Técnicos

### **Autenticação**
- Algoritmo: RS256
- Access Token: 15 min
- Refresh Token: 7 dias
- Storage: Redis

### **Geração de IDs**
**Método:** Redis INCR + Base62 Ofuscado

**Por quê?**
1. Exclusividade: Redis INCR garante único
2. Ofuscação: Base62 embaralhado impede adivinhação
3. Compactação: 62 caracteres reduz tamanho

**Exemplo:**
```
Redis INCR: 12345
↓ Base62 ofuscado
ID final: "a4Kp2"
```

**Implementação:**
```javascript
const sequentialId = await redis.incr('booking_id_counter');
const shuffledChars = shuffleWithKey(base62Chars, SECRET);
const id = toBase62(sequentialId, shuffledChars);
// Resultado: "g5Xp9K"
```

**Vantagens:**
- ✅ IDs curtos
- ✅ Imprevisível
- ✅ Não expõe volume

### **Fuso Horário**
- Armazenar UTC
- Converter no frontend
- Proprietário define fuso espaço

### **CPF/CNPJ**
- Validar formato API
- Armazenar sem formatação
- Único por usuário

### **Upload Fotos**
**MVP:** Filesystem local, 1 foto, 5MB, JPG/PNG  
**Intermediário:** S3/Cloud, múltiplas, redimensionamento, CDN

### **Paginação**
- Padrão: 20 itens/página
- Query: `?page=1&limit=20`
- Retornar metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

---

## 📊 Resumo Prioridades

### ✅ CORE (Fase 1 - MVP)
- Autenticação completa
- Gestão espaços (CRUD, 1 foto)
- Busca básica
- **Disponibilidade: 24/7 com bloqueios manuais**
- Reservas (fluxo completo, estados)
- Pagamentos (criar, confirmar, reembolsar)
- Notificações (emails essenciais)
- Política cancelamento fixa (24h)

### 🚀 INTERMEDIÁRIO (Fase 2)
- Horário funcionamento por dia (evolução disponibilidade)
- Múltiplas fotos
- Precificação avançada
- Políticas flexíveis
- Relatórios
- Busca geolocalização

### ⭐ AVANÇADO (Fase 3+)
- Avaliações
- Add-ons
- Recorrentes
- Chat
- Fidelidade
- Multi-idiomas

---
