# Recursos funcionais pensando em **MVP viável** e **features avançadas**:

## 🎯 CORE (MVP - essencial para funcionar)

### **Gestão de Espaços**
- Cadastrar espaço (nome, descrição, capacidade, preço/hora, fotos, localização)
- Listar espaços disponíveis (com filtros: capacidade, preço, localização)
- Atualizar informações do espaço
- Ativar/desativar espaço

### **Gestão de Reservas**
- Criar reserva (data/hora início e fim, espaço, cliente)
- Verificar disponibilidade em tempo real
- Cancelar reserva
- Listar reservas (por espaço, por cliente, por período)
- Consultar detalhes de uma reserva

### **Gestão de Clientes**
- Cadastrar cliente (nome, email, telefone, CPF/CNPJ)
- Atualizar dados do cliente
- Listar histórico de reservas do cliente

### **Processamento de Pagamentos** (MS2)
- Criar cobrança para uma reserva
- Confirmar pagamento
- Estornar pagamento (em caso de cancelamento)
- Consultar status de pagamento

---

## 🚀 FEATURES INTERMEDIÁRIAS (dão mais robustez)

### **Validações de Negócio**
- Impedir reservas conflitantes (overlap de horários)
- Tempo mínimo/máximo de reserva
- Antecedência mínima para reservar
- Política de cancelamento (ex: até 24h antes)

### **Precificação**
- Cálculo automático do valor total (horas × preço)
- Taxas adicionais (limpeza, equipamentos extras)
- Descontos por período (diária completa, semanal)

### **Notificações**
- Email de confirmação de reserva
- Email de lembrete (1 dia antes)
- Notificação de pagamento aprovado/recusado

---

## ⭐ FEATURES AVANÇADAS

### **Gestão de Disponibilidade**
- Bloquear datas específicas (manutenção, feriados)
- Horários de funcionamento customizados por dia da semana
- Reservas recorrentes (toda segunda às 14h)

### **Sistema de Avaliações**
- Cliente avaliar espaço após uso
- Proprietário avaliar cliente (comportamento)

### **Recursos Extras**
- Adicionar equipamentos/serviços extras (projetor, coffee break)
- Pacotes promocionais

### **Dashboards/Relatórios**
- Taxa de ocupação por espaço
- Receita por período
- Espaços mais/menos reservados
- Clientes mais frequentes

---
<br/>

# Detalhes técnicos
## Autenticação
Usar algoritmo RS256

## Geração de IDs
Usar ICR do Redis e ofuscar com conversão em Base62
1. Garantia de Ofuscação (Necessária)
Ao usar o INCR do Redis para gerar um ID sequencial e exclusivo, a ofuscação é a medida de segurança essencial para impedir que um invasor perceba o padrão incremental e adivinhe seus IDs de reserva
• A ofuscação é realizada ao embaralhar a ordem dos 62 caracteres (0-9, a-z, A-Z) usando uma chave secreta (secret key)
• Essa quebra de previsibilidade impede a engenharia reversa do ID exposto, mesmo que o atacante descubra que a base numérica utilizada é a 62
2. Redução de Tamanho (Opcional, mas Obtida)
A Base 62 oferece o máximo de compactação porque utiliza 62 caracteres diferentes para representar um dígito.
• Se fosse usado apenas o número sequencial do Redis (Base 10), ele precisaria de um número maior de dígitos para representar a volumetria de registros de um sistema de alta escala.
• Ao converter esse número longo para a Base 62, reduzimos o comprimento da representação do ID. Como a redução é um benefício "legal" (desejado), o Base 62 atende a esse requisito de forma eficiente, sem adicionar complexidade desnecessária, pois a conversão já faz parte do processo de ofuscação.
