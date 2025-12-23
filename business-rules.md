# Regras de Negócio - Sistema de Reserva de Espaços

## 📋 Índice
1. [Autenticação e Perfis](#autenticação-e-perfis)
2. [Gestão de Espaços](#gestão-de-espaços)
3. [Disponibilidade e Bloqueios](#disponibilidade-e-bloqueios)
4. [Busca e Descoberta](#busca-e-descoberta)
5. [Reservas (Bookings)](#reservas-bookings)
6. [Pagamentos](#pagamentos)
7. [Cancelamentos e Reembolsos](#cancelamentos-e-reembolsos)
8. [Notificações](#notificações)

---

## Autenticação e Perfis

### RN-AUTH-001: Registro de Usuário
- Um usuário pode ser cliente E proprietário simultaneamente
- Dados obrigatórios: nome completo, email (único), telefone, CPF ou CNPJ, senha
- CPF/CNPJ deve ser único no sistema
- Email deve ser único no sistema
- Senha deve ser armazenada com hash seguro (bcrypt)

### RN-AUTH-002: Sessão e Tokens
- Access Token: validade de 15 minutos
- Refresh Token: validade de 7 dias
- Algoritmo JWT: RS256
- Tokens devem ser armazenados em Redis

### RN-AUTH-003: Recuperação de Senha
- Link de recuperação válido por 1 hora
- Token de reset deve ser temporário e único

### RN-AUTH-004: Perfis de Acesso
- **Cliente**: pode fazer reservas, ver histórico, gerenciar perfil
- **Proprietário**: pode cadastrar espaços, ver reservas, gerenciar perfil
- **Admin**: acesso total ao sistema

### RN-AUTH-005: Dados Imutáveis
- CPF/CNPJ não pode ser editado após registro
- ID do usuário não pode ser alterado

---

## Gestão de Espaços

### RN-SPACE-001: Cadastro de Espaço
- Apenas usuários com perfil "Proprietário" podem cadastrar espaços
- Campos obrigatórios:
  - Nome do espaço
  - Descrição detalhada
  - Capacidade máxima (pessoas)
  - Preço por hora (R$)
  - 1 foto principal (MVP)
  - Endereço completo (CEP, Cidade, Estado, País)
  - Tipo de espaço

### RN-SPACE-002: Tipos de Espaço
- Tipos válidos: Sala reunião, Auditório, Estúdio, Coworking, Outro

### RN-SPACE-003: Status do Espaço
- **Ativo**: aparece em buscas e aceita reservas
- **Inativo**: não aparece em buscas, não aceita novas reservas, mas mantém reservas existentes

### RN-SPACE-004: Propriedade do Espaço
- Um espaço pertence a apenas um proprietário
- Apenas o proprietário pode editar ou desativar seu espaço

### RN-SPACE-005: Localização
- País padrão: Brasil
- CEP deve ser validado
- Endereço completo é obrigatório

### RN-SPACE-006: Fotos
- **MVP**: 1 foto principal obrigatória
- Formatos aceitos: JPG, PNG
- Tamanho máximo: 5MB
- **Intermediário**: até 10 fotos com foto principal definida

---

## Disponibilidade e Bloqueios

### RN-AVAIL-001: Disponibilidade Padrão
- Por padrão, todo espaço está disponível 24 horas por dia, 7 dias por semana
- Proprietário bloqueia manualmente períodos específicos quando necessário

### RN-AVAIL-002: Bloqueios Manuais
- Proprietário pode bloquear qualquer período arbitrário (data/hora início até data/hora fim)
- Motivo do bloqueio é opcional
- Bloqueios podem sobrepor períodos (ex: bloquear semana inteira)

### RN-AVAIL-003: Remoção de Bloqueios
- Proprietário pode remover bloqueios a qualquer momento
- Remoção de bloqueio libera imediatamente o período para reservas

### RN-AVAIL-004: Verificação de Disponibilidade
Um período está disponível se e somente se:
1. Espaço está com status "Ativo"
2. Não existe bloqueio manual que sobreponha o período solicitado
3. Não existe reserva CONFIRMADA que sobreponha o período solicitado

### RN-AVAIL-005: Algoritmo de Sobreposição
Dois períodos sobrepõem se:
```
(inicio1 < fim2) AND (fim1 > inicio2)
```

### RN-AVAIL-006: Reservas Temporárias (Durante Saga)
- Durante processamento de pagamento, datas ficam com status "RESERVED"
- Reservas temporárias expiram após 10 minutos se pagamento não for confirmado
- Após expiração, sistema libera automaticamente as datas

### RN-AVAIL-007: Horários de Funcionamento (Intermediário)
- Proprietário pode definir horários padrão por dia da semana
- Sistema bloqueia automaticamente fora dos horários de funcionamento
- Bloqueios manuais têm prioridade sobre horários padrão

---

## Busca e Descoberta

### RN-SEARCH-001: Critérios de Busca
- Cidade é obrigatória na busca
- Filtros opcionais: capacidade mínima, faixa de preço, tipo de espaço, data/horário

### RN-SEARCH-002: Resultados de Busca
- Apenas espaços com status "Ativo" aparecem em buscas
- Resultados são paginados (20 itens por página)

### RN-SEARCH-003: Ordenação
- Opções de ordenação: preço (menor → maior), capacidade, data de cadastro (mais recentes)
- Ordenação padrão: mais recentes

### RN-SEARCH-004: Eventual Consistency
- Search Service pode ter atraso de 0.5s a 2s em relação ao Property Management
- Sempre validar na fonte da verdade (PostgreSQL) ao abrir detalhes
- Se espaço não existir ou estiver inativo, retornar 404

### RN-SEARCH-005: Sincronização de Dados
- Search Service é somente leitura (read model)
- Sincronização acontece via eventos assíncronos
- Reconciliação automática a cada 1 hora

---

## Reservas (Bookings)

### RN-BOOK-001: Criação de Reserva
Cliente pode criar reserva se:
1. Espaço está ativo
2. Data/hora está no futuro
3. Horário não está bloqueado
4. Não existe overlap com outra reserva CONFIRMED
5. Duração mínima: 1 hora
6. Respeita horários de funcionamento (se configurado)

### RN-BOOK-002: Estados da Reserva
- **PENDING**: Aguardando pagamento (max 30 minutos)
- **PROCESSING**: Pagamento sendo processado
- **CONFIRMED**: Paga e confirmada
- **CANCELLED**: Cancelada por cliente
- **CANCELLED_BY_OWNER**: Cancelada por proprietário
- **FAILED**: Falha no processamento
- **EXPIRED**: Pagamento não recebido em 30 minutos
- **COMPLETED**: Cliente já utilizou o espaço

### RN-BOOK-003: Transição de Estados
```
PENDING → PROCESSING → CONFIRMED → COMPLETED
    ↓          ↓            ↓
  EXPIRED   FAILED    CANCELLED
```

### RN-BOOK-004: Cálculo de Valor
- Valor total = Preço por hora × Número de horas
- Arredondamento: sempre para cima (ex: 2h30min = 3h)

### RN-BOOK-005: Expiração de Reserva Pendente
- Reservas PENDING expiram automaticamente após 30 minutos sem pagamento
- Job executa a cada 1 minuto para limpar reservas expiradas
- Ao expirar, libera datas reservadas

### RN-BOOK-006: Validação de Overlap
Não pode criar reserva se existir outra com status CONFIRMED que sobreponha o período

### RN-BOOK-007: Reserva Durante Processamento
- Durante saga de pagamento, datas ficam temporariamente reservadas
- Status da disponibilidade: RESERVED
- Expira em 10 minutos se pagamento não confirmar
- Após confirmação, muda para BOOKED

### RN-BOOK-008: Lock Pessimista
- Ao verificar disponibilidade durante criação de reserva, aplicar lock FOR UPDATE
- Previne double booking em condições de corrida

### RN-BOOK-009: Propriedade da Reserva
- Uma reserva pertence a um cliente (guest) e a um espaço
- Espaço pertence a um proprietário (host)

---

## Pagamentos

### RN-PAY-001: Criação de Cobrança
- Cobrança criada automaticamente quando reserva entra em PENDING
- Armazena: booking_id, amount, gateway_transaction_id, status

### RN-PAY-002: Processamento de Pagamento
Fluxo:
1. Cliente paga na gateway (Stripe, Mercado Pago)
2. Gateway processa e envia webhook
3. Payment Service valida webhook
4. Atualiza status: pending → completed
5. Publica evento: payment.completed
6. Property Management atualiza reserva: PENDING → CONFIRMED
7. Notification Service envia email confirmação

### RN-PAY-003: Métodos de Pagamento
- Aceitos: Pix, Cartão de Crédito, Cartão de Débito
- Gateway: Stripe ou Mercado Pago (MVP)

### RN-PAY-004: Moeda
- Moeda padrão: BRL (Real Brasileiro)

### RN-PAY-005: Validação de Webhook
- Webhook deve ser validado com assinatura da gateway
- Rejeitar webhooks inválidos ou duplicados

### RN-PAY-006: Idempotência
- Processamento de pagamento deve ser idempotente
- Usar gateway_transaction_id para evitar duplicação

### RN-PAY-007: Falha no Pagamento
Se pagamento falhar:
1. Atualiza status: pending → failed
2. Publica evento: payment.failed
3. Inicia compensação da saga
4. Libera datas reservadas
5. Atualiza reserva: PROCESSING → FAILED

---

## Cancelamentos e Reembolsos

### RN-CANCEL-001: Política de Cancelamento por Cliente
- **Cancelamento até 24h antes**: Reembolso de 100%
- **Cancelamento < 24h antes**: Sem reembolso (0%)
- Cliente pode cancelar apenas reservas CONFIRMED ou PENDING

### RN-CANCEL-002: Cancelamento por Proprietário
- Proprietário pode cancelar a qualquer momento
- **Sempre reembolsa 100%** ao cliente
- Status final: CANCELLED_BY_OWNER

### RN-CANCEL-003: Processamento de Reembolso
Fluxo:
1. Booking Service valida política de cancelamento
2. Calcula percentual de reembolso
3. Publica evento: booking.cancelled
4. Payment Service escuta evento
5. Chama API da gateway para reembolso
6. Cria registro de reembolso
7. Atualiza status pagamento: completed → refunded
8. Notification envia email confirmação

### RN-CANCEL-004: Impossibilidade de Cancelamento
Não pode cancelar reservas com status:
- COMPLETED
- CANCELLED
- CANCELLED_BY_OWNER
- EXPIRED
- FAILED

### RN-CANCEL-005: Cálculo de Reembolso
```javascript
function canRefund(booking) {
  const now = new Date();
  const start = new Date(booking.start_time);
  const hoursUntil = (start - now) / (1000 * 60 * 60);

  if (booking.cancelled_by === 'owner') return 100;
  if (hoursUntil >= 24) return 100;
  return 0;
}
```

### RN-CANCEL-006: Liberação de Disponibilidade
- Ao cancelar reserva, liberar imediatamente as datas
- Aumentar availability_score do espaço no Search Service

---

## Notificações

### RN-NOTIF-001: Email de Boas-Vindas
- Trigger: Registro de novo usuário
- Destinatário: Novo usuário
- Conteúdo: Mensagem de boas-vindas e guia rápido

### RN-NOTIF-002: Email de Reserva Criada
- Trigger: Reserva criada (status PENDING)
- Destinatário: Cliente
- Conteúdo: Detalhes da reserva, link de pagamento, aviso de expiração em 30 minutos

### RN-NOTIF-003: Email de Reserva Confirmada
- Trigger: Pagamento aprovado (status CONFIRMED)
- Destinatários: Cliente E Proprietário
- Cliente recebe: Confirmação, detalhes, endereço, política de cancelamento
- Proprietário recebe: Nova reserva, detalhes do cliente

### RN-NOTIF-004: Email de Cancelamento
- Trigger: Reserva cancelada
- Destinatários: Cliente E Proprietário
- Conteúdo: Confirmação de cancelamento, informações de reembolso, motivo

### RN-NOTIF-005: Email de Lembrete (Opcional)
- Trigger: 1 dia antes da reserva
- Destinatário: Cliente
- Conteúdo: Lembrete amigável com detalhes da reserva

### RN-NOTIF-006: Comunicação Assíncrona
- Notification Service escuta eventos via Event Bus
- Não bloqueia fluxo principal
- Falhas em notificação não afetam transações críticas

---

## Regras Técnicas e Validações

### RN-TECH-001: Geração de IDs
- Método: Redis INCR + Base62 ofuscado
- IDs devem ser únicos, curtos e imprevisíveis
- Não expõem volume de dados

### RN-TECH-002: Fuso Horário
- Armazenar todas datas/horas em UTC no banco de dados
- Converter para fuso horário local no frontend
- Proprietário define fuso horário do espaço

### RN-TECH-003: CPF/CNPJ
- Validar formato via API
- Armazenar sem formatação (apenas números)
- Único por usuário

### RN-TECH-004: Paginação
- Padrão: 20 itens por página
- Query params: ?page=1&limit=20
- Retornar metadata: page, limit, total, totalPages

### RN-TECH-005: Duplicação de Dados
- Cada microserviço mantém cópia local dos dados que precisa
- Sincronização via eventos assíncronos
- Eventual consistency é aceitável (0.5s - 2s)

### RN-TECH-006: Saga Pattern
- Reservas usam Saga Orquestrada
- Ordem dos steps: Reserve Availability → Process Payment → Confirm Booking
- Compensação em ordem reversa se houver falha

### RN-TECH-007: Idempotência
- Todas operações críticas devem ser idempotentes
- Usar version ou eventId para evitar duplicação
- Handlers de eventos devem verificar se já processaram

### RN-TECH-008: Retry Policy
- Máximo de 3 tentativas com backoff exponencial
- Após 3 falhas, enviar para Dead Letter Queue
- Alertar equipe de ops

### RN-TECH-009: Reconciliação
- Job de reconciliação executa a cada 1 hora
- Compara dados entre serviços (IDs no Elasticsearch vs PostgreSQL)
- Re-indexa ou remove dados inconsistentes

### RN-TECH-010: Eventos de Domínio
Eventos devem conter:
- eventId (único)
- timestamp
- version (incremental)
- Dados relevantes do domínio

### RN-TECH-011: Versionamento
- Eventos possuem version incremental
- Só processar se version do evento > version atual
- Previne processar eventos antigos ou fora de ordem

---

## Regras de Consistência Distribuída

### RN-DIST-001: Eventual Consistency
- Aceitável para: busca de espaços, sincronização de perfis, atualização de índices
- Latência típica: 0.5s - 2s
- Sempre validar na fonte da verdade em operações críticas

### RN-DIST-002: Strong Consistency
- Necessária para: criação de reservas, processamento de pagamentos, verificação de disponibilidade
- Usar transações ACID dentro do Property Management Service

### RN-DIST-003: Fonte da Verdade
- **User Service**: dados completos de usuários
- **Property Management**: espaços, reservas, disponibilidade
- **Payment Service**: transações financeiras
- **Auth Service**: credenciais de autenticação
- **Search Service**: índices de busca (read model)

### RN-DIST-004: At-Least-Once Delivery
- Event Bus garante entrega de eventos pelo menos uma vez
- Handlers devem ser idempotentes

### RN-DIST-005: Dead Letter Queue
- Eventos que falham após 3 tentativas vão para DLQ
- DLQ requer investigação manual
- Sistema alerta equipe de ops automaticamente

---

## Regras de Autorização

### RN-AUTHZ-001: Propriedade de Recurso
- Apenas proprietário pode editar/deletar seu espaço
- Apenas proprietário pode ver detalhes financeiros de seu espaço
- Apenas cliente pode cancelar sua própria reserva (exceto proprietário)

### RN-AUTHZ-002: Roles e Permissions
- **guest**: pode fazer reservas
- **host**: pode criar espaços e fazer reservas
- **admin**: acesso total

### RN-AUTHZ-003: JWT Claims
Token deve conter:
- sub (user id)
- email
- name
- role
- permissions
- emailVerified
- phoneVerified

### RN-AUTHZ-004: Validação de Permissões
- API Gateway valida assinatura e expiração do JWT
- Microserviços validam autorização de negócio
- Microserviços consultam dados locais duplicados

### RN-AUTHZ-005: Verificações Obrigatórias
Para criar espaço, usuário deve:
- Ter role "host" ou "admin"
- Ter permissão "create_listing"
- Ter email verificado
- Não estar suspenso

---

## Resumo de Prioridades

### ✅ CORE (MVP)
- RN-AUTH-*: Todas regras de autenticação
- RN-SPACE-001 a 005: Gestão básica de espaços
- RN-AVAIL-001 a 006: Disponibilidade com bloqueios manuais
- RN-SEARCH-001 a 003: Busca básica
- RN-BOOK-001 a 009: Fluxo completo de reservas
- RN-PAY-001 a 007: Processamento de pagamentos
- RN-CANCEL-001 a 006: Cancelamentos e reembolsos
- RN-NOTIF-001 a 004: Notificações essenciais

### 🚀 INTERMEDIÁRIO
- RN-SPACE-006: Múltiplas fotos
- RN-AVAIL-007: Horários de funcionamento
- RN-SEARCH-004 a 005: Busca avançada e sincronização
- RN-NOTIF-005: Lembretes

### ⭐ AVANÇADO
- Avaliações e reviews
- Add-ons e pacotes
- Reservas recorrentes
- Chat interno
- Fidelidade
