# O Guia Sobrevivencialista do Domain-Driven Design (DDD)

Este guia não é sobre definições acadêmicas chatas. É sobre como usar DDD no mundo real sem enlouquecer, focado em evitar as armadilhas comuns (como loops infinitos de mapeamento e complexidade desnecessária).

## 1. O Mindset Correto

**Esqueça o Banco de Dados.**
O erro nº 1 é desenhar suas classes pensando em como elas serão salvas nas tabelas (chave estrangeira, joins).
*   **Banco de Dados:** Foca em dados relacionais e eficiência de armazenamento.
*   **Domínio (DDD):** Foca em comportamento e regras de negócio.

Se você começar modelando "Tabelas", você fará um sistema CRUD, não DDD. E tudo bem! Mas não chame de DDD.

---

## 2. As Ferramentas Táticas (Building Blocks)

### Value Objects (O Segredo Oculto)
A maioria ignora isso, mas é a parte mais importante.
*   **O que são:** Pequenos objetos que representam um conceito, mas não têm identidade própria. São definidos apenas pelos seus valores. São imutáveis.
*   **Exemplos:** `Email`, `CPF`, `Preco`, `Cor`, `Endereco`.
*   **Regra:** Se você mudar o valor, você troca o objeto inteiro. (Ex: Você não muda os dígitos de uma nota de R$10. Você troca por outra nota).
*   **Ganho:** Validação automática. Você nunca terá um `string` inválido no seu sistema se usar um VO `Email`.

**Business Rules em Value Objects:**
Ao invés de espalhar `if/else` dentro dos métodos, encapsule cada regra em uma classe `IBusinessRule`:

```typescript
interface IBusinessRule {
    isBroken(): boolean;
    message: string;
}

class ValueOfMoneyMustNotBeNegativeRule implements IBusinessRule {
    constructor(private value: number) {}
    
    isBroken(): boolean {
        return this.value < 0;
    }
    
    get message(): string {
        return "Value of money must not be negative.";
    }
}

// Uso no Value Object:
class MoneyValue extends ValueObject {
    static of(value: number, currency: string): MoneyValue {
        CheckRule(new ValueOfMoneyMustNotBeNegativeRule(value));
        return new MoneyValue(value, currency);
    }
}
```

**Vantagens das Business Rules:**
- Regras testáveis isoladamente
- Mensagens de erro claras e centralizadas
- Reutilização de regras em diferentes contextos
- Facilita a leitura do código (o nome da classe já explica a regra)

### Entidades (Entities)
*   **O que são:** Objetos que têm uma identidade única (ID) que persiste através do tempo, mesmo que seus atributos mudem.
*   **Exemplos:** `Usuario`, `Pedido`, `Produto`.
*   **Regra:** Dois usuários com o mesmo nome são pessoas diferentes se tiverem IDs diferentes.

**Strongly Typed IDs: Evitando Confusão de IDs**
Um erro comum é passar o ID errado: `pedido.clienteId = usuarioId` (passou UserId onde deveria ser ClienteId).

**Solução:** Crie classes específicas para cada tipo de ID:

```typescript
class UserId {
    constructor(public readonly value: string) {
        if (!value) throw new Error("Id cannot be empty");
    }
    
    equals(other: UserId): boolean {
        return this.value === other?.value;
    }
}

class PedidoId {
    constructor(public readonly value: string) {
        if (!value) throw new Error("Id cannot be empty");
    }
}

// Agora o TypeScript/compilador impede erros:
class Pedido {
    clienteId: UserId; // Não aceita PedidoId por engano!
}
```

**Vantagens:**
- Type-safety: o compilador impede passar IDs errados
- Autodocumentação: `UserId` é mais claro que `string`
- Validação centralizada (ex: não aceitar GUID vazio)
- Facilita refatoração (renomear `UserId` afeta todos os lugares)

**Regra:** Cada agregado deve ter seu próprio tipo de ID: `PedidoId`, `ClienteId`, `ProdutoId`, etc.

### Agregados (Aggregates) - A Cura para a Complexidade
Aqui é onde a maioria falha. Um Agregado é um **grupo de Entidades e Value Objects** que devem ser tratados como uma **única unidade transacional**.

*   **O Chefe (Agregado Raiz / Aggregate Root):** É a entidade principal que comanda o grupo.
*   **A Regra doAcesso:** Ninguém de fora pode mexer nos "filhos" do agregado diretamente. Só se fala com o Chefe.

**Exemplo Clássico: Pedido (Raiz) e ItemPedido (Filho)**
*   Errado: `itemPedidoRepository.delete(itemId)` (Mexendo no filho direto).
*   Certo: `pedido.removerItem(itemId)` (Pedindo ao chefe). O chefe recalcula o total do pedido e garante consistência.

**Versioning: Evitando Conflitos de Concorrência**
Quando dois usuários tentam modificar o mesmo agregado simultaneamente, você precisa detectar conflitos.

**O Problema:**
```
Usuário A: Carrega Pedido (versão 1)
Usuário B: Carrega Pedido (versão 1)
Usuário A: Modifica e salva (versão 2) ✅
Usuário B: Modifica e salva (versão 2) ❌ Sobrescreve mudanças de A!
```

**A Solução: Optimistic Locking com Version**

Cada agregado tem um campo `version` que incrementa a cada mudança:

```typescript
class AggregateRoot {
    public id: string;
    public version: number; // Inicia em -1, incrementa a cada evento
    
    // Ao salvar, verifica se a versão ainda é a mesma
}

// No repositório:
async save(aggregate: AggregateRoot): Promise<void> {
    const currentVersion = await this.getVersion(aggregate.id);
    
    if (currentVersion !== aggregate.version) {
        throw new ConcurrencyException("Aggregate was modified by another process");
    }
    
    await this.update(aggregate, aggregate.version + 1);
}
```

**Vantagens:**
- Detecta conflitos antes de sobrescrever dados
- Não bloqueia leituras (diferente de locks pessimistas)
- Funciona bem com Event Sourcing (cada evento incrementa a versão)

**Quando usar:**
- Agregados que podem ser modificados concorrentemente
- Sistemas com alta concorrência
- Quando você precisa detectar "stale data"

---

## 3. As Regras de Ouro para Não Cair em Armadilhas

### Regra #1: Referencie Outros Agregados POR ID, NUNCA por Objeto.
Essa é a regra que evita o "Loop Infinito de Mapeamento".

**Cenário:** Um `Pedido` pertence a um `Cliente`.
*   **Jeito Errado (ORM Style):**
    ```typescript
    class Pedido {
        cliente: Cliente; // Perigo! Mapeamento recursivo.
    }
    ```
*   **Jeito Certo (DDD Style):**
    ```typescript
    class Pedido {
        clienteId: ClienteId; // Seguro. Desacoplado. E tipado!
    }
    ```
Isso força você a carregar apenas o que precisa. O `Pedido` não precisa saber o endereço do `Cliente` para calcular seu próprio total. Se precisar do nome do cliente para um relatório, crie uma query específica (fora do domínio) ou carregue o cliente separadamente.

**Nota:** Use Strongly Typed IDs (como `ClienteId`) ao invés de `string` para evitar passar IDs errados.

### Regra #2: Repositórios Apenas para Agregados Raiz
Não crie Repositórios para tudo.
*   `PedidoRepository`: **SIM**. Pedido é Raiz.
*   `ItemPedidoRepository`: **NÃO**. Item é interno do Pedido.
*   `EnderecoRepository`: **NÃO**. Endereço é Value Object do Cliente.

Se você tem 50 tabelas, você deveria ter talvez uns 10 ou 12 Repositórios. Se tiver 50 Repositórios, você não achou seus Agregados corretamente.

### Regra #3: Transaction per Request (Consistência Eventual)
Tente alterar **apenas um Agregado por Transação**.
Se o "Cliente" muda de endereço e isso afeta a "Entrega", não tente mudar os dois na mesma transação de banco dentro do mesmo Service.
1.  Service altera Cliente -> Salva.
2.  Cliente dispara evento `EnderecoAlterado`.
3.  Outro handler ouve o evento e atualiza a Entrega.

Isso diminui a complexidade do código e o tempo de bloqueio do banco.

---

## 4. Onde colocar a lógica?

### Domain Services vs. Application Services

*   **Entidade:** Lógica que só depende dos dados daquela entidade. (`pedido.calcularTotal()`)
*   **Domain Service:** Lógica que envolve múltiplas entidades de domínio. (`calculadoraImposto.calcular(pedido, regrasFiscais)`)
*   **Application Service (Use Case):** O regente da orquestra. Ele não tem regra de negócio. Ele só:
    1.  Busca no Repositório.
    2.  Chama a Entidade/Domain Service.
    3.  Salva no Repositório.
    4.  Envia Email / Loga.

**Seu Application Service está "Gordo"?** Ele provavelmente está roubando regras que deveriam estar na Entidade ou num Domain Service.

### Business Rules: Encapsulando Regras de Negócio

Ao invés de espalhar `if/else` dentro dos métodos das entidades, você pode encapsular cada regra de negócio em uma classe que implementa `IBusinessRule`.

**Estrutura:**
```typescript
interface IBusinessRule {
    isBroken(): boolean;
    message: string;
}
```

**Exemplo:**
```typescript
class MeetingMustHaveAtLeastOneHostRule implements IBusinessRule {
    constructor(private meetingHostNumber: number) {}
    
    isBroken(): boolean {
        return this.meetingHostNumber === 0;
    }
    
    get message(): string {
        return "Meeting must have at least one host";
    }
}

// Uso na entidade:
class Meeting extends AggregateRoot {
    adicionarHost(memberId: MemberId) {
        // ... lógica ...
        CheckRule(new MeetingMustHaveAtLeastOneHostRule(this.hosts.length));
    }
}
```

**Vantagens:**
- Regras testáveis isoladamente
- Mensagens de erro claras e centralizadas
- Reutilização de regras em diferentes contextos
- Facilita a leitura do código (o nome da classe já explica a regra)

**Quando usar:**
- Regras que podem ser reutilizadas
- Regras complexas que merecem uma classe própria
- Quando você quer mensagens de erro específicas e testáveis

---

## 5. Quando NÃO usar DDD?

DDD tem um custo alto de abstração (Mappers, DTOs, Factories).
*   **CRUDs Simples:** Se o sistema é só "telas de cadastro", DDD é matar mosca com canhão. Use Active Record ou Services simples.
*   **Relatórios/Dashboards:** Não use suas Entidades de Domínio para ler dados para telas de Dashboard. Use SQL direto (CQRS - Query Side). O Domínio serve para **Escrita** (proteger regras), a Leitura pode ser direta no banco.

### CQRS: Por Que Separar Leitura e Escrita?

CQRS (Command Query Responsibility Segregation) não é só "ter dois modelos". É sobre **otimizar cada operação para seu propósito**.

#### Commands (Escrita)
- **Modelo:** Agregados ricos, com comportamento
- **Propósito:** Proteger invariantes, aplicar regras de negócio
- **Exemplo:** `CreatePedidoCommand` → Cria `Pedido` agregado

```typescript
// Write Model: Agregado rico
class Pedido extends AggregateRoot {
    adicionarItem(produto: Produto, quantidade: number) {
        CheckRule(new QuantidadeDeveSerPositivaRule(quantidade));
        // ... lógica complexa ...
    }
}
```

#### Queries (Leitura)
- **Modelo:** DTOs simples, otimizados para exibição
- **Propósito:** Retornar dados rapidamente, sem regras de negócio
- **Exemplo:** `GetPedidosQuery` → Retorna lista de `PedidoDto`

```typescript
// Read Model: DTO simples
class PedidoDto {
    id: string;
    clienteNome: string;
    total: number;
    status: string;
}

// Query direto no banco (sem passar pelo domínio)
async getPedidos(): Promise<PedidoDto[]> {
    return await db.query(`
        SELECT p.id, c.nome as clienteNome, p.total, p.status
        FROM pedidos p
        JOIN clientes c ON p.cliente_id = c.id
    `);
}
```

**Vantagens:**
- **Performance:** Queries otimizadas sem passar pelo domínio
- **Simplicidade:** Write model focado em regras, Read model focado em dados
- **Escalabilidade:** Pode escalar leitura e escrita separadamente

**Quando NÃO usar CQRS:**
- Sistemas CRUD simples (overhead desnecessário)
- Quando a consistência imediata é crítica (CQRS geralmente é eventual)

## Resumo da Sobrevivência

1.  Isso é Entidade ou Value Object?
2.  Quais Entidades morrem juntas? (Defina o Agregado).
3.  Quem é o Chefe? (Defina a Raiz).
4.  Crie Repositório só para o Chefe.
5.  Refira-se aos outros Chefes só pelo ID (e use Strongly Typed IDs!).
6.  Encapsule regras de negócio em Business Rules testáveis.
7.  Use Domain Events para desacoplar side effects.
8.  Separe leitura (Queries) de escrita (Commands) com CQRS.
9.  Use Outbox + Inbox Patterns para comunicação confiável entre módulos.
10. Mantenha tudo `private` por padrão, exponha apenas a API do agregado.
11. Use Decorators para cross-cutting concerns (logging, validação, transações).
12. Considere Event Sourcing apenas se realmente precisar de auditoria completa ou time travel.

---

## 6. O Fluxo da Vida: Memória vs. Banco (Sua dúvida sobre "Timeline")

Essa é a dúvida de ouro: *"Quando eu salvo? Passo ID ou Objeto? Quem salva?"*

### A Regra Fundamental: "Unit of Work" (Unidade de Trabalho)

No DDD, uma **Transação de Negócio (Use Case)** deve ser atômica. Ou tudo acontece, ou nada acontece.

#### O Fluxo Correto (Happy Path)

1.  **Início do UseCase:** O Application Service acorda.
2.  **Carregamento:** O Service pede ao Repositório: `const pedido = await repo.findById(id)`.
    *   A partir de agora, o objeto `pedido` está viva na **Memória RAM**.
3.  **A Dança das Alterações (Timeline):**
    *   Você chama métodos do `pedido`.
    *   Você passa o `pedido` (o objeto mesmo!) para um Domain Service: `calculadoraFrete.calcular(pedido)`.
    *   O Domain Service altera propriedades do `pedido` **na memória**.
    *   Você chama mais métodos: `pedido.confirmar()`.
4.  **O "Grand Finale" (Persistência):**
    *   Só agora, no finalzinho do método do Service, você chama: `await repo.save(pedido)`.
    *   O Repositório olha para o objeto e salva as mudanças no banco.

#### Unit of Work: O Coordenador de Transações

O Unit of Work é responsável por:
1. Coordenar a transação de banco de dados
2. Despachar Domain Events após o commit
3. Salvar eventos na Outbox (se necessário)

**Fluxo Completo:**

```typescript
class UnitOfWorkCommandHandlerDecorator<T> {
    async handle(command: T): Promise<void> {
        // 1. Executa o command handler
        await this.decorated.handle(command);
        
        // 2. Commit da transação (salva agregados + outbox)
        await this.unitOfWork.commit();
        
        // 3. Despacha Domain Events (após commit bem-sucedido)
        await this.domainEventsDispatcher.dispatch();
    }
}
```

**Por que despachar eventos APÓS o commit?**
- Se o commit falhar, não queremos eventos sendo processados
- Garante que os dados estão persistidos antes de notificar outros módulos
- Evita processar eventos de transações que foram rollback

**Regra:** Sempre despache eventos **depois** do commit, nunca antes.

### Decorator Pattern: Cross-Cutting Concerns

Cross-cutting concerns (logging, validação, transações) não devem poluir seus Command Handlers. Use o **Decorator Pattern** para envolvê-los.

**O Problema:**
```typescript
class CreatePedidoHandler {
    async handle(command: CreatePedidoCommand) {
        // Logging
        console.log(`Executing ${command.name}`);
        
        // Validação
        if (!command.clienteId) throw new Error("...");
        
        // Lógica de negócio
        const pedido = Pedido.create(...);
        await repo.save(pedido);
        
        // Logging de novo
        console.log("Command processed");
    }
}
```

**A Solução: Decorators**

```typescript
// Handler puro (só lógica de negócio)
class CreatePedidoHandler {
    async handle(command: CreatePedidoCommand) {
        const pedido = Pedido.create(...);
        await repo.save(pedido);
    }
}

// Decorators para cross-cutting concerns
class LoggingDecorator<T> {
    constructor(private handler: ICommandHandler<T>) {}
    
    async handle(command: T) {
        console.log(`Executing ${command.constructor.name}`);
        await this.handler.handle(command);
        console.log("Command processed");
    }
}

class ValidationDecorator<T> {
    constructor(private handler: ICommandHandler<T>) {}
    
    async handle(command: T) {
        this.validate(command); // Validação genérica
        await this.handler.handle(command);
    }
}

// Composição (via IoC Container)
const handler = new LoggingDecorator(
    new ValidationDecorator(
        new UnitOfWorkDecorator(
            new CreatePedidoHandler()
        )
    )
);
```

**Vantagens:**
- Handlers focados apenas em lógica de negócio
- Cross-cutting concerns reutilizáveis
- Fácil adicionar/remover comportamentos (ex: adicionar métricas)
- Testes mais simples (testa handler isolado, sem decorators)

**Quando usar:**
- Logging, validação, transações, métricas, autorização
- Qualquer comportamento que se aplica a múltiplos handlers

#### Perguntas Respondidas:

**Q: A Entidade pode salvar no banco? (`entity.save()`)**
**R: NÃO.** Isso é o padrão "Active Record" (comum no Laravel/Rails, mas *não* é DDD puro). No DDD, a Entidade deve ser "ignorante" sobre bancos de dados. Ela não conhece SQL nem conexão. Só o Repositório sabe salvar.

**Q: Devo salvar a cada pequena mudança?**
**R: NÃO.** Se você salvar no meio e depois der erro, seu banco ficou inconsistente (metade feito). Salve tudo de uma vez no final. Se der erro na memória, nada foi pro banco. Perfeito.

**Q: Se o fluxo é longo, passo o OBJETO ou o ID?**
**R: Passe o OBJETO (Referência).**
*   **Por que não o ID?** Se você passar só o ID para a próxima função, ela vai ter que fazer `repo.findById(id)` de novo.
    *   Problema 1: Performance (duas queries à toa).
    *   Problema 2: **Perda de Dados!** A segunda query vai trazer o dado *do banco* (antigo), ignorando as mudanças que a primeira função fez *na memória* (novo) e ainda não salvou.

**Exemplo Visual:**

```typescript
// Jeito Errado (Re-fetching e Saves picados)
async function processarPedido(pedidoId: string) {
    const pedido = await repo.findById(pedidoId);
    pedido.validar();
    await repo.save(pedido); // Save prematuro

    // Passando ID... perigo!
    await serviceDeCalculo.calcular(pedidoId); // Vai buscar do banco de novo?
    
    // Se o serviceDeCalculo mudou algo e salvou,
    // o meu objeto 'pedido' aqui nessa variável ficou desatualizado!
}

// Jeito Certo (Passando a Bola)
async function processarPedido(pedidoId: string) {
    // 1. Carrega UMA vez
    const pedido = await repo.findById(pedidoId);

    // 2. Modifica na memória (quantas vezes quiser)
    pedido.validar(); // muda estado interno
    
    // 3. Passa a Referência (ponteiro da memória)
    // O service mexe no MESMO objeto que está na minha mão
    serviceDeCalculo.calcular(pedido); 
    
    pedido.finalizar(); // muda estado interno

    // 4. Salva UMA vez no final
    await repo.save(pedido);
}
```

### Resumo do Fluxo

1.  **Carregue no começo** (Unidade de Trabalho começa).
2.  **Passe o objeto** para quem precisar (Services, Helpers). Todos mexem na mesma instância em memória.
3.  **Não salve picado**.
4.  **Salve no fim** (Commit da Transação).

---

## 7. O Mito da Correspondência (Entity == Table?)

**Ter um mapeamento 1-para-1 não é pecado.** O pecado é não saber *por que* ele é 1-para-1.

O problema real é o **"Table Driven Design"** (Desenhar o banco primeiro e criar classes que espelham tabelas).

### Como analisar se deve ou não ser 1-para-1?

Use a regra do **"Comportamento vs. Armazenamento"**.

#### Cenário 1: Quando 1 Tabela vira 2 Entidades (Divisão de Responsabilidade)
Imagine uma tabela usuários gigante (`users`) com 50 colunas.
*   Tem dados de Login (email, senha, 2fa).
*   Tem dados de Perfil (bio, avatar, links).
*   Tem dados de Preferências (tema, notifs).

**Análise DDD:**
O comportamento "Logar" muda junto com o comportamento "Editar Bio"? Não.
São ciclos de vida diferentes.

**Modelagem Ideal:**
*   **Tabela:** `users` (1 tabela só, por performance/normalização).
*   **Entidades:**
    *   `Credenciais` (ID, email, passwordHash) -> Usado na Autenticação.
    *   `Perfil` (ID, bio, avatar) -> Usado na Edição de Perfil.
    *   `Preferencias` (ID, theme) -> Usado no menu de configs.

**O Repositório faz a mágica:**
`credenciaisRepo.save(cred)` -> Faz update só nas colunas de login da tabela `users`.
`perfilRepo.save(perf)` -> Faz update só nas colunas de perfil da tabela `users`.

#### Cenário 2: Quando 2 Tabelas viram 1 Entidade (Agrupamento Lógico)
Imagine que, por performance de banco, seu DBA separou `produtos` e `produtos_detalhes_tecnicos` (porque a segunda é um CLOB pesado e raramente lido).

**Análise DDD:**
Para o negócio, "Detalhe Técnico" existe sem Produto? Não. Eu vendo o Produto sem os detalhes? Talvez não.

**Modelagem Ideal:**
*   **Entidade:** `Produto` (contém uma propriedade `detalhes`).
*   **Tabelas:** `produtos`, `produtos_detalhes`.

**O Repositório faz a mágica:**
`repo.save(produto)` -> Faz insert/update nas DUAS tabelas numa transação só. O domínio nem sabe que o banco separou em duas.

### A pergunta de Ouro

Para saber se você caiu na armadilha:
> *"Se eu mudar o nome dessa COLUNA no banco, eu sou obrigado a renomear a PROPRIEDADE na minha classe?"*

*   Se a resposta for **"Sim, porque uso um ORM que espelha tudo"**, você está acoplado (Table Driven).
*   Se a resposta for **"Não, eu posso manter a propriedade com nome bonito e só mudar o mapeamento no Repositório"**, parabéns! Você desenhou uma Entidade.

**Resumo:**
*   Se a Entidade e a Tabela são iguais, que seja por **Coincidência**, não por **Preguiça**.
*   Desenhe a Entidade pensando em **como ela age**.
*   Desenhe a Tabela pensando em **como ela guarda**.
*   O Repositório (e os Mappers) são a ponte que permite que esses dois mundos sejam diferentes.

---

## 8. O Quarteto Fantástico: Entidade, Model, Mapper e Repository

Aqui estão as regras de etiqueta para esses componentes conviverem em harmonia.

### A Regra do Retorno (O que sai do Repositório?)
O Repositório é a fronteira final do seu domínio.
*   **Entra:** ID (para busca) ou Entidade (para salvar).
*   **Sai:** Entidade (sempre!).
*   **Nunca:** O Repositório **NUNCA** deve retornar um "Model do Banco" (tipo do TypeORM/Drizzle/Prisma). Quem chama o repositório (o Service) não pode saber que existe banco de dados.

### Mappers: As Fronteiras Puras
O Mapper é o tradutor. Ele pega o "Dialeto do Banco" e traduz para o "Idioma do Domínio".

1.  **Manual ou Automático?** Sempre use classes/funções mapper EXPLÍCITAS. Não faça `const entity = new Entity(model.data)` espalhado dentro dos métodos do repositório.
    *   *Por que?* Se a estrutura do banco mudar, você quer alterar só o arquivo `UsuarioMapper.ts`, e não caçar em 15 métodos do `UsuarioRepository`.

2.  **Mapper pode chamar Repositório? (Dependência Cíclica)**
    *   **JAMAIS.** Essa é uma regra de ouro. Mappers devem ser **Funções Puras**.
    *   Entra Dados -> Sai Objeto. Sem side-effects, sem banco.
    *   *Se precisar de dados extras?* Eles devem ser passados como parâmetros para o Mapper. Quem busca os dados extras é o Repositório, antes de chamar o Mapper.

### Assinaturas de Métodos (O Padrão Ouro)

**1. Buscas (Queries): Entra ID/Critério -> Sai Entidade**
```typescript
// Certo
async findById(id: string): Promise<Cliente | null>

// Errado (Vazamento de infraestrutura)
async findById(id: string): Promise<ClienteModel> 
```

**2. Persistência (Commands): Entra Entidade -> Sai Void (ou Result)**
```typescript
// Opção A: Clássica (Java/Node)
async save(cliente: Cliente): Promise<void> // Lança exceção se falhar

// Opção B: Result Pattern (Rust/Functional DNA)
async save(cliente: Cliente): Promise<Result<void, DatabaseError>>
```
*   **Por que Void/Result?** Se o método terminou sem erro, significa sucesso.
*   **Por que não Boolean?** `true/false` esconde o *motivo* do erro. 
    *   No modelo **Exceção**: O fluxo é cortado e o erro sobe (fácil de ler, mas "invisível" na tipagem).
    *   No modelo **Result (Rust)**: O erro é retornado como valor e você é *obrigado* a tratar (mais seguro, mas mais verboso).
    *   **Ambos são válidos.** O pecado é retornar `false` e deixar quem chamou adivinhar se foi "banco fora do ar" ou "email duplicado".
*   **Por que não retornar a Entidade atualizada?** O objeto que você passou `save(cliente)` **é a referência em memória**. Se o repositório atualizou o ID ou `updatedAt`, ele deve setar esses valores **na própria instância** que recebeu. Não precisa retornar uma nova.

**3. O Mito do "Insert vs Update"**
Para o mundo de fora (Service), não deve existir diferença.
O método se chama `save(entidade)`.
*   Dentro do repositório:
    *   Se tem ID -> `UPDATE ...`
    *   Se não tem ID -> `INSERT ...`
O Service não precisa saber dessa decisão. Ele só quer "Salvar o estado atual".

### Fluxo Completo Recomendado

1.  **Repo:** Faz query no Banco -> Recebe `Model` (JSON do banco).
2.  **Repo:** Chama `Mapper.toDomain(model)`.
3.  **Mapper:** Instancia `new Entidade(...)`. Retorna Entidade.
4.  **Repo:** Retorna Entidade para o Service.

*(Service usa, muda, altera a Entidade)*

5.  **Service:** Chama `Repo.save(entidade)`.
6.  **Repo:** Chama `Mapper.toPersistence(entidade)`.
7.  **Mapper:** Retorna objeto simples (JSON) pronto pro banco.
8.  **Repo:** Executa query SQL de Insert/Update.

---

## 9. Os "Metadados" (ID, CreatedAt) são do Domínio?

Ver campos de banco na classe de domínio acende um alerta. Mas calma:

### 1. O ID é obrigatório (Identidade)
*   Como vimos, Entidades **precisam** de Identidade.
*   Então sim, sua Entidade **TEM** que ter um `id`.
*   Sem ID, ela seria um Value Object.
*   *Dica:* Prefira UUIDs gerados pela aplicação a IDs numéricos gerados pelo banco. Isso permite que você crie a entidade completa (já com ID) antes mesmo de tocar no banco.
*   *Dica Avançada:* Use Strongly Typed IDs (`PedidoId`, `ClienteId`) ao invés de `string` ou `Guid` primitivos. Isso evita erros de passar IDs errados e torna o código mais autodocumentado.

### 2. CreatedAt e UpdatedAt (Auditoria vs. Regra)
Aqui a linha é tênue:

*   **Pode ter?** Sim.
*   **Quando faz sentido no Domínio?**
    *   Saber há quanto tempo o pedido está aberto (`now() - createdAt > 2 dias`).
    *   Ordenar a lista de clientes por "mais recentes".
    *   Se o negócio **UZA** essa data para tomar decisão, ela **É DO DOMÍNIO**.
*   **Quando é só "Sujeira do Banco"?**
    *   Campos como `deleted_at` (Soft Delete), `version` (Optimistic Locking) ou `last_modified_by_ip`.
    *   Esses campos técnicos muitas vezes não interessam ao negócio. O Repositório pode lidar com eles de forma transparente (escondida), sem poluir sua classe `Cliente`.

### Conclusão
Ter `id`, `createdAt` e `updatedAt` na Entidade é **Comum e Aceitável** em 99% dos casos. É o "preço a pagar" para não ter que criar uma classe de metadados separada. Não é isso que caracteriza o "erro de espalhamento de tabela".

O erro é ter `fk_usuario_id`, `campo_auxiliar_desnormalizado` ou `flag_controle_interno_do_banco` na sua Entidade.

---

## 10. Domain Events: O Fim do Service "Faça Tudo"

Um erro clássico é o Service crescer eternamente.
*   `userService.create()`: Salva usuário.
*   ...aí tem que mandar email de boas vindas.
*   ...aí tem que criar carteira de pontos.
*   ...aí tem que notificar o Slack do admin.

O Service vira um pesadelo procedural.

**A Solução: Domain Events (Eventos de Domínio)**

1.  **A Entidade Grita:** Quando algo importante acontece, a Entidade não chama serviços externos (ela não pode!). Ela apenas diz "Ei, aconteceu X!".
    ```typescript
    class Usuario {
        registrar() {
            // ... muda estado interno ...
            this.addDomainEvent(new UsuarioRegistradoEvent(this.id));
        }
    }
    ```
2.  **O Repositório Despacha:** Ao salvar o usuário, o repositório (ou uma camada de infra) coleta esses eventos e os publica.
3.  **Handlers Ouvem:**
    *   `EmailHandler` ouve `UsuarioRegistrado` -> Manda Email.
    *   `WalletHandler` ouve `UsuarioRegistrado` -> Cria Carteira.

**Vantagem:** Seu UseCase (Service) volta a ter 3 linhas. Ele só sabe "Salvar Usuário". O resto do sistema reage a esse fato. (Isso é o tal "Side Effect" desacoplado).

### Domain Events vs Integration Events

Nem todo evento é igual. Existem dois tipos com propósitos diferentes:

#### Domain Events (Eventos de Domínio)
- **Escopo:** Dentro do mesmo Bounded Context/Módulo
- **Propósito:** Notificar outros agregados do mesmo contexto sobre algo que aconteceu
- **Exemplo:** `PedidoConfirmadoEvent` (dentro do módulo de Pedidos)

```typescript
// Dentro do módulo de Pedidos
class Pedido {
    confirmar() {
        // ... lógica ...
        this.addDomainEvent(new PedidoConfirmadoEvent(this.id));
    }
}

// Handler no mesmo módulo
class AtualizarEstoqueHandler {
    handle(event: PedidoConfirmadoEvent) {
        // Atualiza estoque no mesmo módulo
    }
}
```

#### Integration Events (Eventos de Integração)
- **Escopo:** Entre Bounded Contexts/Módulos diferentes
- **Propósito:** Notificar outros módulos sobre algo que aconteceu
- **Exemplo:** `PedidoConfirmadoIntegrationEvent` (para o módulo de Envios)

```typescript
// No módulo de Pedidos
class PedidoConfirmadoIntegrationEvent {
    constructor(
        public readonly pedidoId: string,
        public readonly clienteId: string,
        public readonly ocorredOn: Date
    ) {}
}

// No módulo de Envios (outro contexto)
class CriarEnvioHandler {
    handle(event: PedidoConfirmadoIntegrationEvent) {
        // Cria envio em outro módulo
    }
}
```

**Diferenças:**

| Aspecto | Domain Event | Integration Event |
|---------|-------------|------------------|
| **Escopo** | Mesmo contexto | Entre contextos |
| **Estrutura** | Pode ter referências internas | Deve ser serializável e estável |
| **Mudanças** | Pode mudar com o domínio | Deve ser estável (versionamento) |
| **Entrega** | Síncrona (dentro da transação) | Assíncrona (via Outbox) |

**Regra de Ouro:**
- Domain Events: Use para comunicação dentro do mesmo módulo
- Integration Events: Use para comunicação entre módulos (via Outbox)

### Outbox Pattern: Garantindo Entrega de Eventos

Quando você publica eventos para outros módulos/contextos, como garantir que o evento foi entregue mesmo se o sistema cair?

**O Problema:**
1. Você salva o agregado no banco
2. Você publica o evento
3. Sistema cai antes de publicar → Evento perdido!

**A Solução: Outbox Pattern**

1. **Salvar evento na mesma transação do agregado:**
   ```typescript
   // Dentro da mesma transação
   await repository.save(pedido);
   await outbox.add(new PedidoCriadoEvent(pedido.id)); // Salva na tabela Outbox
   await transaction.commit(); // Ambos salvos juntos!
   ```

2. **Processar Outbox em background:**
   - Um worker lê eventos da tabela `Outbox` que ainda não foram processados
   - Publica cada evento no Event Bus
   - Marca como processado

**Fluxo:**
```
[Command Handler]
    ↓
[Salva Agregado + Evento na Outbox] (mesma transação)
    ↓
[Commit]
    ↓
[Background Worker]
    ↓
[Lê Outbox → Publica Evento → Marca como processado]
```

**Vantagens:**
- **At-Least-Once Delivery:** Garante que o evento será entregue (mesmo que precise reprocessar)
- **Transacional:** Se o agregado salvar, o evento também está salvo
- **Resiliência:** Se o Event Bus cair, os eventos ficam na Outbox esperando

**Quando usar:**
- Comunicação entre módulos/contextos diferentes
- Quando a entrega do evento é crítica
- Sistemas distribuídos ou microserviços

### Inbox Pattern: Garantindo Processamento de Eventos Recebidos

O Outbox garante que você **envie** eventos. O Inbox garante que você **processe** eventos recebidos de outros módulos.

**O Problema:**
1. Você recebe um Integration Event de outro módulo
2. Você processa o evento (chama um Command)
3. Sistema cai durante o processamento → Evento pode ser perdido ou processado duas vezes!

**A Solução: Inbox Pattern**

1. **Salvar evento recebido na Inbox:**
   ```typescript
   // Quando recebe Integration Event
   await inbox.add(new PedidoCriadoIntegrationEvent(...)); // Salva na tabela Inbox
   await transaction.commit();
   ```

2. **Processar Inbox em background:**
   - Um worker lê eventos da tabela `Inbox` que ainda não foram processados
   - Para cada evento, chama o Command Handler correspondente
   - Marca como processado (ou marca erro se falhar)

**Fluxo:**
```
[Integration Event Recebido]
    ↓
[Salva na Inbox] (mesma transação)
    ↓
[Background Worker]
    ↓
[Lê Inbox → Processa Command → Marca como processado]
```

**Vantagens:**
- **At-Least-Once Processing:** Garante que o evento será processado (mesmo que precise reprocessar)
- **Idempotência:** Pode verificar se já processou antes de processar novamente
- **Resiliência:** Se o processamento falhar, o evento fica na Inbox para retry

**Outbox + Inbox = Comunicação Confiável**
- **Outbox:** Garante que você **envie** eventos
- **Inbox:** Garante que você **processe** eventos recebidos
- Juntos, garantem comunicação confiável entre módulos

---

## 11. Factories: O Nascimento de um Gigante

Quando seu Agregado fica complexo (`Pedido` que precisa de `Itens`, `Endereco`, `Cliente`, `RegrasFiscal`), instanciar ele com `new Pedido(...)` fica horrível e perigoso.

**O Problema do Constructor:**
*   Você espalha lógica de criação em 10 lugares diferentes do sistema.
*   Se a regra de criação mudar ("Pedido agora exige Documento"), quebra 10 lugares.

**A Solução: Factories (Fábricas)**
A Factory é uma classe pura que só serve para montar Agregados complexos.
*   Ela recebe os "ingredientes brutos" (DTOs, inputs).
*   Ela valida as regras de **construção** (Ex: "Não pode criar pedido sem itens").
*   Ela devolve o Agregado pronto e válido.

**Regra:** Se o `new Entidade()` tem mais de 3 argumentos ou exige lógica (if/else), crie uma Factory. Deixe o Constructor da entidade protegido/privado se possível.

---

## 12. Encapsulamento: Private by Default

No DDD, o encapsulamento é **crítico**. Tudo deve ser `private` por padrão, e só expor o mínimo necessário.

**Regra de Ouro:**
- **Private:** Campos e métodos internos
- **Internal/Protected:** Acesso dentro do mesmo assembly/módulo (para testes)
- **Public:** Apenas a API do agregado (métodos de comando)

**Exemplo:**
```typescript
class Pedido extends AggregateRoot {
    // ✅ Private: Estado interno
    private _itens: ItemPedido[];
    private _status: StatusPedido;
    
    // ✅ Public: API do agregado
    public adicionarItem(produto: Produto, quantidade: number): void {
        // Lógica aqui
    }
    
    // ❌ NUNCA: Getters públicos que expõem coleções mutáveis
    // public get itens(): ItemPedido[] { return this._itens; }
    
    // ✅ Se precisar ler: Retorne cópia ou DTO
    public getItens(): ReadonlyArray<ItemPedidoDto> {
        return this._itens.map(item => item.toDto());
    }
}
```

**Por quê?**
- Protege invariantes (ninguém pode modificar diretamente)
- Facilita refatoração (mudanças internas não quebram código externo)
- Torna o código autodocumentado (só o que é público importa)

**Erro Comum:** Expor coleções mutáveis através de getters. Se você retornar `this._itens` diretamente, alguém pode fazer `pedido.itens.push(novoItem)` e quebrar suas invariantes.

---

## 13. Bounded Contexts e Modularidade

Um **Bounded Context** é uma fronteira onde um modelo de domínio específico se aplica. Cada contexto tem sua própria linguagem ubíqua e seus próprios agregados.

**Exemplo:**
- **Contexto de Pedidos:** `Pedido`, `ItemPedido`, `Cliente` (como comprador)
- **Contexto de Envios:** `Envio`, `Endereco`, `Cliente` (como destinatário)

O mesmo conceito (`Cliente`) tem significados diferentes em cada contexto!

**Comunicação entre Contextos:**
- **NUNCA:** Referências diretas entre agregados de contextos diferentes
- **SEMPRE:** Via Integration Events (assíncrono) ou IDs (síncrono quando necessário)

**Modularização:**
Cada módulo deve ser:
- **Autônomo:** Pode evoluir independentemente
- **Encapsulado:** Expõe apenas interface (Commands/Queries)
- **Isolado:** Não compartilha dados diretamente com outros módulos

**Vantagens:**
- Equipes podem trabalhar em módulos diferentes sem conflitos
- Cada módulo pode ter seu próprio banco de dados (se necessário)
- Facilita evolução e manutenção
- Reduz acoplamento entre partes do sistema

---

## 14. Event Sourcing: O Próximo Nível (Opcional)

**Atenção:** Event Sourcing é um padrão **avançado** que adiciona complexidade significativa. Use apenas se realmente precisar.

### O Que É Event Sourcing?

Ao invés de salvar o **estado atual** do agregado, você salva a **sequência de eventos** que levou aquele estado.

**Modelo Tradicional (State-Based):**
```
Pedido (estado atual)
├── id: "123"
├── status: "Confirmado"
├── total: 100.00
└── itens: [...]
```

**Event Sourcing:**
```
Stream de Eventos do Pedido "123"
├── PedidoCriadoEvent (id: 123, clienteId: 456)
├── ItemAdicionadoEvent (produtoId: 789, quantidade: 2)
├── ItemAdicionadoEvent (produtoId: 101, quantidade: 1)
└── PedidoConfirmadoEvent (total: 100.00)
```

Para obter o estado atual, você **replay** todos os eventos:
```typescript
const pedido = new Pedido();
pedido.load(events); // Aplica cada evento na ordem
// Agora pedido tem o estado atual
```

### Quando Usar Event Sourcing?

**Use quando:**
- Precisa de **auditoria completa** (saber exatamente o que aconteceu e quando)
- Precisa de **time travel** (ver estado do agregado em qualquer ponto no tempo)
- Tem **regras complexas** que mudam frequentemente (fácil adicionar novos eventos)
- Precisa de **replay** para debugging ou análise

**NÃO use quando:**
- Sistema simples (overhead desnecessário)
- Performance é crítica (replay de muitos eventos é lento)
- Não precisa de auditoria detalhada
- Equipe não tem experiência com o padrão

### Desafios do Event Sourcing

1. **Performance:** Replay de muitos eventos pode ser lento (use Snapshots)
2. **Complexidade:** Mais complexo que modelo tradicional
3. **Eventual Consistency:** Projeções são eventualmente consistentes
4. **Versionamento:** Mudanças em eventos antigos são complicadas

### Alternativa: Event Sourcing Híbrido

Você pode usar Event Sourcing apenas em **partes críticas** do sistema (ex: módulo de Pagamentos) e modelo tradicional no resto. Não precisa ser tudo ou nada.

**Resumo:** Event Sourcing é poderoso, mas complexo. Use com cuidado e apenas quando os benefícios justificarem o custo.

### Factories: Exemplos Práticos

#### Factory Simples (Static Method)
```typescript
class MoneyValue extends ValueObject {
    static of(value: number, currency: string): MoneyValue {
        CheckRule(new ValueOfMoneyMustNotBeNegativeRule(value));
        return new MoneyValue(value, currency);
    }
}
```

#### Factory Complexa (Classe Separada)
```typescript
class PriceListFactory {
    static async create(connection: IDbConnection): Promise<PriceList> {
        // Busca dados do banco
        const items = await this.getPriceListItems(connection);
        
        // Aplica estratégia de pricing
        const strategy = new DirectValueFromPriceListPricingStrategy(items);
        
        // Cria agregado complexo
        return PriceList.create(items, strategy);
    }
}
```

**Quando criar uma Factory separada:**
- Quando a criação envolve lógica complexa (múltiplos passos)
- Quando precisa buscar dados externos (banco, APIs)
- Quando a criação envolve múltiplos objetos relacionados
- Quando você quer testar a lógica de criação isoladamente
