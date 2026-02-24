# Pendencias de infraestrutura

Itens dos ADRs que dependem da camada de persistencia e nao foram implementados na camada de dominio/aplicacao.

## ADR-0004: Verificacao transacional de sobreposicao

**O que foi feito (dominio/aplicacao):**
- `Listing.isAvailableFor()` verifica sobreposicao antes de criar HOLD ou RESERVA
- `PropertyModule.placeHold()` executa check-then-insert conforme descrito na ADR

**O que falta (infra):**
- Proteger a operacao check-then-insert dentro de uma transacao no repositorio concreto
- Tratar retries em caso de conflito transacional

## ADR-0005: Constraint estrutural + READ COMMITTED

**O que foi feito (dominio/aplicacao):**
- `Listing.cleanupExpiredHolds()` remove HOLDs expirados antes de inserir novo intervalo
- `PropertyModule.placeHold()` chama cleanup antes de operar, conforme item 3 da decisao

**O que falta (infra):**
- Criar exclusion constraint no banco para impedir sobreposicao de intervalos no mesmo listing (item 1 da decisao)
- Configurar isolamento transacional como READ COMMITTED (item 2 da decisao)
- Mapear erro de violacao de constraint para resposta de conflito ao usuario
- Implementar job periodico de limpeza de HOLDs expirados (item 4 da decisao)
