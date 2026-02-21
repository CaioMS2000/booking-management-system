# Guideline: Either Pattern vs Exceções

## Princípio geral

**Either** para erros que são resultados esperados do negócio.
**Exceção** para falhas inesperadas ou de infraestrutura.

A pergunta-chave é: **o handler precisa tomar uma decisão baseada nesse erro, ou ele simplesmente não tem o que fazer?**

- Se o handler precisa reagir → Either (`failure(...)`)
- Se não tem o que fazer → exceção (deixa o middleware tratar)

---

## Quando usar Either

### 1. Validação de value objects

Input inválido é um resultado esperado. O handler precisa saber que falhou pra retornar o erro tipado ao chamador.

```typescript
// RegisterHostCommandHandler
const emailResult = Email.create(command.email)

if (emailResult.isFailure()) {
    return failure(emailResult.value) // InvalidValueError
}
```

### 2. Regras de negócio que o handler orquestra

Quando a ausência de algo é uma condição de negócio que o handler trata explicitamente.

```typescript
// RegisterPropertyCommandHandler
const host = await this.hostRepository.findById(command.params.hostId)

if (!host) {
    return failure(new HostNotFoundError()) // Regra: não pode criar property sem host
}
```

### 3. Quando o chamador precisa distinguir tipos de erro

Se o tipo de retorno é `Either<InvalidValueError | HostNotFoundError, T>`, o chamador pode inspecionar o tipo do erro e reagir de forma diferente (ex: mensagens diferentes, status HTTP diferentes).

---

## Quando usar exceção (throw / getById)

### 1. Invariantes internas / integridade de dados

Se uma property existe, o host dela **tem que existir**. Se não existir, é um bug — não um resultado de negócio.

```typescript
// GetPropertyQueryHandler — host é buscado DEPOIS de encontrar a property
const host = await this.hostRepository.getById(property.hostId)
// Se lançar exceção, é um problema de integridade. O middleware trata.
```

### 2. Falhas de infraestrutura

DB fora do ar, rede caiu, timeout. O handler não tem o que fazer — deixa a exceção subir até o `error-handler.ts`.

### 3. Handler não registrado no bus

`CommandHandlerNotFoundError` e `QueryHandlerNotFoundError` já são exceções. Correto, porque é um erro de configuração, não de negócio.

---

## Convenção find/get nos repositórios

**Regra prática: de onde vem o ID?**
- ID veio do **input externo** (API, UI, outro módulo) → `findById` + Either
- ID veio de **dentro do domínio** (referência de uma entidade já validada) → `getById` + exceção

| Método | Retorno | Quando usar |
|---|---|---|
| `findById(id)` | `T \| null` | ID veio do input externo — "não encontrado" é resultado esperado |
| `getById(id)` | `T` (ou throw) | ID veio de referência interna — ausência é bug/inconsistência |
| `findAll()` / `findManyBy...()` | `T[]` | Lista vazia é resultado válido |
| `save(entity)` | `void` | Falha é exceção de infra |

---

## Resumo rápido

| Situação | Abordagem | Exemplo |
|---|---|---|
| Value object inválido | Either | `Email.create(...)` retorna `failure(InvalidValueError)` |
| Regra de negócio explícita | Either | "Não pode registrar property sem host" |
| Entidade não encontrada (input do usuário) | Either + `findById` | `GetPropertyQueryHandler` busca property por ID |
| Entidade não encontrada (referência interna) | Exceção + `getById` | `GetPropertyQueryHandler` busca host da property |
| Falha de infra | Exceção | DB fora, rede, etc |
| Bug / invariante quebrada | Exceção | Dado corrompido, handler não registrado |
