# Problema da falta de externalização e disciplina de foco.
## O problema de trabalhar em várias coisas ao mesmo tempo

**Regra de ouro**: Uma branch, uma coisa. Se você está trabalhando em "adicionar autenticação OAuth", essa branch só deve ter mudanças relacionadas a isso. Ponto.

**Como aplicar na prática:**

```bash
# Comece sempre criando uma branch específica
git checkout -b feature/oauth-authentication

# Trabalhe APENAS nisso
# Quando terminar, commit e PR/merge
```

Se no meio do caminho você pensar "ah, vou aproveitar e arrumar aquele bug no validator", **PARE**. Você tem 3 opções:

1. **Anotar e fazer depois** (melhor para coisas não urgentes)
2. **Stash, troca de branch, resolve, volta** (para coisas rápidas)
3. **Se já editou muita coisa**: Usa `git add -p` para commitar seletivamente (explico abaixo)

## O problema da refatoração no meio do caminho

Esse é ainda mais traiçoeiro. Você está implementando feature X, vê código feio/ruim, e pensa "vou melhorar isso aqui rapidinho". Resultado: seu PR tem 500 linhas mudadas, metade é a feature, metade é refatoração, e o revisor não entende nada.

**Solução: Commits separados, mesmo na mesma branch**

```bash
# Cenário: Você está em feature/add-payment
# Vê que o código de validação está horrível

# 1. Faça a refatoração PRIMEIRO
# Edita apenas os arquivos de validação
git add src/validators/
git commit -m "refactor: improve validation logic readability"

# 2. AGORA implemente sua feature
# Edita os arquivos de pagamento
git add src/payment/
git commit -m "feat: add credit card payment support"
```

**Vantagens dessa abordagem:**
- Histórico limpo e compreensível
- Mais fácil revisar (cada commit faz uma coisa)
- Se precisar reverter, reverte só a parte problemática
- Bisect do git funciona melhor para encontrar bugs

## Ferramentas práticas do Git

### 1. `git add -p` (patch mode) - SUA NOVA MELHOR AMIGA

Quando você já editou muita coisa misturada:

```bash
# Em vez de "git add ."
git add -p

# O git vai mostrar cada "hunk" (pedaço) de mudança
# e perguntar o que fazer:
# y = adiciona esse pedaço
# n = pula esse pedaço  
# s = divide em pedaços menores
# q = sai
```

Exemplo real:
```bash
# Você editou 3 arquivos: auth.js, user.js, validator.js
# auth.js e user.js são da feature OAuth
# validator.js é uma refatoração que você fez no meio

git add -p

# Quando mostrar mudanças de auth.js → y
# Quando mostrar mudanças de user.js → y
# Quando mostrar mudanças de validator.js → n

git commit -m "feat: add OAuth authentication"

# Agora commita a refatoração separada
git add validator.js
git commit -m "refactor: simplify validation logic"
```

### 2. `git stash` - Para quando você precisa mudar de contexto

```bash
# Você está no meio de algo, precisa trocar de contexto
git stash save "WIP: oauth integration"

# Troca de branch, faz outra coisa
git checkout -b hotfix/critical-bug
# ... resolve o bug ...
git commit -m "fix: critical bug in payment"

# Volta ao trabalho anterior
git checkout feature/oauth-authentication
git stash pop
```

### 3. `git commit --amend` - Para ajustar o último commit

```bash
# Esqueceu algo pequeno no último commit?
# Edita o arquivo
git add arquivo.js
git commit --amend --no-edit

# Ou se quiser mudar a mensagem também
git commit --amend
```

## Workflow recomendado

**ANTES de começar a codar:**

1. Cria issue no Linear/GitHub
2. Cria branch específica: `git checkout -b feature/nome-descritivo`
3. Foca APENAS naquilo

**DURANTE o desenvolvimento:**

4. Se encontrar algo para refatorar:
   - Se for pequeno (< 5 min): Stash, cria branch separada, faz, volta
   - Se for médio: Anota num TODO/issue e faz depois
   - Se for NECESSÁRIO para sua feature: Commita a refatoração primeiro, depois a feature

5. Commits pequenos e frequentes são melhores que commits gigantes
   - "feat: add login form UI" 
   - "feat: add login validation logic"
   - "feat: integrate login with backend API"
   - É melhor que um único "feat: add login"

**ANTES de fazer push/PR:**

6. Revisa seus commits: `git log --oneline`
7. Se ficou bagunçado, considere fazer rebase interativo para limpar (mais avançado, não se preocupe com isso agora)

## Mensagens de commit

Use convenções simples:

- `feat:` - nova funcionalidade
- `fix:` - correção de bug  
- `refactor:` - mudança de código sem alterar comportamento
- `docs:` - só documentação
- `test:` - adicionar/modificar testes
- `chore:` - mudanças de build, configs, etc

Exemplo: `feat: add OAuth login with Google`

## Dica de transição

Você não vai acertar de primeira. Nas próximas 2-3 semanas, sempre que for dar `git status` e ver 10 arquivos modificados, pergunte-se:

**"Isso aqui é tudo parte da mesma mudança lógica?"**

- Se sim: `git add .` e commita tudo junto
- Se não: Usa `git add -p` ou adiciona seletivamente com `git add arquivo1.js arquivo2.js`

Depois de algumas semanas isso vira automático. O segredo é: **uma mudança lógica = um commit**. Se você não consegue descrever o commit em uma frase, provavelmente são múltiplos commits.