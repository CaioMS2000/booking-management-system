# Architecture Decision Records (ADR) - Guideline

## 🎯 Objetivo

Um **Architecture Decision Record (ADR)** registra uma decisão arquitetural relevante, incluindo:

- O problema
- As forças que pressionam a decisão
- As alternativas consideradas
- A decisão tomada
- Os trade-offs aceitos

ADR **não é documentação de implementação**.  
É um registro de decisão e seus impactos.

---

# 📌 Quando Criar um ADR

Crie ADR para decisões que:

- Afetam múltiplos módulos ou serviços
- Impactam escalabilidade, consistência, disponibilidade ou segurança
- Introduzem nova dependência externa relevante
- Definem padrão arquitetural
- Mudam a direção técnica do sistema
- Têm alto custo de reversão

Não crie ADR para:

- Detalhes internos de classes
- Refatorações pequenas
- Decisões triviais
- Features de produto
- Ajustes puramente táticos

---

# 📄 Template Oficial (Obrigatório)

```markdown
# ADR-XXX: Título Curto e Objetivo

## Status
Proposto | Aceito | Depreciado | Substituído por ADR-YYY | Rejeitado  
Data: YYYY-MM-DD

## Contexto

Descreva:

- O problema real
- As restrições existentes
- As forças arquiteturais envolvidas
  (ex: escalabilidade, latência, consistência, custo, simplicidade, compliance, time-to-market, etc.)

Não mencione solução aqui.

## Alternativas Consideradas

### Alternativa A
- Descrição
- Vantagens
- Desvantagens

### Alternativa B
...

## Decisão

Decidimos adotar <X>.

Justificativa objetiva comparando com as alternativas.

## Consequências

### Positivas
- ...

### Negativas
- ...

### Riscos
- ...
```

📏 Regras de Granularidade
==========================

Uma ADR deve capturar **uma única decisão arquitetural coerente**.

Se houver múltiplas decisões independentes, crie ADRs separadas.

Exemplo incorreto:

*   Escolher Saga
*   Escolher RabbitMQ
*   Escolher PostgreSQL

Isso deve ser dividido em 3 ADRs.

Misturar decisões:

*   Dificulta substituição futura
*   Confunde escopo
*   Aumenta acoplamento documental

* * *

🧠 Forças Arquiteturais (Obrigatório Explicitar)
================================================

Toda ADR deve deixar claro quais forças estão pressionando a decisão.

Exemplos:

*   Consistência forte vs eventual
*   Escalabilidade horizontal
*   Alta disponibilidade
*   Baixa latência
*   Simplicidade operacional
*   Custo de infraestrutura
*   Complexidade cognitiva do time
*   Velocidade de entrega

Sem forças claras, a decisão não está bem fundamentada.

* * *

🔄 Ciclo de Vida
================

Status possíveis:

*   Proposto
*   Aceito
*   Rejeitado
*   Depreciado
*   Substituído

Regras:

*   ADRs críticas devem ser revisadas periodicamente (ex: a cada 12 meses).
*   Se a realidade mudar, crie uma nova ADR substituindo a anterior.
*   Não edite decisões históricas para reescrever o passado.

* * *

📦 Organização
==============

Estrutura sugerida:

```
docs/adr/
├── 0001-titulo-da-decisao.md
├── 0002-outra-decisao.md
├── 0003-outra.md
└── README.md
```

Formato do nome do arquivo:

```
NNNN-titulo-kebab-case.md
```

Exemplo:

```
0001-use-saga-pattern.md
```

* * *

⚠️ Anti-padrões (Evitar)
========================

*   ADR como marketing interno
*   ADR sem alternativas consideradas
*   ADR sem consequências negativas
*   ADR que vira especificação de implementação
*   ADR excessivamente longa (tratado técnico)
*   ADR com múltiplas decisões misturadas

* * *

📐 Tamanho Ideal
================

*   1 a 3 páginas
*   Foco em decisão e trade-offs
*   Objetiva e direta

Se estiver muito longa, provavelmente virou design document.

* * *

🧩 Separação Clara: ADR vs Design Document
==========================================

| ADR | Design Doc |
| --- | --- |
| Por que decidimos | Como vamos implementar |
| Alternativas e trade-offs | Diagramas, fluxos e detalhes técnicos |
| Estratégico | Tático |

ADR responde:

> Por que escolhemos isso?

Design document responde:

> Como vamos fazer?

* * *

📎 Regra de Ouro
================

Escreva pensando em você daqui a 1 ano, sem lembrar do contexto.

Se ao reler você não entender:

*   Qual era o problema
*   Quais eram as forças envolvidas
*   Por que X venceu Y
*   Quais trade-offs foram aceitos

Então o ADR falhou.