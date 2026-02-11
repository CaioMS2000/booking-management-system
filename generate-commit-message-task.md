# O que fazer para criar uma commit message?
## Siga esses passos
- ler o arquivo 'staged-info.txt'
- gerar uma commit message em inglês
- escrever essa commit message no arquivo 'commit-message.txt'
- executar o comando ```cat commit-message.txt``` para verificar se o arquivo não está vazio; caso esteja vazio escreva a mensagem.

<!-- Prompt -->
<!-- realize a tarefa que eu descrevi em @generate-commit-message-task.md  -->
<!-- script: git-info-for-commit.sh -->
```sh
clear
echo '' 2>&1 | tee staged-info.txt
# git status 2>&1 | tee -a staged-info.txt
echo -e "\n--- DIFF ---\n" | tee -a staged-info.txt
git diff --cached 2>&1 | tee -a staged-info.txt
echo -e "\n--- FILES ---\n" | tee -a staged-info.txt
git diff --cached --name-only 2>&1 | tee -a staged-info.txt
```