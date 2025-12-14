🎯 ADRs são uma ferramenta **extremamente valiosa** e você está certo em querer fazer direito desde o começo. Vou te mostrar o padrão da comunidade.

## **O que é ADR?**

**Architecture Decision Record** = Documento que captura uma **decisão arquitetural importante**, o **contexto**, as **alternativas consideradas** e as **consequências**.

### **Por que usar?**

- 📜 **Memória institucional**: Daqui 6 meses você vai esquecer POR QUE escolheu usar Saga vs transação distribuída
- 🤝 **Onboarding**: Novos devs entendem as decisões sem te perguntar
- 🔄 **Evita retrabalho**: \"Já tentamos isso antes, veja ADR-005\"
- 🧠 **Processo de pensamento**: Força você a pensar nas alternativas

---

## **Template Padrão (mais usado na comunidade)**

### **Template de Michael Nygard** (o mais popular)

```markdown
# ADR-XXX: [Título curto da decisão]

## Status
[Proposto | Aceito | Rejeitado | Depreciado | Substituído por ADR-YYY]

## Contexto
[Descreve a força que está exigindo uma decisão - tecnológica, política, social, de projeto.
Neutro em relação à solução. Apenas os fatos.]

## Decisão
[Descreve nossa resposta a essas forças. 
Voz ativa: \"Vamos usar...\", \"Vamos adotar...\"]

## Consequências
[Descreve o contexto resultante, após aplicar a decisão.
Todas as consequências devem ser listadas aqui - positivas, negativas e neutras.]
```

---

## **Exemplo Prático - ADR do seu Sistema de Booking**

### **ADR-001: Usar Saga Pattern para processos de reserva**

```markdown
# ADR-001: Usar Saga Pattern para processos de reserva com pagamento assíncrono

## Status
Aceito - 2025-12-14

## Contexto

O sistema de booking management precisa coordenar múltiplas operações que envolvem:
- Criação da reserva (Booking Service)
- Processamento de pagamento (Payment Service) 
- Atualização de inventário (Inventory Service)
- Envio de notificações (Notification Service)

### Forças e Restrições:

1. **Múltiplos bounded contexts**: Cada serviço tem seu próprio banco de dados (Database per Service pattern)
2. **Transações distribuídas**: Não podemos usar transações ACID tradicionais entre serviços
3. **Métodos de pagamento variados**: 
   - Cartão de crédito (resposta imediata ~2s)
   - Boleto bancário (confirmação em até 3 dias)
   - PIX (confirmação em minutos)
4. **Consistência eventual é aceitável**: Usuário entende que reserva fica \"pendente\" até confirmação de pagamento
5. **Necessidade de compensação**: Se pagamento falhar após N dias, precisamos cancelar a reserva

### Alternativas Consideradas:

#### Alternativa 1: Transação distribuída (2PC - Two-Phase Commit)
- **Prós**: Garantia ACID, consistência imediata
- **Contras**: 
  - Bloqueio de recursos por longos períodos (inviável para boleto de 3 dias)
  - Coordenador vira ponto único de falha
  - Baixa disponibilidade (se um serviço cair, toda transação falha)
  - Complexidade de implementação

#### Alternativa 2: Chamadas síncronas em cadeia sem orquestração
- **Prós**: Simples de implementar inicialmente
- **Contras**:
  - Timeout em pagamentos assíncronos (boleto)
  - Sem tratamento de falhas parciais
  - Difícil rastrear estado da operação
  - Acoplamento temporal entre serviços

#### Alternativa 3: Saga Pattern (Escolhida)
- **Prós**:
  - Suporta transações de longa duração (dias)
  - Permite compensação explícita
  - Serviços permanecem independentes
  - Facilita rastreamento via saga state
- **Contras**:
  - Complexidade de implementação inicial
  - Consistência eventual (não imediata)
  - Precisa de infraestrutura de mensageria

## Decisão

**Vamos adotar o Saga Pattern com Orchestration para o fluxo de criação de reservas.**

### Implementação:

1. **Padrão**: Saga Orchestration (coordenador centralizado)
   - Escolhemos orchestration ao invés de choreography pela complexidade do fluxo de negócio
   - Facilita visualização e debugging do processo completo

2. **Infraestrutura**:
   - RabbitMQ como message broker para comunicação assíncrona
   - PostgreSQL para persistir estado da saga (tabela `saga_state`)
   - Event Sourcing parcial: eventos da saga persistidos para auditoria

3. **Compensações definidas**:
   - Se pagamento falhar → Cancelar reserva
   - Se inventário indisponível → Reembolsar pagamento + Cancelar reserva
   - Se notificação falhar → Não compensa (retry assíncrono)

4. **Timeouts**:
   - Boleto: 3 dias úteis
   - PIX: 30 minutos
   - Cartão: 30 segundos

## Consequências

### Positivas ✅

- **Resiliência**: Sistema tolera falhas de serviços individuais
- **Flexibilidade**: Fácil adicionar novos métodos de pagamento
- **Rastreabilidade**: Estado da saga fornece visibilidade completa do processo
- **Escalabilidade**: Serviços podem escalar independentemente
- **Auditoria**: Histórico completo de eventos para compliance

### Negativas ⚠️

- **Complexidade inicial**: Requer setup de message broker e lógica de saga
- **Consistência eventual**: UI precisa refletir estados intermediários (\"Aguardando pagamento\")
- **Debugging**: Mais difícil debugar fluxos assíncronos vs síncronos
- **Infraestrutura adicional**: RabbitMQ adiciona dependência operacional
- **Curva de aprendizado**: Time precisa entender padrões assíncronos

### Neutras 🔵

- **Testes**: Requer estratégia de testes para fluxos assíncronos (test containers para RabbitMQ)
- **Monitoramento**: Necessário implementar tracking de sagas no Grafana
- **Compensações**: Precisam ser idempotentes e testadas separadamente

### Riscos Identificados:

1. **Message broker como ponto crítico**: Mitigação → configurar RabbitMQ em cluster
2. **Mensagens duplicadas**: Mitigação → handlers idempotentes + deduplicação
3. **Deadlocks em compensação**: Mitigação → ordem reversa garantida + timeout

## Referências

- [Pattern: Saga](https://microservices.io/patterns/data/saga.html)
- [Orchestration vs Choreography](https://stackoverflow.com/questions/4127241)
- NestJS CQRS documentation
- Livro: \"Microservices Patterns\" - Chris Richardson (Cap 4)

## Revisões

- 2025-12-14: Criação inicial
```

---

## **Boas Práticas e Padrões da Comunidade**

### **1. Numeração**
```
docs/adr/
├── 0001-use-saga-pattern.md
├── 0002-choose-rabbitmq-over-kafka.md
├── 0003-implement-event-sourcing.md
├── 0004-logging-strategy-with-loki.md
└── README.md  (índice dos ADRs)
```

**Formato**: `NNNN-titulo-kebab-case.md` (4 dígitos zerofilled)

### **2. Quando criar um ADR?**

✅ **SIM - Crie ADR para**:
- Escolha de tecnologias principais (DB, message broker, framework)
- Padrões arquiteturais (microserviços, monolito, saga, CQRS)
- Estratégias de deployment
- Estrutura de pastas e organização de código
- Políticas de segurança e autenticação
- Estratégias de logging/monitoring
- Padrões de API (REST, GraphQL, gRPC)

❌ **NÃO - Não crie ADR para**:
- Detalhes de implementação triviais
- Escolhas óbvias sem alternativas
- Decisões táticas de código
- Features de produto (use product docs)

### **3. Seções opcionais úteis**

Além do template básico, você pode adicionar:

```markdown
## Alternativas Consideradas
[Lista todas as opções avaliadas]

## Prós e Contras
| Alternativa | Prós | Contras |
|-------------|------|---------|
| Saga        | ... | ...     |
| 2PC         | ... | ...     |

## Referências
[Links, artigos, livros, discussões]

## Notas
[Informações adicionais, contexto histórico]

## Revisões
[Log de mudanças no ADR]
- 2025-01-15: Atualizado após experimento com Kafka
```

### **4. Status Lifecycle**

```
Proposto → Aceito → [Depreciado] → Substituído por ADR-XXX
              ↓
          Rejeitado
```

- **Proposto**: Sob discussão
- **Aceito**: Decisão tomada, em implementação/produção
- **Depreciado**: Ainda em uso, mas planejando migrar
- **Substituído**: Veja o novo ADR
- **Rejeitado**: Não vamos fazer (útil para registrar o que NÃO fazer)

### **5. Linguagem**

✅ **Faça**:
- Voz ativa: \"Vamos usar\", \"Decidimos adotar\"
- Seja objetivo e factual
- Liste consequências honestas (positivas E negativas)
- Contexto primeiro, decisão depois
- Escreva para quem não estava na discussão

❌ **Evite**:
- \"Eu acho que...\", \"Talvez...\"
- Marketing speak: \"solução revolucionária\"
- Omitir consequências negativas
- Jargão sem explicação
- Detalhes de implementação (guarde para docs técnicos)

---

## **Ferramentas e Automação**

### **CLI para criar ADRs** (opcional, mas útil)

```bash
# Instala ferramenta ADR
npm install -g adr-tools

# Cria novo ADR
adr new \"Use Saga Pattern for booking process\"
# Gera: docs/adr/0001-use-saga-pattern-for-booking-process.md

# Lista ADRs
adr list

# Marca ADR como substituído
adr new -s 9 \"Use Temporal for saga orchestration\"
# Marca ADR-0009 como substituído e cria ADR-0010
```

### **Template personalizado**

```bash
# .adr-templates/template.md
# ADR-{number}: {title}

## Status
Proposto

## Contexto
<!-- Descreva o problema -->

## Decisão
<!-- Nossa solução -->

## Consequências
<!-- Positivas, negativas, neutras -->
```

---

## **Exemplo de Índice (README.md)**

```markdown
# Architecture Decision Records

Este diretório contém todos os ADRs do projeto.

## Índice

| ADR | Título | Status | Data |
|-----|--------|--------|------|
| [0001](0001-use-saga-pattern.md) | Usar Saga Pattern para reservas | Aceito | 2025-12-14 |
| [0002](0002-choose-rabbitmq.md) | RabbitMQ como message broker | Aceito | 2025-12-14 |
| [0003](0003-logging-strategy.md) | Estratégia de logging com Loki | Aceito | 2025-12-14 |
| [0004](0004-hexagonal-architecture.md) | Arquitetura Hexagonal | Aceito | 2025-12-15 |

## Processo

1. Crie um novo ADR para decisões arquiteturais significativas
2. Use o template padrão (veja `template.md`)
3. Submeta para revisão via PR
4. Atualize este índice quando aceito
```

---

## **Anti-padrões (evite)**

❌ **ADR muito curto** (suas \"3 linhas xexelentas\"):
```markdown
# ADR-001: Usar MongoDB

Decidimos usar MongoDB porque é NoSQL.

Consequências: mais rápido.
```
*Problema*: Sem contexto, sem alternativas, sem consequências reais.

❌ **ADR muito longo** (tratado acadêmico):
```markdown
# ADR-001: ... (20 páginas de teoria de bancos de dados)
```
*Problema*: Ninguém vai ler.

✅ **ADR ideal**: 1-3 páginas, foco nas **forças** que levaram à decisão.

---

## **Regra de Ouro**

> **Escreva o ADR pensando em você mesmo daqui 1 ano, quando você não se lembrar de NADA sobre por que tomou essa decisão.**

Perguntas que o ADR deve responder:
1. Qual era o problema?
2. Que opções consideramos?
3. Por que escolhemos X em vez de Y?
4. Quais trade-offs aceitamos?
5. Onde isso pode dar errado?

---

## **Estrutura sugerida para seu projeto**

```
booking-management-system/
├── docs/
│   ├── adr/
│   │   ├── README.md
│   │   ├── 0001-use-saga-pattern.md
│   │   ├── 0002-rabbitmq-vs-kafka.md
│   │   ├── 0003-hexagonal-architecture.md
│   │   ├── 0004-logging-strategy.md
│   │   ├── 0005-event-sourcing-for-bookings.md
│   │   └── template.md
│   ├── architecture/
│   │   └── system-design.md
│   └── api/
│       └── openapi.yaml
```

---

## **Quando escrever o ADR?**

- **ANTES** de implementar (idealmente)
- Durante discussão arquitetural
- Depois de experimento/spike (registra aprendizados)
- Quando revisitar decisão antiga (atualiza ou cria novo)

---

## **Resumindo**

✅ **Use o template de Michael Nygard** (padrão da comunidade)  
✅ **Seções obrigatórias**: Status, Contexto, Decisão, Consequências  
✅ **Liste alternativas** consideradas (mostra que você pensou)  
✅ **Seja honesto** sobre consequências negativas  
✅ **Mantenha focado**: 1-3 páginas  
✅ **Numere sequencialmente**: 0001, 0002, ...  
✅ **Escreva em markdown** (fácil de versionar no Git)  

**Ferramentas**:
- CLI: `adr-tools` (opcional)
- Versionamento: Git (commit os ADRs)
- Review: Pull Request (ADR é código também!)