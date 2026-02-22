# Arquitetura do Núcleo de Disponibilidade

Este documento descreve as decisões arquiteturais do sistema de disponibilidade de imóveis, avalia sua robustez e discute caminhos de evolução futura, incluindo CQRS.

---

## Decisões Arquiteturais

O núcleo de disponibilidade foi construído sobre cinco decisões fundamentais:

1. **Modelo intervalar de disponibilidade** -- a disponibilidade é representada por intervalos de datas (`daterange`), não por registros diários individuais.
2. **Persistência apenas de estados especiais** -- apenas estados que alteram a disponibilidade padrão são persistidos (HOLD, RESERVA, BLOCK). O estado AVAILABLE é inferido pela ausência de registros.
3. **Janela deslizante de 12 meses** -- o horizonte ativo de disponibilidade é limitado a 12 meses à frente.
4. **HOLD híbrido (Redis + banco)** -- o HOLD utiliza Redis para controle de tempo (TTL) e banco relacional para garantia de integridade.
5. **Constraint estrutural + READ COMMITTED + expiração controlada** -- a integridade é garantida por exclusion constraint no banco, nível de isolamento READ COMMITTED e expiração lógica gerenciada pela aplicação.

---

## Avaliação Arquitetural

### Coerência estrutural

Todas as decisões se complementam sem contradições:

- Intervalos reduzem volume de dados.
- Persistir apenas estados especiais simplifica a lógica.
- A constraint estrutural garante integridade no nível do banco.
- READ COMMITTED é adequado dado o uso de constraint.
- O HOLD híbrido melhora a UX sem comprometer consistência.
- A expiração separada da constraint mantém o design limpo.

### Consistência sob concorrência

Este é o ponto mais crítico em sistemas de booking. Os seguintes cenários são tratados corretamente:

- Race condition entre requisições simultâneas
- Double booking
- Conflito entre HOLD e RESERVA
- Conflito entre dois HOLDs

A **integridade está no banco** (constraint de exclusão). A **regra temporal está na aplicação** (expiração de HOLD). Essa separação de responsabilidades é correta.

### Escalabilidade

O modelo intervalar garante que o crescimento é proporcional ao número de reservas, não ao número de dias ou imóveis. Índice GiST escala bem para queries de sobreposição. A janela de 12 meses limita o horizonte ativo. Não há gargalo estrutural óbvio.

### Complexidade

O sistema evita fontes comuns de complexidade acidental:

- Modelo diário (uma linha por dia por imóvel)
- Lock pessimista
- SERIALIZABLE desnecessário
- Constraint dependente de tempo
- Estado AVAILABLE persistido
- Overengineering prematuro

O resultado é um sistema sofisticado sem ser frágil.

---

## Pontos de Atenção na Execução

O risco do sistema não está na arquitetura, está na execução. Três pontos exigem disciplina:

### Tratamento de erro de constraint

Violações da exclusion constraint devem ser mapeadas para respostas claras de conflito de disponibilidade. Não podem se transformar em erro 500 genérico.

### Retry idempotente

Quando uma operação falhar por conflito, o sistema deve responder claramente com "intervalo indisponível". Não deve haver tentativa silenciosa de retry infinito.

### Job de cleanup

Mesmo com expiração lógica protegendo a integridade, um job de cleanup deve existir para manter a tabela enxuta e evitar acúmulo de HOLDs expirados.

---

## Evolução Futura

### Caminhos possíveis

A arquitetura atual não bloqueia nenhuma dessas evoluções:

- Serviço separado de disponibilidade
- CQRS (Command Query Responsibility Segregation)
- Cache de leitura
- Particionamento por data
- Sharding por imóvel

### Decisões ainda não formalizadas

Algumas decisões não foram tomadas ainda, e não precisam ser por enquanto:

- Estratégia de particionamento
- Estratégia de auditoria histórica
- Estratégia de eventos (event sourcing ou não)

---

## CQRS no Contexto Deste Sistema

### O que é CQRS

CQRS (Command Query Responsibility Segregation) significa separar o modelo de escrita do modelo de leitura. A premissa é que o modelo ideal para escrever não é necessariamente o melhor modelo para ler.

- **Command side (escrita):** cria HOLD, confirma RESERVA, cria BLOCK.
- **Query side (leitura):** responde "está disponível?", "calendário do mês", "próximas reservas".

### O que é "modelo" nesse contexto

"Modelo" se refere à **estrutura de dados** usada para uma finalidade. No sistema atual, a mesma tabela de intervalos serve tanto para garantir integridade (escrita) quanto para responder perguntas (leitura):

```
booking_intervals
(property_id, start_date, end_date, status, expires_at)
```

Essa tabela é usada para inserir reservas, checar conflitos, verificar disponibilidade e mostrar calendários. É **um único modelo servindo dois propósitos diferentes** -- o que é o padrão tradicional e é perfeitamente correto.

### Como CQRS se aplicaria

Em um cenário CQRS, haveria dois modelos separados:

**Write model** -- continuaria com intervalos, constraint de exclusão, READ COMMITTED e controle forte de integridade. Esse lado não muda muito.

**Read model** -- seria uma representação otimizada para leitura. Exemplos:

```
availability_projection
(property_id, date, available boolean)
```

Ou:

```
property_availability_snapshot
(property_id, month, bitmap)
```

Essa projeção seria atualizada por eventos como `ReservationCreated`, `ReservationCancelled` e `HoldExpired`.

### O que são projeções

Uma projeção é uma **representação derivada do estado principal**. Ela existe para facilitar a leitura, não para garantir integridade.

Exemplo: o modelo principal (source of truth) é `booking_intervals`. A projeção derivada seria `availability_daily_snapshot`. Ela pode ser gerada após cada reserva, atualizada por evento, ou recalculada periodicamente.

**Projeção síncrona:** a projeção é atualizada na mesma transação da escrita. Oferece consistência forte, mas é mais acoplada.

**Projeção assíncrona:** a escrita publica um evento e outro processo atualiza a projeção depois. Oferece consistência eventual, é mais escalável, mas também mais complexa.

### Separação física e read store

Separação física significa que o banco de escrita é diferente do banco de leitura (ou até o serviço é diferente). Exemplos:

- Write DB em PostgreSQL principal, Read DB em réplica somente leitura
- Serviço A para comandos, Serviço B para consultas

Um "read store separado" pode ser um banco diferente, uma tabela diferente, uma estrutura diferente, ou um cache dedicado. CQRS **não exige bancos diferentes** -- exige separação de responsabilidades.

### Por que o sistema atual não usa CQRS (e por que isso é correto)

O sistema atual não usa CQRS porque:

- Leitura e escrita usam o mesmo modelo
- Não há projeções assíncronas
- Não há separação física
- Não há read store separado

Isso é arquitetura tradicional bem feita. CQRS não é obrigatório, não é padrão superior e não é sinal de maturidade automaticamente. Ele só faz sentido quando:

- Leitura e escrita têm características muito diferentes
- O volume de leitura é desproporcional ao de escrita
- Queries complexas começam a pesar no modelo transacional

Cenários concretos que justificariam CQRS:

- Milhões de consultas por segundo ao calendário
- Pesquisa global por datas disponíveis em milhares de imóveis
- Necessidade de rankear imóveis por disponibilidade futura

Antes disso, aplicar CQRS introduz projeções, eventos, duplicação de dados, consistência eventual e dificuldade de debugging -- tudo sem necessidade real.

### O que importa

O sistema atual não usa CQRS, mas também **não bloqueia essa evolução**. As decisões arquiteturais tomadas permitem migrar para CQRS quando (e se) houver necessidade real. Essa é a postura correta: começar com integridade forte, modelo consistente e escalabilidade natural, e evoluir apenas quando houver motivação concreta.
