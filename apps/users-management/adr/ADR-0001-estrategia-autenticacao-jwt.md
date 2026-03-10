# ADR-0001: Estrategia de Autenticacao JWT para Microservicos

## Status
Aceito
Data: 2026-03-09

## Contexto

O sistema e composto por microservicos independentes que precisam validar a identidade do usuario sem depender de um servico central a cada requisicao. A autenticacao precisa ser stateless do ponto de vista dos MSs consumidores (Property, Reservas, etc.), enquanto o MS de Users/Auth centraliza a emissao e revogacao de tokens.

Forcas envolvidas:

- Performance: validacao sem consulta a banco em cada request
- Seguranca: tokens de curta duracao, refresh tokens revogareis, protecao contra XSS
- Autonomia dos MSs: cada um valida tokens independentemente
- Experiencia do usuario: sessao continua enquanto ativo, sem re-login desnecessario

## Alternativas Consideradas

### Alternativa A — better-auth (session-based)

Biblioteca ja presente no projeto. Gerencia autenticacao via sessoes armazenadas em cookies assinados.

**Vantagens**
- Ja integrada ao projeto
- Menos codigo custom
- Plugins para JWT e Bearer disponiveis

**Desvantagens**
- Fundamentalmente session-based, nao suporta o padrao access token + refresh token com rotation
- O plugin JWT gera tokens a partir de sessoes existentes, nao e um fluxo stateless real
- Incompativel com validacao distribuida genuina em microservicos

---

### Alternativa B — Solucoes externas (Keycloak, Auth0)

Servicos dedicados de identity management.

**Vantagens**
- Robustos e battle-tested
- Suportam todos os fluxos OAuth2/OIDC
- Gerenciamento de usuarios incluso

**Desvantagens**
- Adiciona dependencia externa significativa
- Complexidade de infraestrutura (deploy, configuracao, manutenibilidade)
- Custo potencial (Auth0) ou overhead operacional (Keycloak)
- Desproporcional para o escopo atual do sistema

---

### Alternativa C — Implementacao manual com jose + Argon2 (Escolhida)

Implementar o fluxo de autenticacao diretamente no MS de Auth usando `jose` para assinatura/verificacao JWT e Argon2 para hash de senhas.

**Vantagens**
- Controle total sobre o fluxo de tokens
- Suporte nativo a access token + refresh token com rotation
- `jose` ja esta instalada no projeto
- Alinhamento com a filosofia do projeto de manter simplicidade e autonomia dos MSs

**Desvantagens**
- Mais codigo para implementar e manter
- Responsabilidade de seguranca recai sobre a implementacao propria

## Decisao

Implementar autenticacao manualmente, removendo better-auth do projeto. Bibliotecas base: `jose` para assinatura/verificacao JWT e `@node-rs/argon2` para hash de senhas (binding nativo, mais performatico que a versao JS pura). As decisoes tecnicas sao:

### 1. Tokens

| Aspecto | Access Token | Refresh Token |
|---|---|---|
| **Formato** | JWT (header.payload.signature) | Opaco (string aleatoria, nao JWT) |
| **Assinatura** | RS256 (chave assimetrica) | N/A (validado por lookup no Redis) |
| **Duracao** | 10 minutos | 30 dias |
| **Armazenamento (servidor)** | Nenhum (stateless) | Redis do MS de Auth |
| **Armazenamento (cliente)** | localStorage ou memoria | Cookie httpOnly |
| **Enviado em** | Header `Authorization: Bearer <token>` | Cookie automatico (apenas rota de refresh) |

### 2. Assinatura RS256 via JWKS

O MS de Auth assina JWTs com chave privada RSA. Os outros MSs buscam a chave publica via endpoint JWKS (`/.well-known/jwks.json`) e validam localmente. Nenhum MS alem do Auth consegue emitir tokens.

### 3. Payload do JWT

```json
{
  "sub": "<user-id>",
  "name": "<user-name>",
  "email": "<user-email>",
  "role": "GUEST | HOST | ADMIN",
  "iat": 1741500000,
  "exp": 1741500600
}
```

Campos alinhados com `AuthenticatedUser` usado nos MSs consumidores (id, name, email, role).

### 4. Refresh Token Rotation com Renovacao

A cada uso do refresh token:
1. O token atual e invalidado no Redis
2. Um novo par (access token + refresh token) e emitido
3. O novo refresh token e enviado como cookie httpOnly

Resultado: sessao infinita enquanto o usuario estiver ativo. Se ficar 30 dias sem usar o app, precisa fazer login novamente.

Deteccao de roubo: se um refresh token ja utilizado for apresentado novamente, todos os tokens do usuario sao revogados.

### 5. Cookie do Refresh Token

```
Set-Cookie: refresh_token=<token>;
  HttpOnly;
  Secure;
  SameSite=Strict;
  Path=/api/v1/auth/refresh;
  Max-Age=2592000
```

### 6. Hash de Senhas

Argon2id via `@node-rs/argon2` — binding nativo (Rust → Node via NAPI) mais performatico que implementacoes JS puras. Variante id combina resistencia a ataques side-channel (Argon2i) e GPU (Argon2d).

## Consequencias

### Positivas
- Cada MS valida tokens de forma autonoma e stateless, sem dependencia do MS de Auth por request
- Refresh token rotation garante sessao continua para usuarios ativos sem comprometer seguranca
- Cookie httpOnly protege o refresh token contra XSS
- RS256 impede que MSs comprometidos emitam tokens falsos
- Controle total sobre o fluxo, sem limitacoes de biblioteca terceira

### Negativas
- Mais codigo para implementar e manter do que usar uma solucao pronta
- Responsabilidade de implementar corretamente a seguranca (rotacao, revogacao, deteccao de roubo)
- Necessidade de gerenciar par de chaves RSA (geracao, rotacao de chaves, distribuicao)

### Riscos
- Implementacao incorreta da rotacao pode permitir reutilizacao de refresh tokens
- Chave privada RSA vazada compromete todos os tokens — necessario plano de rotacao de chaves
- Redis indisponivel impede refresh de tokens (mitigacao: access token de 10min continua valido)
