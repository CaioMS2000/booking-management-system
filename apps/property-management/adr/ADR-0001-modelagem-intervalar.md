# ADR-0001: Modelar disponibilidade como intervalos em vez de dias individuais

## Status
Aceito  
Data: 2026-02-13

## Contexto

O sistema de booking precisa gerenciar disponibilidade de imóveis com suporte a:

- Alto volume de imóveis
- Reservas concorrentes
- Busca por intervalos de datas
- Escalabilidade horizontal futura

Existem duas abordagens principais para modelar disponibilidade:

1. Uma linha por imóvel por dia (modelo diário)
2. Armazenamento por intervalos de datas (modelo intervalar)

Forças arquiteturais envolvidas:

- Escalabilidade de dados
- Volume de registros
- Performance de consulta por intervalo
- Custo de armazenamento
- Complexidade de atualização
- Facilidade de evitar double booking

## Alternativas Consideradas

### Alternativa A — Modelo diário (1 registro por dia)

- Um registro por imóvel por dia com status (AVAILABLE, RESERVED, etc.)

**Vantagens**
- Modelo simples de entender
- Consulta direta por data específica
- Fácil visualização do calendário

**Desvantagens**
- Crescimento linear (365 registros por ano por imóvel)
- Alto volume em escala real
- Atualizações múltiplas por reserva
- Maior custo de armazenamento e indexação

---

### Alternativa B — Modelo por intervalos (Escolhida)

- Armazenamento de intervalos com start_date e end_date
- Consulta por sobreposição (overlap)

**Vantagens**
- Muito menos registros
- Melhor performance para buscas por intervalo
- Modelo mais alinhado ao domínio de reservas
- Escala melhor para milhões de imóveis

**Desvantagens**
- Lógica adicional para detectar interseções
- Reconstrução de gaps para exibição de calendário

## Decisão

Decidimos modelar disponibilidade usando intervalos de datas e lógica de detecção de sobreposição.

Essa abordagem reduz drasticamente o volume de dados e melhora a escalabilidade sem comprometer consistência.

## Consequências

### Positivas
- Redução significativa do número de registros
- Melhor performance em buscas por intervalo
- Modelo mais próximo do domínio de reservas
- Escalabilidade mais previsível

### Negativas
- Complexidade maior na lógica de consulta
- Necessidade de tratamento cuidadoso de sobreposição

### Riscos
- Implementação incorreta de verificação de overlap pode permitir double booking
- Complexidade maior para desenvolvedores menos experientes
