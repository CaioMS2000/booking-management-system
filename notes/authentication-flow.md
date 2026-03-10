# Fluxo de Autenticação JWT em Microserviços

## Visão geral

A autenticação é **distribuída**: cada microserviço valida o JWT de forma independente. O Nginx funciona apenas como proxy reverso (roteamento por path), sem nenhuma lógica de autenticação.

```
Cliente (com ou sem token)
    ↓
Nginx (roteia por path, não valida JWT)
    ↓
Microserviço destino (valida JWT sozinho)
```

O MS de Users/Auth é responsável por **emitir** tokens. Os outros MSs apenas **validam** — usando o mesmo `JWT_SECRET` compartilhado.

---

## Quem faz o quê

| Componente | Responsabilidade em relação a auth |
|---|---|
| **Cliente (frontend/app)** | Armazena tokens, envia access token no header, orquestra refresh |
| **Nginx** | Roteia por path, passa headers adiante. Não toca em JWT |
| **MS de Users/Auth** | Emite tokens (login), renova tokens (refresh), revoga tokens (logout) |
| **Outros MSs** | Validam assinatura do JWT com `JWT_SECRET`, extraem identidade do payload |

---

## Emissão de tokens (login)

Ao fazer login, o MS de Auth retorna **dois tokens** com propósitos diferentes:

```
POST /api/v1/auth/login { email, senha }
    ↓
MS Auth valida credenciais
    ↓
Resposta:
  Body:       { "accessToken": "eyJhbG..." }
  Set-Cookie: refresh_token=abc123; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=2592000
```

### Access Token (JWT)

- **Stateless** — contém tudo que o MS precisa saber, sem consultar banco
- **Vida curta** (~1h) — se vazar, o dano é limitado pelo tempo
- **Armazenado no cliente** em memória ou localStorage (JS precisa ler pra montar o header)
- **Enviado em toda requisição** pelo cliente no header `Authorization: Bearer <token>`

Payload do JWT:

```json
{
  "sub": "user-123",
  "email": "joao@email.com",
  "role": "GUEST",
  "permissions": ["booking:create", "booking:read:own"],
  "iat": 1741500000,
  "exp": 1741503600
}
```

### Refresh Token

- **Stateful** — armazenado no Redis do MS de Auth, pode ser revogado a qualquer momento
- **Vida longa** (~30 dias) — define o tempo de inatividade até exigir novo login
- **Armazenado no cliente** como cookie `httpOnly` (JS não consegue acessar, proteção contra XSS)
- **Enviado apenas** para a rota `/api/v1/auth/refresh` (o atributo `Path` do cookie restringe isso)

### Por que dois tokens?

O access token é ótimo pra performance (stateless, sem consulta a banco), mas ruim pra segurança (não tem como invalidar antes de expirar). O refresh token é o oposto: pode ser revogado instantaneamente, mas exige consulta ao Redis.

A combinação resolve: access token curto pra performance no dia a dia, refresh token longo pra segurança e controle de sessão.

---

## Validação distribuída

Cada MS valida o JWT de forma independente, sem chamar o MS de Auth:

```
Requisição chega no MS de Property com header:
  Authorization: Bearer eyJhbG...
    ↓
1. Extrai token do header
2. Valida assinatura com JWT_SECRET (prova que o MS de Auth emitiu)
3. Verifica expiração (exp > agora?)
4. Decodifica payload → { id, email, role, permissions }
5. Popula context.user = AuthenticatedUser | null
```

Isso funciona porque o `JWT_SECRET` é compartilhado entre todos os MSs. Se a assinatura é válida, o payload é confiável — só o MS de Auth consegue gerar tokens com essa assinatura.

---

## Níveis de acesso por rota

Cada rota decide individualmente se exige autenticação:

### Rota pública (anônimo permitido)

```typescript
@Get('api/v1/espacos')
@Public()
async listarEspacos() { }
// context.user = null, qualquer pessoa acessa
```

### Rota autenticada (qualquer usuário logado)

```typescript
@Post('api/v1/reservas')
@UseGuards(JwtAuthGuard)
async criarReserva(@CurrentUser() user: AuthenticatedUser) { }
// Sem token válido → 401
```

### Rota com role específico

```typescript
@Patch('api/v1/espacos/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('HOST')
async atualizarEspaco(@CurrentUser() user: AuthenticatedUser) { }
// Sem token → 401, role errado → 403
```

O MS não "tenta descobrir" quem é o usuário. Ou o cliente mandou um token válido (e o role já está no payload), ou não mandou.

---

## Refresh Token Rotation com renovação

Estratégia escolhida: **rotation com renovação** — a cada refresh, o token antigo é invalidado e um novo par (access + refresh) é emitido.

```
Dia 1:  Access expira → POST /auth/refresh com Refresh #1
        → Novo Access + Refresh #2 (Refresh #1 invalidado)

Dia 15: Access expira → POST /auth/refresh com Refresh #2
        → Novo Access + Refresh #3 (Refresh #2 invalidado)

Dia 29: Access expira → POST /auth/refresh com Refresh #3
        → Novo Access + Refresh #4 (Refresh #3 invalidado)

→ Usuário ativo fica logado indefinidamente
```

### Expiração por inatividade

Se o usuário parar de usar o app, o refresh token expira sozinho:

```
Dia 1:  Refresh #1 gerado (expira em 30 dias)
Dia 2:  ... não volta mais
Dia 31: Refresh #1 expira → precisa fazer login de novo
```

A expiração de 30 dias significa: "se ficar 30 dias sem abrir o app, vai ter que logar de novo".

### Detecção de roubo

Se um refresh token for usado mais de uma vez, é sinal de comprometimento:

```
Refresh #1 emitido para o cliente legítimo
    ↓
Atacante rouba Refresh #1 e usa → recebe Refresh #2
Cliente legítimo tenta usar Refresh #1 → ERRO: token já foi usado!
    ↓
Sistema detecta: token reutilizado → revoga TODOS os tokens do usuário
Atacante e cliente legítimo são deslogados → cliente faz login de novo com senha
```

---

## Armazenamento no cliente

### Access token: memória ou localStorage

O frontend precisa ler o access token pra montar o header `Authorization: Bearer <token>`. Por isso fica acessível ao JavaScript.

A vida curta (~1h) limita o impacto de um eventual roubo via XSS.

### Refresh token: cookie httpOnly

O frontend **não precisa** ler o refresh token — o navegador envia o cookie automaticamente na rota de refresh. Os atributos do cookie fecham diferentes vetores de ataque:

```
Set-Cookie: refresh_token=abc123;
  HttpOnly;                    → JS não acessa (proteção contra XSS)
  Secure;                      → Só enviado via HTTPS (proteção contra interceptação)
  SameSite=Strict;             → Não enviado em requests cross-site (proteção contra CSRF)
  Path=/api/v1/auth/refresh;   → Só enviado pra essa rota específica
  Max-Age=2592000;             → Expira em 30 dias no navegador
```

---

## Responsabilidade do frontend

O backend faz a parte dele (emite, valida, renova tokens) mas o **cliente orquestra o ciclo de vida**:

### Interceptor de refresh automático

Quando o access token expira, o cliente precisa:
1. Detectar o 401
2. Chamar `/auth/refresh` (cookie enviado automaticamente)
3. Guardar o novo access token
4. Refazer a requisição original que falhou

```typescript
async function fetchComAuth(url, options) {
  let response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (response.status === 401) {
    const refreshResponse = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include', // envia cookie httpOnly
    });

    if (refreshResponse.ok) {
      accessToken = refreshResponse.data.accessToken;
      return fetch(url, {
        ...options,
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } else {
      redirectToLogin(); // refresh também falhou
    }
  }

  return response;
}
```

### Mutex para requests simultâneos

Se várias requisições receberem 401 ao mesmo tempo, o cliente não deve chamar `/auth/refresh` múltiplas vezes. A primeira requisição que recebe 401 inicia o refresh, as demais esperam o resultado:

```
Requisição A → 401 → inicia refresh → POST /auth/refresh → novo token
Requisição B → 401 → "refresh em andamento, espero..."            ↑
Requisição C → 401 → "refresh em andamento, espero..."            ↑
                                                                   ↓
Todas refazem com o novo token
```

---

## Formas de logout

| Tipo | Gatilho | O que acontece |
|---|---|---|
| **Explícito** | Usuário clica "Sair" | Cliente apaga tokens, MS de Auth revoga refresh token no Redis |
| **Por inatividade** | Refresh token expira (ex: 30 dias sem uso) | Próximo refresh falha, cliente redireciona pro login |
| **Forçado** | Admin revoga token (ex: conta comprometida) | MS de Auth apaga refresh token do Redis, próximo refresh falha |

---

## Fluxo completo: exemplo passo a passo

```
1. Usuário abre o app pela primeira vez
   → Não tem token → acessa apenas rotas @Public()

2. Usuário faz login
   → POST /api/v1/auth/login { email, senha }
   → Nginx roteia pro MS de Auth
   → MS de Auth valida, retorna access token no body + refresh token como cookie httpOnly

3. Usuário consulta listings (rota pública)
   → GET /api/v1/espacos (com ou sem token, tanto faz)
   → Nginx roteia pro MS de Property
   → Rota é @Public(), executa sem validar token

4. Usuário cria reserva (rota protegida)
   → POST /api/v1/reservas com header Authorization: Bearer <access_token>
   → Nginx roteia pro MS de Reservas
   → JwtAuthGuard valida token, extrai user do payload
   → Handler executa com user tipado

5. Access token expira (~1h depois)
   → Próxima requisição retorna 401
   → Frontend intercepta, faz POST /api/v1/auth/refresh (cookie enviado automaticamente)
   → MS de Auth valida refresh token, emite novo par
   → Frontend refaz a requisição original com novo access token
   → Usuário nem percebe

6. Usuário fica 30 dias sem abrir o app
   → Refresh token expira
   → Próximo refresh falha com 401
   → Frontend redireciona pro login
```
