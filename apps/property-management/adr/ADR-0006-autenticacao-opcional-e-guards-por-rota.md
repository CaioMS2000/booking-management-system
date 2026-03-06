# ADR-0006: Autenticacao Opcional e Guards por Rota

## Status
Aceito
Data: 2026-03-06

## Contexto

O sistema precisa suportar tanto rotas publicas (ex: listar listings) quanto rotas protegidas (ex: criar property). Anteriormente, o `contextPlugin` rejeitava qualquer request sem JWT, exceto rotas numa allowlist hardcoded (`PUBLIC_PREFIXES`). Esse padrao fazia o plugin global decidir quais rotas sao publicas, o que e fragil e escala mal.

Alem disso, existem tres niveis de acesso distintos:

- **Anonimo**: usuario sem token, pode navegar e consultar dados publicos
- **Autenticado**: usuario com token valido, pode executar acoes que exigem login
- **Autorizado por role**: usuario autenticado com role especifica (HOST, GUEST, ADMIN)

## Decisao

### 1. O contexto sempre e populado

O `contextPlugin` nunca rejeita requests por falta de token. Ele sempre popula o `ApplicationContext`:
- Com token valido: `user = AuthenticatedUser`
- Sem token: `user = null`
- Com token invalido/malformado: lanca 401 (token presente mas invalido e um erro)

### 2. Protecao e responsabilidade de cada rota

A autenticacao e autorizacao sao aplicadas **por rota** via hooks `onRequest`, nao globalmente:

- `authGuard` — exige `user !== null` (login obrigatorio, qualquer role)
- `roleGuard('HOST')` — exige autenticacao + role especifica (verifica null implicitamente)
- Sem guard — rota publica

### 3. Narrowing type-safe do usuario

Como `user` e nullable no contexto, uma funcao utilitaria `getAuthenticatedUser()` faz o narrowing seguro, retornando `AuthenticatedUser` (non-null) ou lancando 401. Isso evita non-null assertions (`!`) e centraliza a logica num unico ponto reutilizavel.

## Consequencias

- Rotas publicas funcionam sem nenhuma configuracao especial — basta nao adicionar guard
- Novas rotas protegidas exigem guard explicito, eliminando o risco de esquecer de atualizar uma allowlist
- O tipo `ApplicationContext.user` e `AuthenticatedUser | null`, forcando o TypeScript a exigir tratamento de null em qualquer acesso ao usuario
- Guards sao composiveis: `onRequest: [authGuard]` ou `onRequest: [roleGuard('HOST')]`
