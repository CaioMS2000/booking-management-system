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