# ADR-0004: Utilizar controle de concorrência com verificação de sobreposição transacional para evitar double booking

## Status
Aceito  
Data: 2026-02-13

## Contexto

O sistema deve impedir que dois usuários reservem o mesmo imóvel para datas que se sobreponham.

O ambiente pode evoluir para múltiplas instâncias e alta concorrência.

Forças arquiteturais envolvidas:

- Consistência forte na confirmação de reserva
- Prevenção de double booking
- Escalabilidade
- Simplicidade operacional
- Custo de coordenação distribuída

## Alternativas Consideradas

### Alternativa A — Lock pessimista prolongado

- Bloqueio explícito do recurso durante o processo completo

**Vantagens**
- Simplicidade conceitual
- Garantia forte de exclusão

**Desvantagens**
- Baixa escalabilidade
- Risco de bloqueios longos
- Redução de throughput

---

### Alternativa B — Verificação transacional de sobreposição com controle otimista (Escolhida)

- No momento da criação do HOLD ou RESERVA:
  - Verificar se existe intervalo conflitante
  - Criar registro apenas se não houver sobreposição
  - Operação protegida por transação

**Vantagens**
- Melhor escalabilidade
- Menor tempo de bloqueio
- Compatível com sistema distribuído

**Desvantagens**
- Pode exigir retry em caso de conflito
- Implementação exige cuidado com isolamento de transação

## Decisão

Decidimos utilizar verificação transacional de sobreposição de intervalos com controle otimista para criação de HOLD e RESERVA.

A confirmação de reserva exige consistência forte.

## Consequências

### Positivas
- Prevenção efetiva de double booking
- Boa escalabilidade
- Modelo compatível com múltiplas instâncias

### Negativas
- Necessidade de tratamento de retries
- Dependência de configuração adequada de isolamento de transação

### Riscos
- Configuração incorreta de isolamento pode permitir conflitos
- Implementação incorreta de verificação de overlap pode gerar inconsistências
