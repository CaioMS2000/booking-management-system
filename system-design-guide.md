Com base na metodologia detalhada para arquitetar sistemas, as etapas a seguir são essenciais e aplicáveis ao desenhar **qualquer sistema**, seja um encurtador de URL ou uma grande aplicação.

A lista de passos que você precisa realizar para desenhar um sistema de forma robusta e coerente é:

### 1. Entender o Problema e Estabelecer os Requisitos

Este é o passo fundamental, pois **toda arquitetura é feita para atender requisitos muito bem definidos**. Se você não tem requisitos claros, qualquer tentativa de arquitetar será baseada em "chute", o que deve ser evitado.

*   **Identificar Requisitos Funcionais:** Definir o que a aplicação deve ser capaz de fazer (o *quê*), como encurtar uma URL ou redirecionar o usuário.
*   **Identificar Requisitos Não Funcionais:** Definir como a aplicação deve se comportar (o *como*), incluindo alta disponibilidade (24x7), volumetria de requisições, e proporção entre operações de leitura e escrita (por exemplo, 10 leituras para cada 1 escrita),,,.
*   **Fazer Perguntas:** Se estiver em uma entrevista, faça perguntas para estabelecer requisitos como o tráfego diário, a volumetria de tráfego, e a proporção de escrita e leitura,.

### 2. Calcular as Estimativas

Após definir os requisitos não funcionais, é preciso realizar cálculos para estabelecer os números que a arquitetura deverá suportar.

*   **Calcular Requisições por Segundo:** Quebrar o volume total diário em requisições por segundo para escrita e leitura (RP/s).
*   **Calcular o Volume Total de Armazenamento:** Estimar quantos registros o banco de dados precisará suportar ao longo do tempo (ex: 10 anos) e qual o volume total de dados (em terabytes) que será armazenado,.

### 3. Fazer Escolhas Arquiteturais e de Ferramentas

As escolhas de tecnologia e design devem ser feitas com base nas estimativas e requisitos definidos.

*   **Escolher o Banco de Dados:** A seleção deve atender aos requisitos de alta volumetria de registros, alta disponibilidade e taxa de requisições. Por exemplo, o Cassandra foi escolhido por ser feito para baixa latência e alta disponibilidade, escalando horizontalmente,.
*   **Calcular Parâmetros do Sistema:** Determinar o tamanho mínimo necessário para identificadores ou chaves com base na base de caracteres permitida (ex: Base 62) e no total de combinações que precisam ser geradas para cobrir o volume de armazenamento necessário (ex: 365 bilhões de registros),,,.

### 4. Definir a Solução para Geração de Identificadores Únicos

É crucial selecionar um algoritmo ou abordagem que garanta que cada identificador (como o *short code*) seja único e que **não haja possibilidade de colisão**.

*   **Evitar Soluções com Colisão:** Soluções que geram *hashs* baseados em aleatoriedade ou algoritmos propensos a colisões (como MD5 ou SHA1) devem ser evitadas, pois a colisão força consultas ao banco de dados, aumentando o volume de leitura exponencialmente e comprometendo a arquitetura,,.
*   **Utilizar Conversão de Base com ID Exclusivo:** Uma solução eficaz é usar a **conversão de base** (ex: base 62) aplicada a um número gerado de forma exclusiva (ID exclusivo),.
*   **Garantir a Segurança:** Ofuscar a base de conversão com um *salt* ou chave secreta (*hash ID*) para evitar que atacantes descubram a próxima URL gerada, resolvendo um problema de segurança,,.

### 5. Propor e Escalar a Arquitetura (System Design)

Montar o desenho do sistema, garantindo que ele lide com a alta demanda de requisições.

*   **Escalabilidade Horizontal:** Escalar a aplicação horizontalmente (em vez de verticalmente) para lidar com a alta volumetria de tráfego.
*   **Utilizar Load Balancer:** Implementar um *Load Balancer* para distribuir a carga de requisições entre as diversas instâncias da aplicação.
*   **Garantir IDs Únicos em Sistemas Distribuídos:** Desacoplar a função de geração de ID único do *backend* principal, utilizando ferramentas externas (como o Redis com o comando `INCR`) para garantir que cada instância receba um ID exclusivo sem *race condition*,.
*   **Garantir Alta Disponibilidade do Contador:** Assegurar que o gerador de ID único também opere em alta disponibilidade (ex: usando o Redis em modo cluster ou com sentinelas),.

### 6. Otimizar e Analisar Impactos Finais

Introduzir melhorias e considerar como as decisões técnicas afetam os requisitos não funcionais.

*   **Camada de Cache:** Adicionar uma camada de *cache* (como o Redis) para armazenar as URLs mais acessadas, aliviando o banco de dados e aumentando a velocidade de acesso, especialmente em sistemas com alta proporção de leitura,.
*   **Considerar Impacto dos Códigos de Resposta:** Analisar como os códigos de status HTTP (ex: 301 - redirecionamento permanente vs. 302 - redirecionamento temporário) impactam a arquitetura, especialmente a possibilidade de utilizar a camada de *cache* e coletar métricas (analytics),,.

Seguir estas etapas garante que você aborde o problema de design de maneira lógica e baseada em dados, e não em suposições, o que é crucial para projetar soluções coerentes,.