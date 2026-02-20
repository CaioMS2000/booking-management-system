# ADR-0003: Limitar reservas a no máximo 12 meses à frente (janela deslizante)

## Status
Aceito  
Data: 2026-02-13

## Contexto

O sistema de booking precisa definir até que ponto no futuro reservas podem ser criadas.

A arquitetura já suporta:

- Modelagem intervalar de disponibilidade
- Armazenamento apenas de estados especiais (RESERVED, HOLD, BLOCKED)
- Índices eficientes para verificação de sobreposição
- Controle transacional para evitar double booking

Portanto, não há limitação técnica que exija restrição temporal.

A definição da janela de reserva passa a ser uma decisão de simplicidade operacional e previsibilidade de crescimento.

Forças arquiteturais envolvidas:

- Controle do crescimento temporal de dados
- Previsibilidade de consultas e índices
- Simplicidade de regras de negócio
- Redução de complexidade futura
- Experiência do usuário

## Alternativas Consideradas

### Alternativa A — Sem limite máximo de antecedência

Permitir reservas para qualquer data futura.

**Vantagens**
- Máxima flexibilidade
- Nenhuma restrição artificial

**Desvantagens**
- Crescimento indefinido do horizonte temporal
- Maior complexidade futura para particionamento ou arquivamento
- Pode permitir reservas irreais ou especulativas

---

### Alternativa B — Limite fixo por ano calendário

Permitir reservas apenas dentro do ano atual.

**Vantagens**
- Regra simples de comunicar
- Controle temporal claro

**Desvantagens**
- Experiência inconsistente na virada do ano
- Bloqueia reservas legítimas logo após o fim do ano
- Desalinhado com planejamento real de usuários

---

### Alternativa C — Janela deslizante de até 12 meses (Escolhida)

Permitir reservas para datas até 12 meses a partir da data atual.

**Vantagens**
- Experiência consistente ao longo do tempo
- Horizonte temporal sempre limitado
- Controle previsível de crescimento de dados
- Simplicidade de implementação

**Desvantagens**
- Restrição arbitrária de antecedência
- Pode limitar cenários específicos de planejamento de longo prazo

## Decisão

Decidimos limitar reservas a uma janela deslizante de até 12 meses a partir da data atual.

A arquitetura permanece capaz de suportar janelas maiores no futuro, caso necessário. A restrição é uma escolha deliberada de simplicidade e controle, não uma limitação estrutural do sistema.

## Consequências

### Positivas
- Controle previsível do horizonte de dados
- Simplificação de regras de negócio
- Redução de risco de crescimento temporal descontrolado
- Facilidade de comunicação da regra para usuários

### Negativas
- Restrições para reservas de longo prazo
- Necessidade de validação dinâmica da data no momento da criação da reserva

### Riscos
- Caso o produto exija maior antecedência no futuro, será necessário revisar a política e possivelmente ajustar regras de validação
