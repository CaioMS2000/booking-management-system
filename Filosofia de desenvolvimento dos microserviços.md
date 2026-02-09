## MS1 - Reservas & Disponibilidade: **SIM, DDD faz sentido**

Este é o **core domain** do sistema. Aqui vivem as regras de negócio reais e não-triviais:

- **Invariantes a proteger**: não pode haver double-booking (verificação de conflito de período)
- **Transições de estado com regras**: PENDENTE → CONFIRMADA → CANCELADA, cada uma com pré-condições (ex: cancelamento só até 24h antes)
- **Value Objects naturais**: `PeriodoReserva` (data início + fim + validação), `StatusReserva` (máquina de estados)
- **Aggregate real**: `Reserva` que coordena a consistência entre espaço, período e status
- **Domain Events com significado de negócio**: `ReservaCriada`, `ReservaConfirmada`, `ReservaCancelada`

Aqui DDD não é cerimônia - é a ferramenta certa para modelar complexidade que **já existe** no domínio.

---

## MS2 - Pagamentos: **NÃO, uma Clean Architecture simples basta**

O MS2 é essencialmente um **wrapper de integração** com Stripe/gateway de pagamento. A \"lógica de domínio\" se resume a:
- Criar cobrança → chamar API do Stripe
- Receber webhook → atualizar status
- Garantir idempotência

Isso é um **transaction script** glorificado. Usar Entities, Aggregates e VOs aqui seria adicionar camadas de abstração sobre algo que já é bem definido pela API do provedor de pagamento. Um Service Layer com boas interfaces basta.

---

## MS3 - Notificações: **NÃO, absolutamente não**

É quase pura infraestrutura: recebe um evento, escolhe template, dispara por canal (email/SMS/push). Não tem regra de negócio significativa. Uma arquitetura simples com um service que roteia para providers é suficiente. DDD aqui seria overengineering textbook.

---

## MS4 - Auth & Usuários: **NÃO**

Autenticação é um domínio **bem entendido e padronizado**: hash de senha, JWT, refresh token, OAuth. É CRUD + preocupações técnicas. Não há complexidade de domínio que justifique Aggregates ou VOs elaborados. Um bom Service Layer com separation of concerns resolve.

---

## Resumo da recomendação

| MS | DDD? | Abordagem | Justificativa |
|---|---|---|---|
| MS1 Reservas | **Sim** | DDD tático (Entities, VOs, Aggregates, Domain Events, Repository interfaces) | Core domain, regras complexas, invariantes reais |
| MS2 Pagamentos | Não | Clean Architecture / Service Layer | Integração com provedor externo, pouca lógica de domínio própria |
| MS3 Notificações | Não | Arquitetura simples | Quase pura infraestrutura, zero lógica de negócio |
| MS4 Auth | Não | Service Layer | Domínio padronizado, CRUD + concerns técnicos |

---

Isso, aliás, é exatamente o que o Eric Evans defende: **DDD é para o core domain, não para tudo**. Aplicar DDD uniformemente em todo lugar é um anti-pattern tão grave quanto não usar em lugar nenhum - dilui o valor e transforma DDD em burocracia sem benefício.