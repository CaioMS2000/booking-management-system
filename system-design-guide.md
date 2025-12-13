Com base na metodologia detalhada para arquitetar sistemas, as etapas a seguir são essenciais e aplicáveis ao desenhar **qualquer sistema**, desde pequenas aplicações até grandes plataformas distribuídas.

A lista de passos que você precisa realizar para desenhar um sistema de forma robusta e coerente é:

### 1. Entender o Problema e Estabelecer os Requisitos

Este é o passo fundamental, pois **toda arquitetura é feita para atender requisitos muito bem definidos**. Se você não tem requisitos claros, qualquer tentativa de arquitetar será baseada em "chute", o que deve ser evitado.

*   **Identificar Requisitos Funcionais:** Definir o que a aplicação deve ser capaz de fazer (o *quê*), como criar, ler, atualizar ou deletar recursos.
*   **Identificar Requisitos Não Funcionais:** Definir como a aplicação deve se comportar (o *como*), incluindo alta disponibilidade (24x7), volumetria de requisições, e proporção entre operações de leitura e escrita (por exemplo, 10 leituras para cada 1 escrita).
*   **Fazer Perguntas:** Se estiver em uma entrevista ou levantamento de requisitos, faça perguntas para estabelecer métricas como tráfego diário esperado, volumetria de dados, e proporção de operações de escrita e leitura.

### 2. Calcular as Estimativas

Após definir os requisitos não funcionais, é preciso realizar cálculos para estabelecer os números que a arquitetura deverá suportar.

*   **Calcular Requisições por Segundo:** Quebrar o volume total diário em requisições por segundo para escrita e leitura (RPS - Requests Per Second).
*   **Calcular o Volume Total de Armazenamento:** Estimar quantos registros o banco de dados precisará suportar ao longo do tempo (ex: 5-10 anos) e qual o volume total de dados (em gigabytes ou terabytes) que será armazenado.

### 3. Fazer Escolhas Arquiteturais e de Ferramentas

As escolhas de tecnologia e design devem ser feitas com base nas estimativas e requisitos definidos.

*   **Escolher o Banco de Dados:** A seleção deve atender aos requisitos de volumetria de registros, disponibilidade e taxa de requisições. Por exemplo, bancos NoSQL como Cassandra ou DynamoDB são adequados para alta disponibilidade e escalabilidade horizontal, enquanto bancos relacionais como PostgreSQL podem ser mais apropriados quando consistência transacional é prioritária.
*   **Calcular Parâmetros do Sistema:** Determinar requisitos técnicos como tamanho de identificadores únicos, formato de chaves primárias, estratégias de particionamento de dados, e estimativas de combinações necessárias baseadas no volume projetado.

### 4. Definir a Solução para Geração de Identificadores Únicos

É crucial selecionar um algoritmo ou abordagem que garanta que cada identificador seja único e que **não haja possibilidade de colisão**.

*   **Evitar Soluções com Colisão:** Soluções que geram *hashs* baseados em aleatoriedade ou algoritmos propensos a colisões (como MD5 ou SHA1) devem ser evitadas quando possível, pois a colisão pode forçar consultas adicionais ao banco de dados, aumentando o volume de leitura e comprometendo a performance.
*   **Utilizar Conversão de Base com ID Exclusivo:** Uma solução eficaz é usar **conversão de base** (ex: base 62 ou base 64) aplicada a um número gerado de forma exclusiva (ID exclusivo).
*   **Garantir a Segurança:** Quando necessário, ofuscar identificadores com um *salt* ou chave secreta (*hash ID*) para evitar que atacantes possam prever padrões sequenciais, resolvendo potenciais problemas de segurança.

### 5. Propor e Escalar a Arquitetura (System Design)

Montar o desenho do sistema, garantindo que ele lide com a alta demanda de requisições.

*   **Escalabilidade Horizontal:** Escalar a aplicação horizontalmente (em vez de verticalmente) para lidar com a alta volumetria de tráfego.
*   **Utilizar Load Balancer:** Implementar um *Load Balancer* para distribuir a carga de requisições entre as diversas instâncias da aplicação.
*   **Garantir IDs Únicos em Sistemas Distribuídos:** Desacoplar a função de geração de ID único do *backend* principal, utilizando ferramentas externas (como Redis com o comando `INCR`, Snowflake IDs, ou UUIDs) para garantir que cada instância receba um ID exclusivo sem *race condition*.
*   **Garantir Alta Disponibilidade do Gerador de IDs:** Assegurar que o gerador de ID único também opere em alta disponibilidade (ex: usando Redis em modo cluster ou com sentinelas, ou implementando failover adequado).

### 6. Otimizar e Analisar Impactos Finais

Introduzir melhorias e considerar como as decisões técnicas afetam os requisitos não funcionais.

*   **Camada de Cache:** Adicionar uma camada de *cache* (como Redis ou Memcached) para armazenar dados frequentemente acessados, aliviando o banco de dados e aumentando a velocidade de acesso, especialmente em sistemas com alta proporção de leitura.
*   **Considerar Impactos das Decisões Técnicas:** Analisar como decisões de design (como códigos de status HTTP, estratégias de cache, TTL de dados) impactam a arquitetura, especialmente considerando trade-offs entre performance, consistência e funcionalidades como coleta de métricas e analytics.

Seguir estas etapas garante que você aborde o problema de design de maneira lógica e baseada em dados, e não em suposições, o que é crucial para projetar soluções coerentes.
