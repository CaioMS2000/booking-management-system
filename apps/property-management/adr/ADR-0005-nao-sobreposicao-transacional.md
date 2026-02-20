# ADR-0005: Garantia Estrutural de Não Sobreposição e Estratégia de Consistência Transacional

## Status
Aceito  
Data: 2026-02-13

## Contexto

O sistema de disponibilidade precisa garantir que nunca ocorram reservas sobrepostas para o mesmo imóvel, mesmo sob alta concorrência.

As decisões anteriores definiram:

- Modelagem intervalar de disponibilidade
- Persistência apenas de estados especiais (RESERVED, BLOCKED, HOLD)
- Uso de índice eficiente para verificação de sobreposição
- HOLD híbrido (Redis + persistência no banco)
- Janela deslizante de 12 meses

Ainda era necessário formalizar:

- Onde está a garantia estrutural contra double booking
- Qual nível de isolamento transacional será utilizado
- Como HOLD expirado deve ser tratado sem comprometer integridade

Forças arquiteturais envolvidas:

- Integridade forte de dados
- Previsibilidade sob concorrência
- Separação clara de responsabilidades
- Simplicidade operacional
- Escalabilidade

## Alternativas Consideradas

### Alternativa A — Garantia apenas via lógica de aplicação

Verificar conflitos antes de inserir, sem constraint estrutural no banco.

**Vantagens**
- Simplicidade inicial
- Menos dependência de recursos específicos do banco

**Desvantagens**
- Vulnerável a race conditions
- Exige isolamento transacional mais forte (ex: SERIALIZABLE)
- Maior risco de inconsistência sob alta concorrência

---

### Alternativa B — Uso de SERIALIZABLE sem constraint estrutural

Delegar consistência ao nível máximo de isolamento transacional.

**Vantagens**
- Forte garantia teórica de consistência

**Desvantagens**
- Maior custo de performance
- Maior incidência de abortos e necessidade de retry
- Complexidade operacional superior

---

### Alternativa C — Constraint estrutural + READ COMMITTED (Escolhida)

Utilizar constraint de exclusão para impedir sobreposição estrutural e manter nível de isolamento READ COMMITTED.

Separar:

- Integridade estrutural (responsabilidade do banco)
- Regra temporal de expiração (responsabilidade da aplicação)

**Vantagens**
- Garantia estrutural contra sobreposição
- Boa performance
- Simplicidade de implementação
- Comportamento previsível
- Escalabilidade adequada

**Desvantagens**
- Necessidade de tratar explicitamente erro de constraint
- Aplicação deve remover ou invalidar HOLD expirado antes de inserir novo intervalo

## Decisão

Adotamos a seguinte estratégia:

1. Utilizar constraint estrutural de exclusão para impedir qualquer sobreposição de intervalos para o mesmo imóvel.
2. Manter o nível de isolamento transacional em READ COMMITTED.
3. Tratar expiração de HOLD na camada de aplicação antes de inserir novo HOLD ou RESERVA.
4. Manter job periódico de limpeza para remover HOLD expirado como mecanismo complementar.

A constraint não dependerá de funções temporais (ex: now()), mantendo comportamento determinístico.

## Consequências

### Positivas

- Garantia forte contra double booking
- Separação clara de responsabilidades entre banco e aplicação
- Boa performance sob concorrência
- Arquitetura evolutiva
- Redução de complexidade transacional

### Negativas

- Necessidade de capturar e tratar erro de violação de constraint
- Fluxo transacional exige etapa explícita de invalidação de HOLD expirado

### Riscos

- Se a aplicação falhar em remover HOLD expirado antes da inserção, pode ocorrer bloqueio desnecessário até execução do cleanup job.
- Erros de constraint devem ser corretamente mapeados para resposta de conflito ao usuário.
