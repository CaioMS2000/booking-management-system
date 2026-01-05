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

### Entidades (Entities)
*   **O que são:** Objetos que têm uma identidade única (ID) que persiste através do tempo, mesmo que seus atributos mudem.
*   **Exemplos:** `Usuario`, `Pedido`, `Produto`.
*   **Regra:** Dois usuários com o mesmo nome são pessoas diferentes se tiverem IDs diferentes.

### Agregados (Aggregates) - A Cura para a Complexidade
Aqui é onde a maioria falha. Um Agregado é um **grupo de Entidades e Value Objects** que devem ser tratados como uma **única unidade transacional**.

*   **O Chefe (Agregado Raiz / Aggregate Root):** É a entidade principal que comanda o grupo.
*   **A Regra doAcesso:** Ninguém de fora pode mexer nos "filhos" do agregado diretamente. Só se fala com o Chefe.

**Exemplo Clássico: Pedido (Raiz) e ItemPedido (Filho)**
*   Errado: `itemPedidoRepository.delete(itemId)` (Mexendo no filho direto).
*   Certo: `pedido.removerItem(itemId)` (Pedindo ao chefe). O chefe recalcula o total do pedido e garante consistência.

---

### A Confusão Entre Entidades, Value Objects e Agregados

**A pergunta que gera confusão:**
> "Se eu descubro que X na verdade faz parte de um agregado A, isso significa que X era um Value Object e eu só demorei pra perceber?"

**Resposta curta:** Não necessariamente! A confusão acontece porque as pessoas pensam que "Agregado" é um tipo diferente de objeto. **Mas não é.**

#### A Verdade Fundamental

```
Agregado NÃO é um tipo de classe.
Agregado É um CONCEITO que agrupa Entidades e VOs.

Agregado = Entidade Raiz + suas Entidades/VOs filhas
```

**Não existe `class Agregado`**. O que existe é:
- **Entidades** (algumas são raízes de agregados, outras são filhas)
- **Value Objects** (sempre partes de agregados, nunca raízes)
- **O CONCEITO de Agregado** (que é um grupo dessas coisas com fronteira transacional)

---

#### Exemplo Concreto: Desvendando Pedido

Vamos analisar se `ItemPedido` é Entidade ou Value Object:

```typescript
// ItemPedido - É Entidade ou VO?
class ItemPedido {
    produto: ProdutoId; // VO
    quantidade: number;
    preco: Money; // VO
}
```

**Fazendo as Perguntas Certas:**

**Pergunta 1:** Tem identidade única que persiste no tempo?
- Você precisa saber "qual item" remover? → **SIM** (preciso remover o item #3, não qualquer item)
- Dois itens com mesmo produto e quantidade são "o mesmo"? → **NÃO** (posso ter 2 linhas iguais no pedido)

**Pergunta 2:** Pode mudar sem virar "outro objeto"?
- Posso mudar a quantidade de 2 para 3 e continua sendo o mesmo item? → **SIM**

**Pergunta 3:** É imutável?
- Posso alterar propriedades? → **SIM** (quantidade pode mudar)

**Conclusão: ItemPedido É UMA ENTIDADE!**

```typescript
// ✅ ItemPedido como Entidade
class ItemPedido extends Entity {
    id: ItemPedidoId; // ✅ TEM ID = É Entidade
    produtoId: ProdutoId; // VO (referência a outro agregado)
    quantidade: number;
    preco: Money; // VO

    // ✅ Pode mudar estado = É Entidade
    alterarQuantidade(novaQuantidade: number): void {
        this.quantidade = novaQuantidade;
    }

    subtotal(): Money {
        return this.preco.multiplicar(this.quantidade);
    }
}
```

---

#### Por Que ItemPedido NÃO Pode Ser Value Object?

**Teste Prático: Tente fazer ItemPedido ser VO**

```typescript
// ❌ Se ItemPedido fosse VO (SEM ID):
class ItemPedido extends ValueObject {
    // ❌ Sem ID
    produtoId: ProdutoId;
    quantidade: number;
    preco: Money;
}

class Pedido extends AggregateRoot {
    itens: ItemPedido[]; // VOs

    // 🚨 PROBLEMA: Como eu sei QUAL item remover?
    removerItem(item: ItemPedido): void {
        // VOs são comparados por VALOR, não por identidade
        // Se você tem 2 itens iguais (mesmo produto, mesma qtd),
        // como saber qual deletar?
        const index = this.itens.indexOf(item); // ❌ Compara por valor
        this.itens.splice(index, 1); // Remove o primeiro que achar
    }

    // 🚨 PROBLEMA: Como alterar quantidade de UM item específico?
    alterarQuantidadeItem(item: ItemPedido, novaQtd: number): void {
        // ❌ Impossível! VOs são imutáveis!
        // Teria que deletar e criar um novo, mas qual deletar?
    }
}
```

**Com ItemPedido sendo Entidade (TEM ID):**

```typescript
// ✅ ItemPedido como Entidade (COM ID):
class Pedido extends AggregateRoot {
    itens: ItemPedido[]; // Entidades

    // ✅ Sei EXATAMENTE qual item remover pelo ID
    removerItem(itemId: ItemPedidoId): void {
        this.itens = this.itens.filter(item => !item.id.equals(itemId));
        this.recalcularTotal();
    }

    // ✅ Posso alterar quantidade de UM item específico
    alterarQuantidadeItem(itemId: ItemPedidoId, novaQtd: number): void {
        const item = this.itens.find(i => i.id.equals(itemId));
        if (item) {
            item.alterarQuantidade(novaQtd);
            this.recalcularTotal();
        }
    }
}
```

---

#### O Que É o AGREGADO então?

**Agregado é o GRUPO com fronteira transacional:**

```
┌─────────────────────────────────────────┐
│  AGREGADO "Pedido" (conceito, não classe)│
│                                         │
│  ┌─────────────────────────────┐       │
│  │ Pedido (Entidade Raiz)      │ ←─ Chefe
│  └─────────────────────────────┘       │
│           │                             │
│           ├── ItemPedido (Entidade)     │ ←─ Filha
│           ├── ItemPedido (Entidade)     │ ←─ Filha
│           ├── Endereco (VO)             │
│           └── ClienteId (VO)            │
│                                         │
└─────────────────────────────────────────┘
       ↓
  Salvo JUNTO na mesma transação
```

**Regras do Agregado:**
1. **Uma transação** altera apenas UM agregado
2. **Um repositório** apenas para o Raiz
3. **Acesso externo** apenas via Raiz (nunca direto aos filhos)

---

#### Exemplo Completo: E-commerce

```typescript
// ==========================================
// AGREGADO 1: Pedido
// ==========================================

// Raiz do Agregado (Entidade)
class Pedido extends AggregateRoot {
    id: PedidoId; // VO (Strongly Typed ID)
    clienteId: ClienteId; // VO - Referência a OUTRO agregado
    itens: ItemPedido[]; // ✅ Entidades filhas (parte deste agregado)
    endereco: Endereco; // VO (parte deste agregado)
    total: Money; // VO

    // ✅ Só a RAIZ pode adicionar itens
    adicionarItem(produtoId: ProdutoId, quantidade: number, preco: Money): void {
        const item = ItemPedido.criar(produtoId, quantidade, preco);
        this.itens.push(item);
        this.recalcularTotal(); // Mantém invariante
    }

    // ✅ Só a RAIZ pode remover itens
    removerItem(itemId: ItemPedidoId): void {
        this.itens = this.itens.filter(i => !i.id.equals(itemId));
        this.recalcularTotal(); // Mantém invariante
    }

    private recalcularTotal(): void {
        // Invariante: total sempre correto
        this.total = this.itens.reduce(
            (acc, item) => acc.somar(item.subtotal()),
            Money.zero()
        );
    }
}

// Entidade FILHA (parte do Agregado Pedido, NÃO é raiz)
class ItemPedido extends Entity {
    id: ItemPedidoId; // ✅ TEM ID = É Entidade
    produtoId: ProdutoId; // VO - Referência a OUTRO agregado (Produto)
    quantidade: number;
    precoUnitario: Money; // VO

    subtotal(): Money {
        return this.precoUnitario.multiplicar(this.quantidade);
    }

    // ✅ Pode mudar estado (mas só via Pedido.alterarQuantidadeItem)
    alterarQuantidade(novaQuantidade: number): void {
        this.quantidade = novaQuantidade;
    }
}

// Value Object (parte do Agregado Pedido)
class Endereco extends ValueObject {
    rua: string;
    numero: string;
    cidade: string;

    // ❌ NÃO tem ID
    // ❌ NÃO tem métodos que mudam estado
    // ✅ É imutável (se mudar, cria um novo Endereco)
}

// ==========================================
// AGREGADO 2: Cliente (SEPARADO do Pedido)
// ==========================================

class Cliente extends AggregateRoot {
    id: ClienteId; // VO
    nome: string;
    endereco: Endereco; // VO (pode ser o mesmo tipo, mas é cópia)
}

// ==========================================
// AGREGADO 3: Produto (SEPARADO)
// ==========================================

class Produto extends AggregateRoot {
    id: ProdutoId; // VO
    nome: string;
    preco: Money; // VO
}
```

**Repositórios (apenas para Raízes):**
```typescript
// ✅ Repositório para Raiz
class PedidoRepository {
    async save(pedido: Pedido): Promise<void> {
        // Salva Pedido + TODOS os ItemPedido na mesma transação
    }
}

// ✅ Repositório para Raiz
class ClienteRepository { /* ... */ }

// ✅ Repositório para Raiz
class ProdutoRepository { /* ... */ }

// ❌ NÃO EXISTE ItemPedidoRepository
// ItemPedido é acessado APENAS via Pedido
```

---

#### Quando Descobrir Que Há um Agregado Pai

**Cenário 1: X era VO e você pensou que era Entidade**

```typescript
// Antes (ERRADO):
class Endereco extends Entity {
    id: EnderecoId; // ❌ Não precisa de ID próprio!
    rua: string;
    numero: string;
}

// Repositório errado
class EnderecoRepository { /* ❌ */ }

// Depois (CERTO): Descobriu que Endereco é VO do Cliente
class Cliente extends AggregateRoot {
    id: ClienteId;
    nome: string;
    endereco: Endereco; // ✅ VO (não tem ID, é imutável)
}

class Endereco extends ValueObject { // ✅ Virou VO
    rua: string;
    numero: string;

    // Se mudar endereço, cria um novo Endereco
    // cliente.endereco = new Endereco("Rua Nova", "123")
}
```

**Cenário 2: X continua Entidade, mas virou FILHA**

```typescript
// Antes (ERRADO): Você tinha repositórios separados
class Pedido extends Entity { /* ... */ }
class ItemPedido extends Entity { /* ... */ }

// ❌ Repositórios separados (errado!)
class PedidoRepository { /* ... */ }
class ItemPedidoRepository { /* ... */ } // ❌ NÃO deveria existir

// Depois (CERTO): Descobriu que ItemPedido é FILHA de Pedido
class Pedido extends AggregateRoot {
    itens: ItemPedido[]; // ✅ Entidades filhas
}

class ItemPedido extends Entity {
    // ✅ Continua sendo Entidade (tem ID, muda estado)
    // ✅ Mas NÃO tem repositório próprio
    // ✅ Só é acessada via Pedido
}

// ✅ Apenas um repositório (para a Raiz)
class PedidoRepository {
    async save(pedido: Pedido): Promise<void> {
        // Salva Pedido + TODOS os ItemPedido juntos
    }
}
```

---

#### Checklist de Decisão

Use este fluxo para decidir:

**Passo 1: É Entidade ou VO?**

```
Tem ID único? ───┐
                 │
         NÃO ────┴──→ VALUE OBJECT
                 │
         SIM ────┴──→ ENTIDADE (vai para Passo 2)
```

**Passo 2: É Entidade Raiz ou Filha?**

```
Faz sentido existir sozinha, ────┐
fora do contexto da outra?       │
                                 │
                        NÃO ─────┴──→ ENTIDADE FILHA
                                 │    (parte de agregado)
                                 │
                        SIM ─────┴──→ ENTIDADE RAIZ
                                      (raiz de agregado)
```

**Passo 3: Regra da Consistência Transacional**

```
Se mudar X e Y, eles PRECISAM ────┐
ser salvos juntos?                │
                                  │
                         SIM ─────┴──→ MESMO AGREGADO
                                  │
                         NÃO ─────┴──→ AGREGADOS DIFERENTES
```

---

#### Resumo Visual

```
MUNDO DDD:

Value Objects              Entidades                    Agregados (conceito)
├─ Money                   ├─ Cliente (Raiz)            ┌─ AGREGADO "Cliente"
├─ Email                   ├─ Pedido (Raiz)             │  ├─ Cliente (Raiz)
├─ CPF                     ├─ Produto (Raiz)            │  └─ Endereco (VO)
├─ Endereco                └─ ItemPedido (Filha)        │
├─ ClienteId                                            ┌─ AGREGADO "Pedido"
└─ PedidoId                                             │  ├─ Pedido (Raiz)
                                                        │  ├─ ItemPedido (Entidade filha)
    ↑                           ↑                       │  ├─ ItemPedido (Entidade filha)
Sem ID                      Com ID                      │  ├─ Endereco (VO)
Imutável                    Mutável                     │  └─ ClienteId (VO)
Compara por valor           Compara por ID              │
                                                        └─ AGREGADO "Produto"
                                                           ├─ Produto (Raiz)
                                                           └─ Preco (VO)
```

---

#### Perguntas Práticas

**Q: "Tenho `Pedido` e `ItemPedido`. São agregados diferentes?"**
**R:** NÃO. São o MESMO agregado:
- `Pedido` = Raiz
- `ItemPedido` = Filha
- Salvos juntos, acessados juntos

**Q: "Tenho `Pedido` e `Cliente`. São agregados diferentes?"**
**R:** SIM. São agregados DIFERENTES:
- `Pedido` tem `clienteId: ClienteId` (VO, só referência)
- `Cliente` vive separado
- Salvos separadamente

**Q: "`Endereco` é sempre Value Object?"**
**R:** Depende do contexto:
- No `Cliente`: VO (parte do agregado Cliente)
- No `Pedido`: VO (parte do agregado Pedido)
- Contexto "Sistema de Logística": Poderia ser Entidade Raiz (com rotas, histórico)

**Q: "Como sei se criei os agregados certos?"**
**R:** Pergunte:
- Tenho 50 tabelas, mas apenas 10 repositórios? ✅ Provavelmente acertou
- Tenho 50 tabelas e 50 repositórios? ❌ Não encontrou os agregados
- Preciso salvar 3 entidades diferentes numa mesma transação sempre? ❌ Elas deveriam ser o mesmo agregado

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
        clienteId: ClienteId; // Seguro. Desacoplado.
    }
    ```
Isso força você a carregar apenas o que precisa. O `Pedido` não precisa saber o endereço do `Cliente` para calcular seu próprio total. Se precisar do nome do cliente para um relatório, crie uma query específica (fora do domínio) ou carregue o cliente separadamente.

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

## 4. Onde colocar a lógica? (Os 3 Tipos de Services)

### Entidade
Lógica que só depende dos dados daquela entidade.
*   **Exemplo:** `pedido.calcularTotal()`
*   **Quando usar:** Comportamento que pertence naturalmente àquela entidade
*   **Vive na camada:** Domain

### Domain Service (Regras de Negócio entre Agregados)
**TEM lógica de negócio**, mas não pertence a uma única entidade.
*   **Quando usar:** Operação envolve múltiplas entidades/agregados do mesmo domínio
*   **Exemplo:** `CalculadoraImpostoService.calcular(pedido, cliente, regrasFiscais)`
*   **Características:**
    *   Contém regras de negócio complexas
    *   Não tem estado (stateless)
    *   Opera sobre múltiplos agregados
*   **Vive na camada:** Domain

**Exemplo Prático:**
```typescript
// Domain Service - Contém regra de negócio
class CalculadoraFreteService {
    calcular(pedido: Pedido, endereco: Endereco, transportadora: Transportadora): Money {
        // Lógica de negócio que envolve 3 agregados diferentes
        // Não pertence a nenhum deles especificamente
        const distancia = this.calcularDistancia(endereco);
        const peso = pedido.calcularPesoTotal();
        const taxaBase = transportadora.obterTaxaBase();

        return new Money(distancia * peso * taxaBase);
    }
}

// Domain Service - Operação entre dois agregados
class TransferenciaEntreContasService {
    transferir(contaOrigem: Conta, contaDestino: Conta, valor: Money): void {
        // Regra de negócio que não pode estar em uma Conta só
        contaOrigem.debitar(valor);
        contaDestino.creditar(valor);

        // Emite evento de transferência realizada
        this.eventos.adicionar(new TransferenciaRealizadaEvent(...));
    }
}
```

### Application Service (Use Case)
**NÃO TEM lógica de negócio**. É o regente da orquestra que coordena o fluxo.
*   **Quando usar:** Coordenar um fluxo completo de negócio (um caso de uso)
*   **Responsabilidades:**
    1.  Busca no Repositório
    2.  Chama Entidade/Domain Service (onde estão as regras)
    3.  Salva no Repositório
    4.  Dispara eventos/notificações
*   **Características:**
    *   Sem regras de negócio (apenas orquestração)
    *   Gerencia transações
    *   Coordena múltiplos componentes
*   **Vive na camada:** Application

**Exemplo Prático:**
```typescript
// Application Service - Apenas orquestra
class CriarPedidoUseCase {
    async execute(command: CriarPedidoCommand): Promise<void> {
        // 1. Busca dados
        const cliente = await this.clienteRepo.findById(command.clienteId);
        const produtos = await this.produtoRepo.findByIds(command.produtoIds);

        // 2. Chama domínio (regras estão LÁ dentro)
        const pedido = Pedido.criar(cliente.id, produtos);

        // 3. Usa Domain Service se necessário
        const frete = this.calculadoraFrete.calcular(pedido, cliente.endereco, transportadora);
        pedido.aplicarFrete(frete);

        // 4. Persiste
        await this.pedidoRepo.save(pedido);

        // 5. Eventos são despachados automaticamente pelo framework
    }
}
```

### Infrastructure Service (Serviços Técnicos)
**NÃO TEM lógica de negócio**. Apenas operações técnicas de infraestrutura.
*   **Quando usar:** Email, SMS, Logger, Encriptação, Storage, APIs externas
*   **Exemplo:** `EmailService.send()`, `LoggerService.log()`, `StorageService.upload()`
*   **Características:**
    *   Puramente técnico (sem regras de negócio)
    *   Abstrai detalhes de infraestrutura
    *   Injetado nos Application Services quando necessário
*   **Vive na camada:** Infrastructure

**Exemplo Prático:**
```typescript
// Infrastructure Service - Apenas técnico
class EmailService {
    async send(to: string, subject: string, body: string): Promise<void> {
        // Código técnico: SMTP, API externa, etc.
        await this.smtpClient.sendMail({ to, subject, body });
    }
}

class LoggerService {
    log(level: string, message: string): void {
        // Código técnico: write to file, cloud logging, etc.
        console.log(`[${level}] ${message}`);
    }
}

class FileStorageService {
    async upload(file: Buffer, path: string): Promise<string> {
        // Código técnico: S3, filesystem, etc.
        return await this.s3Client.upload(file, path);
    }
}
```

---

### Como Decidir Onde Colocar a Lógica?

Use este fluxo de decisão:

**Pergunta 1:** *"Isso é uma regra de negócio?"*
*   **SIM** e pertence a UMA entidade → **Entidade**
*   **SIM** e envolve MÚLTIPLAS entidades → **Domain Service**
*   **NÃO** → Continua para pergunta 2...

**Pergunta 2:** *"Isso coordena um fluxo completo de negócio?"*
*   **SIM** → **Application Service (Use Case)**
*   **NÃO** → **Infrastructure Service**

---

### Exemplo Comparativo: Certo vs. Errado

**❌ ERRADO: Application Service com regra de negócio**
```typescript
class CriarPedidoUseCase {
    async execute(command: CriarPedidoCommand) {
        const pedido = new Pedido();

        // 🚨 ERRO: Regra de negócio vazou pro Use Case!
        if (command.valorTotal > 1000) {
            pedido.desconto = command.valorTotal * 0.1; // Regra de desconto aqui!
        }

        // 🚨 ERRO: Mais regras de negócio!
        if (command.cliente.isPremium && command.valorTotal > 500) {
            pedido.freteGratis = true;
        }

        await this.repo.save(pedido);
    }
}
```

**✅ CERTO: Regras na Entidade**
```typescript
class Pedido extends AggregateRoot {
    aplicarDesconto(valorTotal: Money): void {
        // ✅ Regra de negócio DENTRO da entidade
        if (valorTotal.valor > 1000) {
            this.desconto = valorTotal.multiplicar(0.1);
        }
    }

    avaliarFreteGratis(cliente: Cliente, valorTotal: Money): void {
        // ✅ Outra regra de negócio encapsulada
        if (cliente.isPremium() && valorTotal.valor > 500) {
            this.freteGratis = true;
        }
    }
}

class CriarPedidoUseCase {
    async execute(command: CriarPedidoCommand) {
        const cliente = await this.clienteRepo.findById(command.clienteId);
        const pedido = new Pedido();

        // ✅ Use Case apenas DELEGA para o domínio
        pedido.aplicarDesconto(command.valorTotal);
        pedido.avaliarFreteGratis(cliente, command.valorTotal);

        await this.repo.save(pedido);
    }
}
```

**✅ CERTO: Regra em Domain Service (múltiplos agregados)**
```typescript
// Domain Service quando envolve VÁRIOS agregados
class CalculadoraImpostoService {
    calcular(pedido: Pedido, cliente: Cliente, regrasFiscais: RegrasFiscais): Money {
        // ✅ Lógica de negócio que precisa de 3 agregados diferentes
        const aliquota = regrasFiscais.obterAliquota(cliente.estado);
        const baseCalculo = pedido.calcularTotal();

        if (cliente.isIsento()) {
            return Money.zero();
        }

        return baseCalculo.multiplicar(aliquota);
    }
}

class CriarPedidoUseCase {
    async execute(command: CriarPedidoCommand) {
        const cliente = await this.clienteRepo.findById(command.clienteId);
        const regrasFiscais = await this.regrasFiscaisRepo.findByCidade(cliente.cidade);
        const pedido = Pedido.criar(command.itens);

        // ✅ Use Case coordena, Domain Service calcula
        const imposto = this.calculadoraImposto.calcular(pedido, cliente, regrasFiscais);
        pedido.aplicarImposto(imposto);

        await this.repo.save(pedido);
    }
}
```

---

### Resumo Visual

```
┌─────────────────────────────────────────────────┐
│      APPLICATION LAYER                          │
│  ┌───────────────────────────────────────┐     │
│  │ Application Service (Use Case)         │     │
│  │ - Orquestra o fluxo                    │     │
│  │ - SEM regras de negócio                │     │
│  │ - Gerencia transação                   │     │
│  └───────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
                   ↓ chama
┌─────────────────────────────────────────────────┐
│         DOMAIN LAYER                            │
│  ┌─────────────┐  ┌───────────────────┐        │
│  │ Entidades   │  │ Domain Service    │        │
│  │ - Pedido    │  │ - Calcula Imposto │        │
│  │ - Cliente   │  │ - Transferência   │        │
│  │ COM regras! │  │ COM regras!       │        │
│  └─────────────┘  └───────────────────┘        │
└─────────────────────────────────────────────────┘
                   ↓ usa
┌─────────────────────────────────────────────────┐
│      INFRASTRUCTURE LAYER                       │
│  ┌──────────────┐  ┌──────────────────┐        │
│  │ Repositories │  │ Infrastructure   │        │
│  │              │  │ Services         │        │
│  │              │  │ - Email, Logger  │        │
│  │              │  │ SEM regras!      │        │
│  └──────────────┘  └──────────────────┘        │
└─────────────────────────────────────────────────┘
```

**Seu Application Service está "Gordo" com if/else?** Ele provavelmente está roubando regras que deveriam estar na Entidade ou num Domain Service.

---

### Dependências entre Services: Quem Pode Importar Quem?

A arquitetura em camadas define regras claras de dependência. **A regra de ouro:** Camadas superiores podem depender de camadas inferiores, mas nunca o contrário.

```
┌─────────────────────────────────┐
│   APPLICATION LAYER             │
│   (Application Services)        │
└─────────────────────────────────┘
         ↓ pode depender de
┌─────────────────────────────────┐
│   DOMAIN LAYER                  │
│   (Entities, Domain Services)   │
└─────────────────────────────────┘
         ↓ NÃO pode depender de
┌─────────────────────────────────┐
│   INFRASTRUCTURE LAYER          │
│   (Repositories, Infra Services)│
└─────────────────────────────────┘
```

#### ✅ Dependências PERMITIDAS:

**Application Service → Domain Service**
```typescript
class CriarPedidoUseCase {
    constructor(
        private pedidoRepo: IPedidoRepository,
        private calculadoraImposto: CalculadoraImpostoService // ✅ PODE
    ) {}

    async execute(command: CriarPedidoCommand) {
        const pedido = Pedido.criar(command.itens);
        const imposto = this.calculadoraImposto.calcular(pedido); // ✅ PODE
        await this.pedidoRepo.save(pedido);
    }
}
```

**Application Service → Infrastructure Service** (via interface)
```typescript
// Domain/Application define a INTERFACE
interface IEmailService {
    send(to: string, subject: string, body: string): Promise<void>;
}

// Application Service depende da INTERFACE (não da implementação)
class CriarUsuarioUseCase {
    constructor(
        private usuarioRepo: IUsuarioRepository,
        private emailService: IEmailService // ✅ PODE (via abstração - DIP)
    ) {}

    async execute(command: CriarUsuarioCommand) {
        const usuario = Usuario.criar(command.email);
        await this.usuarioRepo.save(usuario);
        await this.emailService.send(usuario.email, "Bem-vindo", "..."); // ✅ PODE
    }
}

// Infrastructure IMPLEMENTA a interface (Dependency Inversion Principle)
class SmtpEmailService implements IEmailService {
    async send(to: string, subject: string, body: string) {
        // implementação técnica SMTP
    }
}
```

**Domain Service → Domain Service**
```typescript
class CalculadoraImpostoService {
    constructor(
        private calculadoraDescontoService: CalculadoraDescontoService // ✅ PODE
    ) {}

    calcular(pedido: Pedido): Money {
        const desconto = this.calculadoraDescontoService.calcular(pedido);
        const baseCalculo = pedido.calcularTotal().subtrair(desconto);
        return baseCalculo.multiplicar(0.15); // 15% de imposto
    }
}
```

**Infrastructure → Qualquer camada**
```typescript
// Infrastructure pode depender de tudo (está na camada mais externa)
class DrizzlePedidoRepository implements IPedidoRepository {
    constructor(
        private db: DrizzleDb,
        private mapper: PedidoMapper // ✅ PODE usar mappers
    ) {}

    async save(pedido: Pedido): Promise<void> {
        const model = this.mapper.toPersistence(pedido);
        await this.db.insert(pedidos).values(model);
    }
}
```

#### ❌ Dependências PROIBIDAS:

**Domain Service → Infrastructure Service**
```typescript
// ❌ ERRADO: Domain não pode conhecer Infrastructure
class CalculadoraImpostoService {
    constructor(
        private emailService: EmailService // ❌ NÃO PODE!
        // Domain não deve saber que existe "email"
    ) {}
}
```

**Domain Service → Application Service**
```typescript
// ❌ ERRADO: Inversão de dependência (camada inferior depende da superior)
class CalculadoraImpostoService {
    constructor(
        private criarPedidoUseCase: CriarPedidoUseCase // ❌ NÃO PODE!
    ) {}
}
```

**Entidade → Qualquer Service**
```typescript
// ❌ ERRADO: Entidade não deve conhecer Services
class Pedido extends AggregateRoot {
    constructor(
        private calculadoraImposto: CalculadoraImpostoService // ❌ NÃO PODE!
        // Entidades devem ser puras, sem dependências externas
    ) {}
}
```

**Domain Layer → Infrastructure Layer**
```typescript
// ❌ ERRADO: Domain não pode conhecer detalhes de infraestrutura
class Pedido extends AggregateRoot {
    async salvar() {
        await db.insert(pedidos).values(this); // ❌ NÃO PODE!
        // Isso é Active Record, não DDD
    }
}
```

#### Tabela de Dependências Permitidas

| De \ Para | Entidade | Domain Service | Application Service | Infrastructure | Repository |
|-----------|----------|----------------|---------------------|----------------|------------|
| **Entidade** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Domain Service** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Application Service** | ✅ | ✅ | ❌ | ✅ (via interface) | ✅ (via interface) |
| **Infrastructure** | ✅ | ✅ | ✅ | ✅ | N/A |
| **Repository (Infra)** | ✅ | ❌ | ❌ | ✅ | ✅ |

**Legenda:**
- ✅ = Pode depender diretamente
- ✅ (via interface) = Pode depender, mas através de uma interface/abstração (DIP)
- ❌ = Não pode depender

---

### Quantos Métodos Cada Service Deve Ter?

A resposta varia conforme o tipo de Service:

#### Application Service (Use Case): **1 método por classe**

**Princípio:** 1 Use Case = 1 Intenção de Negócio = 1 Classe = 1 Método `execute`

✅ **CERTO: Uma responsabilidade por classe**
```typescript
// Arquivo: criar-pedido.use-case.ts
class CriarPedidoUseCase {
    async execute(command: CriarPedidoCommand): Promise<void> {
        // ... lógica de criar pedido
    }
}

// Arquivo: cancelar-pedido.use-case.ts
class CancelarPedidoUseCase {
    async execute(command: CancelarPedidoCommand): Promise<void> {
        // ... lógica de cancelar pedido
    }
}

// Arquivo: confirmar-pedido.use-case.ts
class ConfirmarPedidoUseCase {
    async execute(command: ConfirmarPedidoCommand): Promise<void> {
        // ... lógica de confirmar pedido
    }
}
```

❌ **ERRADO: "Service Faz-Tudo"**
```typescript
// ❌ NÃO FAÇA: Um service com múltiplos casos de uso
class PedidoService {
    async criarPedido(command: CriarPedidoCommand) { }
    async cancelarPedido(command: CancelarPedidoCommand) { }
    async confirmarPedido(command: ConfirmarPedidoCommand) { }
    async adicionarItem(command: AdicionarItemCommand) { }
    async removerItem(command: RemoverItemCommand) { }
    async calcularTotal(pedidoId: string) { }
    async enviarEmailConfirmacao(pedidoId: string) { }
    // ... 50 métodos depois...
}
```

**Por que separar em classes com 1 método?**
- ✅ **Single Responsibility Principle:** Cada classe tem uma única razão para mudar
- ✅ **Testabilidade:** Testa um caso de uso isoladamente
- ✅ **Clareza:** O nome da classe já diz exatamente o que ela faz
- ✅ **Manutenção:** Mudanças em "Criar" não afetam "Cancelar"
- ✅ **Deploy independente:** Em microserviços, cada Use Case pode virar um endpoint
- ✅ **Histórico Git mais limpo:** Commits afetam apenas o Use Case modificado

---

#### Domain Service: **Múltiplos métodos relacionados**

**Princípio:** Métodos que compartilham a mesma **responsabilidade de domínio** podem viver juntos.

✅ **CERTO: Métodos coesos (relacionados)**
```typescript
// Domain Service com métodos relacionados ao cálculo de impostos
class CalculadoraImpostoService {
    calcularICMS(pedido: Pedido, estado: string): Money {
        // ... lógica de ICMS
        const aliquota = this.obterAliquotaICMS(estado);
        return pedido.calcularTotal().multiplicar(aliquota);
    }

    calcularIPI(pedido: Pedido, produto: Produto): Money {
        // ... lógica de IPI
        if (produto.isNacional()) return Money.zero();
        return produto.preco.multiplicar(0.1);
    }

    calcularTotal(pedido: Pedido, estado: string): Money {
        // Método que compõe os outros
        const icms = this.calcularICMS(pedido, estado);
        const ipi = this.calcularIPI(pedido, pedido.produto);
        return icms.somar(ipi);
    }

    // Método privado auxiliar (coesão)
    private obterAliquotaICMS(estado: string): number {
        const aliquotas = { SP: 0.18, RJ: 0.20, MG: 0.18 };
        return aliquotas[estado] || 0.17;
    }
}

// Outro Domain Service, outra responsabilidade
class ValidadorDocumentoService {
    validarCPF(cpf: string): boolean {
        // ... lógica de validação
    }

    validarCNPJ(cnpj: string): boolean {
        // ... lógica de validação
    }

    formatarCPF(cpf: string): string {
        // Método auxiliar relacionado
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
}
```

❌ **ERRADO: Métodos sem relação (baixa coesão)**
```typescript
// ❌ NÃO FAÇA: "HelperService" genérico
class UtilsService {
    calcularImposto(pedido: Pedido): Money { }
    enviarEmail(email: string): void { }
    validarCPF(cpf: string): boolean { }
    formatarData(data: Date): string { }
    comprimirImagem(imagem: Buffer): Buffer { }
    // Métodos sem relação entre si = baixa coesão!
}
```

**Regra de Coesão:** Se você não consegue dar um nome específico para o Domain Service (tipo "CalculadoraX", "ValidadorY"), provavelmente ele está fazendo muita coisa diferente.

---

#### Infrastructure Service: **Múltiplos métodos relacionados**

**Princípio:** Métodos técnicos relacionados à mesma **infraestrutura/tecnologia**.

✅ **CERTO: Múltiplos métodos técnicos coesos**
```typescript
// Infrastructure Service - Email
class EmailService {
    async send(to: string, subject: string, body: string): Promise<void> {
        await this.smtpClient.sendMail({ to, subject, html: body });
    }

    async sendBulk(recipients: string[], subject: string, body: string): Promise<void> {
        const promises = recipients.map(to => this.send(to, subject, body));
        await Promise.all(promises);
    }

    async sendWithTemplate(to: string, templateId: string, data: any): Promise<void> {
        const template = await this.loadTemplate(templateId);
        const body = this.renderTemplate(template, data);
        await this.send(to, template.subject, body);
    }

    private async loadTemplate(id: string): Promise<EmailTemplate> { /* ... */ }
    private renderTemplate(template: string, data: any): string { /* ... */ }
}

// Infrastructure Service - Storage
class StorageService {
    async upload(file: Buffer, path: string): Promise<string> {
        return await this.s3.upload({ Bucket: 'mybucket', Key: path, Body: file });
    }

    async download(path: string): Promise<Buffer> {
        const result = await this.s3.getObject({ Bucket: 'mybucket', Key: path });
        return result.Body as Buffer;
    }

    async delete(path: string): Promise<void> {
        await this.s3.deleteObject({ Bucket: 'mybucket', Key: path });
    }

    async exists(path: string): Promise<boolean> {
        try {
            await this.s3.headObject({ Bucket: 'mybucket', Key: path });
            return true;
        } catch {
            return false;
        }
    }
}
```

**Regra:** Todos os métodos devem lidar com a mesma tecnologia/infraestrutura (Email, Storage, Logger, etc.).

---

### Resumo: Quantos Métodos?

| Tipo de Service | Quantos Métodos? | Motivo |
|-----------------|------------------|--------|
| **Application Service (Use Case)** | **1 método `execute`** | 1 Use Case = 1 Responsabilidade = 1 Classe |
| **Domain Service** | **Múltiplos métodos relacionados** | Métodos que compartilham a mesma responsabilidade de domínio |
| **Infrastructure Service** | **Múltiplos métodos relacionados** | Métodos técnicos da mesma infraestrutura/tecnologia |

### Exemplo Real Completo

```typescript
// ===== APPLICATION LAYER =====
// Arquivo: criar-pedido.use-case.ts
class CriarPedidoUseCase {
    constructor(
        private pedidoRepo: IPedidoRepository,
        private clienteRepo: IClienteRepository,
        private calculadoraImposto: CalculadoraImpostoService, // Domain Service
        private emailService: IEmailService // Infrastructure (via interface)
    ) {}

    // ✅ Um único método: execute
    async execute(command: CriarPedidoCommand): Promise<void> {
        // Orquestração pura
        const cliente = await this.clienteRepo.findById(command.clienteId);
        const pedido = Pedido.criar(command.itens, cliente.id);

        const imposto = this.calculadoraImposto.calcularTotal(pedido, cliente.estado);
        pedido.aplicarImposto(imposto);

        await this.pedidoRepo.save(pedido);
        await this.emailService.send(cliente.email, "Pedido criado", "...");
    }
}

// ===== DOMAIN LAYER =====
// Arquivo: calculadora-imposto.service.ts
class CalculadoraImpostoService {
    // ✅ Múltiplos métodos relacionados (mesma responsabilidade)
    calcularICMS(pedido: Pedido, estado: string): Money {
        const aliquota = this.obterAliquotaICMS(estado);
        return pedido.calcularTotal().multiplicar(aliquota);
    }

    calcularIPI(pedido: Pedido): Money {
        if (pedido.contemProdutosImportados()) {
            return pedido.calcularTotal().multiplicar(0.1);
        }
        return Money.zero();
    }

    calcularTotal(pedido: Pedido, estado: string): Money {
        const icms = this.calcularICMS(pedido, estado);
        const ipi = this.calcularIPI(pedido);
        return icms.somar(ipi);
    }

    private obterAliquotaICMS(estado: string): number {
        // Lógica auxiliar privada
        const aliquotas = { SP: 0.18, RJ: 0.20, MG: 0.18 };
        return aliquotas[estado] || 0.17;
    }
}

// ===== INFRASTRUCTURE LAYER =====
// Arquivo: smtp-email.service.ts
class SmtpEmailService implements IEmailService {
    // ✅ Múltiplos métodos técnicos relacionados
    async send(to: string, subject: string, body: string): Promise<void> {
        await this.smtpClient.sendMail({ to, subject, html: body });
    }

    async sendBulk(recipients: string[], subject: string, body: string): Promise<void> {
        const promises = recipients.map(to => this.send(to, subject, body));
        await Promise.all(promises);
    }
}
```

**Lembre-se:** Se você está criando um "Service" e não sabe se deve ter 1 ou múltiplos métodos, pergunte-se:

- **É um Use Case (fluxo de negócio)?** → 1 método `execute`
- **É um Domain Service (regras de negócio)?** → Múltiplos métodos relacionados à mesma responsabilidade
- **É um Infrastructure Service (técnico)?** → Múltiplos métodos da mesma tecnologia

---

## 5. Quando NÃO usar DDD?

DDD tem um custo alto de abstração (Mappers, DTOs, Factories).
*   **CRUDs Simples:** Se o sistema é só "telas de cadastro", DDD é matar mosca com canhão. Use Active Record ou Services simples.
*   **Relatórios/Dashboards:** Não use suas Entidades de Domínio para ler dados para telas de Dashboard. Use SQL direto (CQRS - Query Side). O Domínio serve para **Escrita** (proteger regras), a Leitura pode ser direta no banco.

## Resumo da Sobrevivência

1.  Isso é Entidade ou Value Object?
2.  Quais Entidades morrem juntas? (Defina o Agregado).
3.  Quem é o Chefe? (Defina a Raiz).
4.  Crie Repositório só para o Chefe.
5.  Refira-se aos outros Chefes só pelo ID.

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
