# ADR-0002: Armazenar apenas intervalos de estados especiais (RESERVED, HOLD, BLOCKED)

## Status
Aceito  
Data: 2026-02-13

## Contexto

Após decidir pelo modelo intervalar, surge a questão:

Devemos armazenar explicitamente intervalos de AVAILABLE ou apenas os intervalos que representam ocupação ou bloqueio?

O sistema operará com uma janela máxima de reserva limitada (até 12 meses à frente).

Forças arquiteturais envolvidas:

- Redução de volume de dados
- Simplicidade do modelo
- Performance de consulta
- Complexidade de manutenção
- Facilidade de expiração de HOLD

## Alternativas Consideradas

### Alternativa A — Armazenar AVAILABLE explicitamente

**Vantagens**
- Consulta direta de disponibilidade
- Calendário mais explícito no banco

**Desvantagens**
- Necessidade de fragmentar intervalos a cada reserva
- Atualizações frequentes
- Aumento de complexidade e volume de registros

---

### Alternativa B — Armazenar apenas RESERVED, HOLD e BLOCKED (Escolhida)

- Disponibilidade é inferida como gaps entre intervalos ocupados dentro da janela válida

**Vantagens**
- Modelo mais simples
- Menos registros persistidos
- HOLD pode ser removido sem reconstruir disponibilidade
- Redução de escrita no banco

**Desvantagens**
- Necessidade de reconstrução de gaps na consulta
- Lógica adicional na camada de aplicação

## Decisão

Decidimos armazenar apenas intervalos com estados especiais (RESERVED, HOLD, BLOCKED).  
Disponibilidade será inferida dinamicamente como lacunas entre esses intervalos dentro da janela válida.

## Consequências

### Positivas
- Menor volume de dados
- Modelo mais limpo e enxuto
- Simplificação de expiração de HOLD
- Menor complexidade de atualização

### Negativas
- Consulta de disponibilidade exige processamento adicional
- Maior responsabilidade da camada de aplicação

### Riscos
- Implementação incorreta de reconstrução de gaps pode gerar inconsistências
