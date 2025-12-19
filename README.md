# 📚 Documentação - Booking Management System

Bem-vindo à documentação técnica do sistema de reservas!

## 📖 Índice de Documentos

### **Planejamento & Arquitetura**
- [../plan.md](../plan.md) - Planejamento arquitetural completo (2814 linhas)
  - Visão geral da arquitetura de microserviços
  - Divisão de serviços e responsabilidades
  - Estratégia de consistência distribuída
  - Fluxos de negócio detalhados
  - Patterns aplicados

- [../system.md](../system.md) - Requisitos funcionais do sistema
  - Especificações de cada funcionalidade
  - Regras de negócio
  - Casos de uso

### **Infraestrutura**
- [../DOCKER.md](../DOCKER.md) - Guia completo do Docker Compose
  - Descrição de todos os serviços
  - Comandos úteis
  - Troubleshooting
  - Health checks

- [../QUICKSTART.md](../QUICKSTART.md) - Guia rápido de início
  - Como subir o ambiente em 3 passos
  - Comandos essenciais do Makefile
  - Credenciais de desenvolvimento

### **Decisões Arquiteturais**
- [REDIS-STRATEGY.md](./REDIS-STRATEGY.md) - Estratégia de uso do Redis
  - Por que uma única instância
  - Organização em databases lógicas
  - Casos de uso por serviço
  - Quando escalar

### **DDD & Patterns**
- [../ddd.md](../ddd.md) - Domain-Driven Design knowledge base
- [../ddd-extended.md](../ddd-extended.md) - DDD patterns estendidos

---

## 🎯 Quick Reference

### **Portas dos Serviços**

| Porta | Serviço |
|-------|---------|
| 5432-5437 | PostgreSQL (6 databases) |
| 5672 | RabbitMQ AMQP |
| 15672 | RabbitMQ Management UI |
| 6379 | Redis |
| 9200 | Elasticsearch HTTP |
| 8000 | Kong Proxy |
| 8001 | Kong Admin |

### **Ordem de Implementação**

1. ✅ **Infraestrutura** (Semana 1-2) ← CONCLUÍDO
   - Docker Compose
   - Schemas de banco

2. ⏭️ **Property Management Service** (Semana 3-6)
   - Módulo Listing
   - Módulo Availability
   - Módulo Booking + Saga

3. ⏭️ **Auth Service** (Semana 7-8)
4. ⏭️ **User Service** (Semana 9)
5. ⏭️ **Payment Service** (Semana 10-11)
6. ⏭️ **Notification Service** (Semana 12)
7. ⏭️ **Search Service** (Semana 13-15)
8. ⏭️ **API Gateway** (Semana 16-17)

Ver [plano completo](../.claude/plans/purrfect-conjuring-gizmo.md) para detalhes.

---

## 🔧 Comandos Rápidos

```bash
# Subir infraestrutura
make up

# Ver status
make status

# Ver logs
make logs

# Testar conexões
make test-connections

# Conectar ao Redis
make redis-cli

# Conectar ao PostgreSQL (Property Management)
make db-connect-property

# Ver RabbitMQ Management UI
make rabbitmq-ui

# Parar tudo
make down

# Ver todos os comandos
make help
```

---

## 📁 Estrutura do Projeto

```
booking-management-system/
├── apps/                           # Microserviços
│   ├── property-management-service/
│   ├── auth-service/
│   ├── user-service/
│   ├── payment-service/
│   ├── notification-service/
│   └── search-service/
├── packages/                       # Código compartilhado
│   ├── shared/
│   └── typescript-config/
├── docs/                          # Documentação técnica
│   ├── README.md                  # Este arquivo
│   └── REDIS-STRATEGY.md
├── infrastructure/
│   └── docker-compose.yml
├── migrations/                    # SQL migrations
│   ├── auth-service/
│   ├── user-service/
│   └── ...
├── plan.md                        # Planejamento arquitetural
├── system.md                      # Requisitos funcionais
├── DOCKER.md                      # Guia Docker
├── QUICKSTART.md                  # Início rápido
├── Makefile                       # Comandos úteis
└── .env.example                   # Template de variáveis
```

---

## 🎓 Conceitos Importantes

### **Microserviços**
Cada serviço tem:
- ✅ Banco de dados próprio (Database per Service)
- ✅ Comunicação via eventos (Event-Driven)
- ✅ Deploy independente
- ✅ Bounded context do DDD

### **Event-Driven Architecture**
- RabbitMQ como message broker
- Eventos de domínio: `listing.created`, `booking.completed`, etc
- Eventual consistency entre serviços
- Saga Pattern para transações distribuídas

### **CQRS**
- Search Service = Read Model (Elasticsearch)
- Property Management = Write Model (PostgreSQL)
- Sincronização via eventos

### **Modular Monolith**
- Property Management unifica Listing + Booking + Availability
- Transações ACID locais
- Módulos bem separados
- Pode ser dividido futuramente

---

## 🔐 Segurança

### **Autenticação**
- JWT com RS256 (public/private keys)
- Access token: 15 min
- Refresh token: 7 dias
- Claims essenciais no token

### **Autorização**
- API Gateway valida assinatura do JWT
- Microserviços validam regras de negócio
- RBAC: guest, host, admin
- Permissions granulares

### **Comunicação Interna**
- Service-to-service: `X-Service-Token`
- Internal endpoints protegidos

---

## 🧪 Testing Strategy

### **Unit Tests**
- Jest para cada microserviço
- Mocks de dependências externas

### **Integration Tests**
- Testcontainers (PostgreSQL, Redis, RabbitMQ)
- Testes de API end-to-end

### **Contract Tests**
- Pact para contratos entre serviços
- Valida eventos publicados/consumidos

### **Load Tests**
- k6 para performance
- Testes de carga antes de deploy

---

## 📊 Observability (Futuro)

### **Distributed Tracing**
- Jaeger
- Trace ID propagado entre serviços

### **Metrics**
- Prometheus + Grafana
- Métricas de negócio e técnicas

### **Logging**
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Logs centralizados com correlation IDs

### **Alerting**
- PagerDuty ou Opsgenie
- Alertas de SLA, latência, errors

---

## 🚀 Deploy Strategy (Futuro)

### **CI/CD**
- GitHub Actions
- Testes automáticos em PRs
- Deploy automático após merge

### **Kubernetes**
- Helm charts para cada serviço
- Horizontal Pod Autoscaling
- Service mesh (Istio/Linkerd)

### **Ambientes**
- Development (local)
- Staging (preview)
- Production (multi-region)

---

## 📞 Suporte

Para dúvidas sobre:
- **Arquitetura:** Ver [plan.md](../plan.md)
- **Requisitos:** Ver [system.md](../system.md)
- **Docker:** Ver [DOCKER.md](../DOCKER.md)
- **Redis:** Ver [REDIS-STRATEGY.md](./REDIS-STRATEGY.md)

---

## 🎯 Próximos Passos

1. ✅ Subir infraestrutura: `make up`
2. ⏭️ Criar migrations SQL
3. ⏭️ Implementar Property Management Service
4. ⏭️ Implementar Auth Service
5. ⏭️ Implementar demais serviços

Ver plano detalhado em [.claude/plans/purrfect-conjuring-gizmo.md](../.claude/plans/purrfect-conjuring-gizmo.md).

---

**Última atualização:** 2025-12-19
