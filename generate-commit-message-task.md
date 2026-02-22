# O que fazer para criar uma commit message?
## Siga esses passos
- ler o arquivo 'staged-info.txt'
- criar no 'commit-stages.sh' um script que executa os commits que achar necessário.

## Orientações
Fica a critério da análise quantos commits são e quais arquivos vão em cada commit. Agrupe os arquivos por organização e responsabilidades. Pode utilizar os padrões do conventional commits. Como o script deve ser autônomo, logicamente ele deve executar tanto o 'git add' quando o 'git commit'. As mensagens d commit devem ser em ingles.

<!-- Prompt -->
<!-- realize a tarefa que eu descrevi em @generate-commit-message-task.md  -->
<!-- realize a tarefa novamente, e garanta que vai ler a versão mais atualizada do arquivo para acompanhar as mudanças.  -->
<!-- script: git-info-for-commit.sh -->
<!--
```sh
clear
echo '' 2>&1 | tee staged-info.txt
# git status 2>&1 | tee -a staged-info.txt
echo -e "\n--- DIFF ---\n" | tee -a staged-info.txt
git diff --cached 2>&1 | tee -a staged-info.txt
echo -e "\n--- FILES ---\n" | tee -a staged-info.txt
git diff --cached --name-only 2>&1 | tee -a staged-info.txt
```
-->