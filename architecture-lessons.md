# Lições de Arquitetura de Software

Documento compilado a partir de uma análise arquitetural do projeto booking-management-system. Cobre decisões de design, trade-offs entre padrões e princípios práticos para evitar over-engineering.

---

## 1. Por que Entidades e DTOs existem separadamente

A separação existe porque Entidades e DTOs servem propósitos completamente diferentes, mesmo que pareçam carregar "os mesmos dados".

**Entidade** representa um conceito do domínio. Ela tem identidade (um `id` que a distingue de outras), comportamento (métodos, regras de negócio) e invariantes que protege (ex: não pode ter saldo negativo).

**DTO** é um envelope de dados para atravessar uma fronteira — entre camadas, entre sistemas, entre processos. Não tem comportamento, só carrega dados.

### Por que não usar Entidade pra tudo

**Acoplamento de contratos.** Quando se expõe a Entidade diretamente (numa API REST, por exemplo), o contrato externo vira espelho do modelo interno. Qualquer refatoração interna — renomear um campo, reorganizar responsabilidades — quebra o contrato externo. Perde-se a liberdade de evoluir o domínio independentemente.

**Shape mismatch.** O que o cliente precisa raramente é idêntico à Entidade. Um endpoint de listagem pode precisar de 3 campos. Um relatório pode precisar de dados agregados de 5 entidades.

**Encapsulamento e segurança.** Entidades podem ter campos internos que nunca deveriam sair da aplicação — hashes de senha, flags de auditoria interna, estados de máquinas de estado. Expor a Entidade é expor tudo isso. Também há o problema de over-posting: se o cliente pode enviar a Entidade de volta, ele pode tentar setar campos que não deveria.

**Entidade rica vs. dado plano.** Uma Entidade bem modelada tem comportamento — `order.cancel()`, `account.debit(amount)`. Pode ter objetos de valor aninhados, aggregates, referências lazy. Isso não serializa facilmente e não faz sentido num contexto de transporte de dados.

### Como o contexto muda a resposta

**Sem DDD / CRUD simples (Active Record, Rails-style):** Usar a Entidade/Model pra tudo funciona, porque o domínio é anêmico, não tem lógica complexa, e o custo do mapeamento seria maior que o benefício. O problema aparece quando o sistema cresce.

**Com Clean Architecture / Hexagonal:** A regra de dependência diz que camadas externas dependem de internas, nunca o contrário. DTOs são a cola entre essas camadas — permitem que cada lado evolua independentemente.

**Com DDD:** A separação fica mais explícita. Entities/Aggregates são domínio rico. Commands são DTOs de entrada. Read Models/Projections são o que sai — e em CQRS, podem ser radicalmente diferentes das entidades de escrita.

---

## 2. DRY não é sobre código duplicado — é sobre conhecimento

O erro mais comum é interpretar DRY como "nunca escreva a mesma coisa duas vezes". A definição original de Dave Thomas e Andy Hunt no The Pragmatic Programmer é:

> *"Every piece of **knowledge** must have a single, authoritative representation in the system."*

A palavra chave é **conhecimento**, não código.

Quando existe uma Entidade `User` e um DTO `UserResponse` com campos parecidos, não é duplicação de conhecimento — são representações de **coisas diferentes**: a Entidade representa o conceito de usuário no domínio; o DTO representa o contrato de resposta da API. São conhecimentos distintos que por acaso se parecem. Podem e vão divergir com o tempo.

### Princípios complementares

- **WET (Write Everything Twice):** Espera aparecer duas vezes antes de abstrair.
- **AHA (Avoid Hasty Abstractions):** De Sandi Metz — o custo de uma abstração errada é maior que o custo da duplicação.

Duplicação é barata e reversível. Uma abstração prematura prende — começa-se a distorcer casos novos pra caber numa abstração que nunca deveria existir.

### Quando a "duplicação" é saudável

Dois trechos de código podem ser textualmente idênticos mas conceitualmente independentes. Se mudam por razões diferentes, separá-los é a coisa certa — mesmo parecendo duplicação. Isso conecta com o Single Responsibility Principle: se dois conceitos são unificados só pra evitar repetição, agora têm dois motivos para mudar.

**A pergunta certa não é "estou repetindo código?" mas sim "estou duplicando conhecimento, ou representando conceitos distintos que se parecem?"**

---

## 3. Duplicações encontradas no projeto

Análise concreta das duplicações identificadas e o que fazer com cada uma.

### Duplicações que SÃO conhecimento repetido (devem ser consolidadas)

| O quê | Onde está | Recomendação |
|---|---|---|
| `Command`, `CommandBus`, `Query`, `QueryBus` | Copiados em cada módulo (property, listing, reservation) | Mover para `@repo/core` — são infraestrutura idêntica |
| `Money` value object | listing-module e reservation-module | Mover para `@repo/core` — dinheiro é conceito universal |
| `Currency` enum | listing-module, reservation-module, modules-contracts | Mover para `@repo/core` |
| `resolve-id` util | Copiado em cada módulo | Mover para `@repo/core` |
| `DateInterval` type | listing-module e modules-contracts | Mover para `@repo/core` ou `modules-contracts` |

### Duplicações que NÃO são conhecimento repetido (devem permanecer separadas)

| O quê | Razão para manter separado |
|---|---|
| `PropertyDTO` (contrato) vs `Property` (entity) | Representam coisas diferentes: contrato externo vs modelo interno |
| `Address` no contrato vs `Address` value object | O contrato é dado plano; o VO pode ter validação e comportamento |

### Sobre modules-contracts

O pacote `@repo/modules-contracts` existe para que módulos se comuniquem via contratos, sem imports diretos. Isso está correto. O contrato deve definir sua própria representação dos dados — isso não é duplicação.

**Regra importante: nunca fazer modules-contracts importar dos apps.** A direção de dependência é apps → packages, nunca o contrário. Inverter isso cria acoplamento circular e perde-se a capacidade de deployar apps independentemente.

---

## 4. DDD não é um pacote "tudo ou nada"

O que se chama de "DDD" é uma coleção de padrões independentes. Muitos existiam antes do livro do Eric Evans.

| Pattern | Precisa de DDD? | Origem real |
|---|---|---|
| Repository | Não | Martin Fowler, PoEAA (2002) |
| Value Object | Não | Fowler, Ward Cunningham |
| Either/Result type | Não | Programação funcional (Haskell, ML) |
| Command/Query Bus | Não | Greg Young, Bertrand Meyer |
| Domain Events | Parcialmente | Evans popularizou, pub/sub é anterior |
| Entity com identidade | Não | Modelagem OO básica |
| Module boundaries | Não | Engenharia de software básica |

O que é exclusivamente DDD: linguagem ubíqua, aggregate roots com invariantes de consistência, bounded contexts como ferramenta de design estratégico, context mapping.

### O que realmente sustenta a qualidade deste sistema

Se o rótulo DDD fosse removido, o que gera valor:

1. **Separação de concerns** — domínio não sabe de HTTP, HTTP não sabe de banco. Isso é Clean Architecture/Hexagonal.
2. **Tipos ricos ao invés de primitivos** — `Money` ao invés de `number`, `Email` ao invés de `string`. Boa prática de tipagem.
3. **Erros como valores** — `Either<Error, Success>` ao invés de exceptions. Programação funcional.
4. **Contratos entre módulos** — comunicação via interfaces, não imports diretos. Princípio de inversão de dependência (SOLID).
5. **Imutabilidade** — Value Objects que não mudam. Conceito funcional.

Nenhum desses precisa de DDD para existir.

### Quando DDD tático agrega

- Regras de negócio complexas envolvendo múltiplas entidades coordenadas
- Ciclo de vida com transições de estado protegidas (ex: pending → confirmed → cancelled)
- Consistência transacional entre múltiplas entidades (aggregate boundary)

Se não há nada disso, entidades simples com validação no construtor resolvem. No projeto: Property e Host são essencialmente CRUD — não precisam de AggregateRoot nem domain events. Reservation é naturalmente rica e se beneficia da modelagem mais elaborada.

### Strategic DDD vs Tactical DDD

- **Strategic** = definir bounded contexts, decidir onde colocar fronteiras entre módulos. Valioso sempre.
- **Tactical** = entities, aggregates, value objects, domain events. Usar onde a complexidade justifica, não em todo lugar.

---

## 5. CQRS vs CQS — quando o bus agrega valor

### O que CQRS resolve de verdade

CQRS (Command Query Responsibility Segregation) resolve problemas de escala de leitura vs escrita:

- Modelo de escrita otimizado para consistência (normalizado, com regras)
- Modelo de leitura otimizado para performance (desnormalizado, projeções, cache)
- Podem usar bancos de dados diferentes
- Podem escalar independentemente

Se commands e queries usam os mesmos repositórios e as mesmas entidades, não há separação real de modelos. Nesse caso, o que existe é **CQS** (Command Query Separation) — o princípio de que métodos que mudam estado não retornam dados, e vice-versa. Isso é bom, mas não precisa de bus nenhum.

### Quando trazer o Command/Query Bus

- **Cross-cutting concerns**: se todo command precisa de logging, transaction, retry, audit — um bus com middleware pipeline faz sentido
- **Dezenas de handlers**: quando a descoberta automática simplifica o wiring
- **CQRS real**: modelo de leitura separado (ex: Elasticsearch para queries, Postgres para commands)
- **Event sourcing**: commands geram eventos que são a fonte de verdade

Com 2-3 commands por módulo, o bus é overhead. Um service simples com a mesma assinatura tem a mesma qualidade, testabilidade e separação — sem a camada de indireção.

---

## 6. Bounded Contexts — Property vs Listing

### Critérios para decidir se são contextos separados

- **Equipes diferentes** trabalhariam neles? Se não, talvez sejam o mesmo contexto.
- **Podem ser deployados independentemente** de forma útil? Se Listing sempre precisa de Property, a fronteira pode ser artificial.
- **A linguagem muda?** No contexto de Property: "imóvel, endereço, capacidade". No contexto de Listing: "preço por noite, disponibilidade, intervalos". Se a linguagem é diferente, são contextos diferentes.

### Argumentos para separar

- Property é sobre o que o imóvel é (endereço, capacidade, tipo, fotos)
- Listing é sobre como ele é oferecido (preço, calendário, disponibilidade)
- Um imóvel pode existir sem anúncio
- Um imóvel poderia ter múltiplos listings (preço diferente por temporada)

### Argumentos para unificar

- No sistema atual, a relação é 1:1
- Listing não faz nada sem Property; todo comando de Listing precisa checar se a property existe
- Não há cenário real onde evoluem independentemente
- A fronteira cria overhead (contratos, mappers, chamadas cross-module) sem resolver um problema real

### Recomendação

No estado atual, a fronteira entre Property e Listing é prematura. Gera complexidade sem resolver um problema real. Se surgir necessidade de separar (múltiplos listings por property, equipes diferentes), refatora-se. Fazer a separação antes do problema existir é over-engineering.

**Princípio: YAGNI (You Ain't Gonna Need It).** Separe quando a dor aparecer, não antes.

---

## 7. Consistência entre módulos

### O cenário: criação de reserva

Guest quer reservar. Para isso: o Listing precisa existir e estar ativo, o período precisa estar disponível, o preço precisa ser calculado, e a reserva precisa ser criada.

### Regra de ouro: cada módulo protege seus próprios invariantes

O módulo de Reservation sabe: regras de reserva (duração mínima, transições de status), se o guest pode reservar. O módulo de Property/Listing sabe: se o listing existe e está ativo, se o período está disponível, qual o preço correto.

### Pattern A: Orquestração (Application Service)

Um serviço na camada de aplicação coordena as chamadas entre módulos de forma síncrona. O serviço consulta o módulo de listing via contrato, verifica disponibilidade, calcula preço, e então cria a reserva.

**Prós:** Simples, síncrono, fácil de entender e debugar.
**Contras:** Acoplamento temporal — se o listing-module cai, reservation não funciona.

### Pattern B: Coreografia (Domain Events + Consistência Eventual)

Módulos reagem a eventos uns dos outros de forma assíncrona. A reserva é criada como "pending" e eventos coordenam a confirmação.

**Prós:** Módulos totalmente desacoplados, funciona em microserviços.
**Contras:** Complexidade, consistência eventual, debugging difícil.

### Recomendação

Para um monolito modular, usar orquestração (Pattern A). Todos os módulos estão no mesmo processo — consistência forte é gratuita. Consistência eventual é um trade-off aceito quando necessário, não quando possível.

Ao migrar para microserviços (se migrar), reavalia-se. Mesmo em microserviços, muitos sistemas usam comunicação síncrona (HTTP/gRPC) e aceitam o acoplamento temporal porque a alternativa é pior.

### Detalhe importante: snapshot de preço

Quando a reserva é criada, o `totalPrice` deve ser um **snapshot** (valor fixado no momento da reserva), nunca uma referência que recalcula. O hóspede viu R$200/noite e reservou; se o host muda para R$300, o preço da reserva existente não muda. O model deve refletir isso — `totalPrice` na Reservation é um valor congelado.

---

## 8. Pacotes no monorepo — quando separar

### Princípio: comece com 1 pacote, separe quando a dor aparecer

Um `@repo/core` "gordo" é melhor que 8 pacotes com nomes inventados que ninguém lembra onde está cada coisa.

O custo de um pacote num monorepo não é zero: `package.json` próprio, `tsconfig.json` próprio, configuração de build, import paths que todo dev precisa memorizar, e quando algo muda, precisa saber qual pacote mexer.

### Quando faz sentido separar

Quando o pacote atual tem consumidores que precisam de coisas diferentes. Exemplo concreto: `@repo/system-settings-manager` depende de `drizzle-orm` e `pg` (PostgreSQL). Se estivesse dentro de `@repo/core`, todo mundo que importasse `@repo/core` puxaria essas dependências pesadas. Faz sentido separar — e é o que já foi feito.

### Teste prático

Se um app frontend só precisa de types (`Money`, `Currency`, `PropertyType`), vai puxar `bcryptjs`, `uuidv7`, `dayjs`? Se esse cenário existir, separar faz sentido. Se não existe, manter junto.

### Estrutura que escala sem over-engineering

Quando (e se) `@repo/core` ficar grande demais, a divisão natural seria:

| Pacote | Conteúdo | Razão da separação |
|---|---|---|
| `@repo/core` | Entity, ValueObject, Either, Rule, tipos utilitários | Fundação universal, zero deps pesadas |
| `@repo/crypto` | BcryptHasher, HashGenerator, Encrypter | Dependência de `bcryptjs`; apps que não autenticam não precisam |
| `@repo/modules-contracts` | Interfaces cross-module, DTOs | Já existe |
| `@repo/system-settings-manager` | Config de sistema, Drizzle | Já existe |

Organização interna (pastas, barrel exports) resolve o problema de encontrar as coisas sem precisar de pacotes separados.

---

## 9. Princípio geral

> **Comece simples. Adicione complexidade quando a dor aparecer — não antes.**

Isso se aplica a tudo:
- DDD tático: use onde a complexidade do domínio justifica
- CQRS/Command Bus: use quando tiver cross-cutting concerns ou escala de leitura/escrita
- Separação de pacotes: separe quando dependências incomodam consumidores
- Bounded contexts: separe quando módulos evoluem independentemente
- Abstrações: duplique até ter certeza do pattern; abstraia depois

A cerimônia tem custo. Cada camada de indireção, cada abstração, cada pacote separado é complexidade que precisa ser justificada por um problema real — não por um problema hipotético futuro.

**A regra que guia todas as decisões:**

> Se dois trechos de código mudam pela mesma razão e representam o mesmo conceito → consolide. Se mudam por razões diferentes, mesmo parecendo iguais → mantenha separados.

---

## 10. Application Service, Use Case e Event-Driven Architecture

### Application Service vs Use Case

São praticamente sinônimos na prática — a diferença é de tradição/vocabulário, não de comportamento.

| Termo | Vem de onde | O que é |
|---|---|---|
| **Application Service** | DDD (Eric Evans) | Serviço na camada de aplicação que orquestra o domínio |
| **Use Case** | Clean Architecture (Robert Martin) | Interactor que representa uma intenção do usuário |

Ambos fazem a mesma coisa: recebem input, coordenam chamadas ao domínio e à infraestrutura, e retornam o resultado. Quando alguém fala `CreateReservationService` e outro fala `CreateReservationUseCase`, estão descrevendo a mesma coisa.

### O pattern de método `execute` único (Single Action Class)

A convenção mais comum é uma classe com um único método público (`execute` ou `handle`). Se precisa de lógica auxiliar, usa métodos privados. O contrato externo é sempre `execute(input): output`.

Vantagens:
- **Interface uniforme** — todo use case/service tem a mesma assinatura. Facilita composição, middleware, decorators.
- **SRP aplicado** — se a classe faz uma coisa, tem um método público. Se precisa de dois métodos públicos, provavelmente são dois use cases.
- **Testabilidade** — testar `execute()` com diferentes inputs cobre tudo.

### Event-Driven Architecture (EDA)

EDA é um estilo arquitetural onde componentes se comunicam via eventos. É mais amplo que a coreografia discutida na seção 7. Inclui:

- **Domain Events** (dentro de um bounded context) — `ReservationCreated`
- **Integration Events** (entre módulos/serviços) — `ReservationRequested` publicado num broker
- **Event Sourcing** — o estado é derivado da sequência de eventos
- **CQRS + Events** — commands geram eventos que atualizam read models

A coreografia entre módulos via eventos é um subset de EDA. É possível usar EDA sem coreografia — por exemplo, domain events dentro de um módulo despachados de forma síncrona após persistir. Usar domain events localmente é event-driven sem a complexidade de consistência eventual.

---

## 11. Value Objects existem fora de DDD

Value Object como conceito é anterior ao DDD — Martin Fowler já descrevia em PoEAA (2002), e Ward Cunningham usava o pattern nos anos 90.

O conceito central: **um objeto definido pelo seu valor, não pela sua identidade**. R$100 é R$100 — não importa qual nota, importa o valor. Já duas pessoas com o mesmo nome são pessoas diferentes — têm identidade.

Isso é útil em qualquer paradigma. "Value Object" é vocabulário compartilhado da indústria, não compromisso com DDD. Usar o termo não obriga a adotar aggregates, bounded contexts ou linguagem ubíqua.

---

## 12. Quando usar classe vs type simples

A distinção depende de uma pergunta: **a criação pode falhar?**

### Com validação real — classe justificada

```typescript
class Email extends ValueObject<string> {
  static create(email: string): Either<InvalidValueError, Email> {
    if (!containsAt(email)) return failure(...)
    if (!validFormat(email)) return failure(...)
    return success(new Email(email))
  }
}
```

A classe existe para garantir um invariante: se existe uma instância de `Email`, ela é válida. O construtor é privado, o único caminho é `create()`. Em qualquer lugar do sistema que recebe um `Email`, tem-se a garantia de que já foi validado.

### Sem validação — type basta

Se `create()` nunca falha e não há comportamento (métodos, cálculos), a classe não protege nenhum invariante. A diferença entre ela e um type literal é zero funcional — só cerimônia.

### Regra prática

> **Se `create()` pode falhar → classe.** Encapsula validação e garante instâncias válidas.
>
> **Se `create()` nunca falha e não há comportamento → type.** A classe não está protegendo nada.

### Aplicação concreta no projeto

| Atual | Tem validação/comportamento? | Recomendação |
|---|---|---|
| `Email` | Sim (formato, @) | Manter como classe |
| `CPF` | Sim (length, checksum) | Manter como classe |
| `Phone` | Sim (length) | Manter como classe |
| `CEP` | Sim (length/pattern) | Manter como classe |
| `Money` | Tem comportamento (`getAmount`, conversão) | Manter como classe |
| `ReservationPeriod` | Sim (checkout > checkin) | Manter como classe |
| `Name` | Não | Trocar por `string` ou type alias |
| `Address` (sem validação) | Não | Trocar por type literal: `{ street: string, city: string, ... }` |

---

## 13. Branded types em TypeScript

### O problema com type aliases

```typescript
type Name = string
type Email = string

function greet(name: Name) { console.log(`Hi ${name}`) }

const email: Email = "foo@bar.com"
greet(email) // ✅ compila sem erro
```

Type aliases são transparentes para o TypeScript. `Name` e `Email` são ambos `string` — o compilador não distingue um do outro. O alias é documentação visual, sem enforcement.

### A solução: branded types

```typescript
type Name = string & { readonly __brand: 'Name' }
type Email = string & { readonly __brand: 'Email' }

function greet(name: Name) { console.log(`Hi ${name}`) }

const email = "foo@bar.com" as Email
greet(email) // ❌ erro de compilação
```

O `__brand` cria uma propriedade "fantasma" que só existe no sistema de tipos — não existe em runtime, não ocupa memória, não aparece no JSON. Mas para o TypeScript, `Name` e `Email` agora são tipos estruturalmente diferentes.

### Quando usar

Branded types são mais úteis para **IDs** — onde misturar `UserId` com `OrderId` é um bug sutil e comum. Para tipos como `Name` ou `Address`, geralmente são overkill; um type simples resolve.

---

## 14. UniqueEntityID: classe wrapper vs alternativas

### O que a classe faz hoje

```typescript
class UniqueEntityID {
  private value: string
  toString() { return this.value }
  toValue() { return this.value }
  constructor(value: string) { this.value = value }
  equals(id: UniqueEntityID) { return id.toValue() === this.value }
}
```

É um wrapper de `string` com `equals()`. Sem validação, sem lógica, sem invariante protegido.

### O que ela dá

- Distinção semântica em assinaturas (`findById(id: UniqueEntityID)` vs `findById(id: string)`)
- `equals()` centralizado
- Barreira de tipo — não passa `string` qualquer onde espera um ID

### O que ela custa

- `new UniqueEntityID(value)` em todo lugar
- `.toValue()` ou `.toString()` quando precisa da string de volta
- O `IdGenerator` retorna `UniqueEntityID` ao invés de `string`, forçando o wrapping em toda a cadeia

### Alternativas

**Branded type** — mesma segurança de tipo sem overhead de instanciação:

```typescript
type EntityId = string & { readonly __brand: 'EntityId' }
function entityId(value: string): EntityId { return value as EntityId }
```

Sem `.toValue()`, `===` funciona direto para comparação.

**String puro** — máxima simplicidade. O risco de "passar a string errada" num projeto de 1 dev é baixo, e o overhead da classe é real. O `IdGenerator` retornaria `string` direto.

### Recomendação

Para simplificar o projeto, trocar por `string`. Se amanhã a distinção de tipo fizer falta, branded type é a evolução natural sem voltar para classe.

---

## 15. Estratégia de IDs: internos vs públicos

### O pattern de dual ID

É comum e bem estabelecido usar dois tipos de ID para cada entidade:

| ID | Uso | Formato |
|---|---|---|
| **ID interno** (primary key) | Banco, joins, referências entre tabelas, operações internas | UUID |
| **ID público** | URLs, API responses, o que o usuário vê | Numérico curto ou string curta |

Isso garante o melhor dos dois mundos: UUID pro banco dá unicidade sem coordenação (importante para microserviços e sharding futuro), e ID público curto garante URLs legíveis.

### UUID v4 vs v7 para IDs internos

- **UUID v7** é time-ordered — inserts no B-tree são sempre no final (append-only), sem page splits. Performance de escrita significativamente melhor.
- **UUID v4** é aleatório — causa fragmentação no índice com volume alto.

Recomendação: padronizar em v7 para IDs de entidades no banco.

### Opções para ID público

**Incremental puro (sequence do Postgres):**

URLs como `/rooms/1234`. Simples, legível, funciona em escala — o Airbnb real usa exatamente isso. A desvantagem é que expõe volume de negócio (o último ID indica quantos registros existem) e permite enumeração. Para recursos públicos (listings, properties), isso geralmente não é problema — o conteúdo é público por natureza.

**Incremental com obfuscação (Sqids/Hashids):**

Mantém sequence incremental no banco mas aplica transformação reversível para exibição:

```typescript
import Sqids from 'sqids'
const sqids = new Sqids({ minLength: 6 })

sqids.encode([1])    // → "bM7a0K"
sqids.encode([2])    // → "kR8zVp"  (não parece sequencial)
sqids.decode("bM7a0K") // → [1]    (reversível sem lookup extra)
```

URLs curtas, não enumeráveis, sem lookup adicional no banco.

**NanoID / string curta aleatória:**

```typescript
import { nanoid } from 'nanoid'
nanoid(10) // → "V1StGXR8_Z"
```

Não sequencial, não reversível, mas curto. Precisa de index unique no banco.

### Decisão para o projeto

Para um sistema de reservas onde listings e properties são conteúdo público, incremental puro ou Sqids são as opções mais pragmáticas. O importante é que o gerador de IDs incrementais seja **persistido no banco** (Postgres sequence), não em memória — um gerador in-memory reseta no restart do app e não funciona com múltiplas instâncias.

---

## 16. Guest Management — identidade em contexto de microserviços

### O problema

O módulo de booking precisa saber se um guest é válido para criar uma reserva. Mas o CRUD de usuários pertence a outro microserviço (MS4 — Gestão de Usuários & Auth). A pergunta: este MS precisa ter CRUD de Guest?

### Decisão: este MS não é dono do Guest

O booking MS é **consumidor de identidade**, não dono. Ele nunca cria, edita ou deleta usuários — apenas consome a informação de que um usuário existe e é válido.

### Abordagem em duas camadas complementares

**Camada 1: JWT para autenticação**

Cada MS valida o token JWT de forma independente (Zero Trust). O `guestId` vem do `token.sub` — nunca do body da request. Se o token é válido (assinatura ok, não expirado), o usuário está autenticado.

```typescript
// O guestId SEMPRE vem do token, nunca do body
clienteId: user.id // extraído do JWT pelo guard/middleware
```

**Camada 2: Projeção local read-only para dados de referência**

Uma tabela mínima de Guest (id, name, email, status) mantida neste MS, sincronizada via eventos emitidos pelo MS4:

- `UserCreatedEvent` → cria Guest local
- `UserUpdatedEvent` → atualiza dados
- `UserDeactivatedEvent` → marca como inativo

Isso permite: verificar se o guest existe na base local, checar se está ativo, e exibir dados do guest em queries de reservas — tudo sem chamar o MS4.

**Nenhum CRUD é exposto por API neste MS.** A projeção é puramente reativa — só muda em resposta a eventos de outro contexto.

### Event Handlers vs Use Cases

Para projeções, **handlers simples chamam o repository diretamente** — sem use cases. A razão: não há lógica de negócio a validar. O MS4 já validou o usuário; este MS está apenas replicando dados.

```typescript
class GuestEventHandler {
  constructor(private guestRepo: GuestRepository) {}

  onUserCreated(event: UserCreatedEvent) {
    const guest = Guest.fromEvent(event)
    await this.guestRepo.save(guest)
  }

  onUserDeactivated(event: UserDeactivatedEvent) {
    await this.guestRepo.deactivate(event.userId)
  }
}
```

**Use cases existem para comandos iniciados por usuários** (criar reserva, cancelar reserva). Handlers de eventos são uma camada diferente — reagem a **fatos que já aconteceram** em outro bounded context.

### Fluxo completo na criação de reserva

```
Request chega → valida JWT (autenticação)
             → extrai userId do token
             → consulta Guest na projeção local (existe? ativo?)
             → se válido → cria reserva com guestId
             → se inválido → rejeita
```

### Quando implementar cada camada

| Fase | O que implementar | Razão |
|---|---|---|
| **Monolito modular (agora)** | Apenas JWT — confiar no token | Projeção via eventos é over-engineering sem inter-service communication real |
| **Microserviços (futuro)** | JWT + projeção local via eventos | Necessário quando os serviços rodam em processos separados e não compartilham banco |

A infraestrutura para a camada 2 já existe no `@repo/core` (`EventBus` com `correlationId`). Quando a migração acontecer, é só ligar os fios.
