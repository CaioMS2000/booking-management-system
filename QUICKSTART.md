# 🚀 Quick Start Guide

## ✅ Pré-requisitos

- Docker Desktop instalado e rodando
- Make (opcional, mas recomendado)

## 📦 O que foi configurado

### **Infraestrutura Completa (Docker Compose)**

✅ **6 PostgreSQL databases** (uma para cada microserviço)
✅ **RabbitMQ** (Event Bus com Management UI)
✅ **Redis** (Cache e sessions)
✅ **Elasticsearch** (Search Service)
✅ **Kong** (API Gateway - opcional)

---

## 🎯 Começar em 3 Passos

### **1. Subir a infraestrutura**

```bash
make up
# ou
docker compose up -d
```

### **2. Verificar se tudo está rodando**

```bash
make status
# ou
docker compose ps
```

Aguarde até todos os containers mostrarem status `healthy`.

### **3. Testar conexões**

```bash
make test-connections
```

---

## 🎨 Comandos Úteis (Makefile)

### **Gerenciamento Geral**
```bash
make help           # Ver todos os comandos disponíveis
make up             # Iniciar todos os serviços
make down           # Parar todos os serviços
make restart        # Reiniciar todos os serviços
make status         # Ver status dos containers
make logs           # Ver logs de todos os serviços
make clean          # Parar e REMOVER TUDO (cuidado!)
```

### **Infraestrutura Específica**
```bash
make up-infra       # Subir apenas DBs + RabbitMQ + Redis + Elasticsearch
make up-dbs         # Subir apenas PostgreSQL
make up-messaging   # Subir apenas RabbitMQ
make up-cache       # Subir apenas Redis
make up-search      # Subir apenas Elasticsearch
make up-gateway     # Subir apenas Kong
```

### **Logs de Serviços Específicos**
```bash
make logs-property       # Logs do PostgreSQL (Property Management)
make logs-auth           # Logs do PostgreSQL (Auth)
make logs-rabbitmq       # Logs do RabbitMQ
make logs-redis          # Logs do Redis
make logs-elasticsearch  # Logs do Elasticsearch
make logs-kong           # Logs do Kong
```

### **Conectar aos Bancos de Dados**
```bash
make db-connect-auth          # psql no Auth DB
make db-connect-user          # psql no User DB
make db-connect-property      # psql no Property DB
make db-connect-payment       # psql no Payment DB
make db-connect-notification  # psql no Notification DB
make db-connect-search        # psql no Search DB
```

### **RabbitMQ**
```bash
make rabbitmq-ui    # Abrir Management UI (http://localhost:15672)
make rabbitmq-shell # Acessar shell do RabbitMQ
```

### **Redis**
```bash
make redis-cli      # Acessar Redis CLI
make redis-monitor  # Monitorar comandos em tempo real
```

### **Elasticsearch**
```bash
make elasticsearch-health   # Ver saúde do cluster
make elasticsearch-indices  # Listar todos os índices
make elasticsearch-shell    # Acessar shell do container
```

### **Informações**
```bash
make ports       # Ver mapeamento de portas
make credentials # Ver credenciais de todos os serviços
```

---

## 🌐 Acessar Serviços

### **PostgreSQL Databases**
```bash
# Auth Service
psql -h localhost -p 5432 -U auth_user -d auth_db

# User Service
psql -h localhost -p 5433 -U user_user -d user_db

# Property Management Service
psql -h localhost -p 5434 -U property_user -d property_db

# Payment Service
psql -h localhost -p 5435 -U payment_user -d payment_db

# Notification Service
psql -h localhost -p 5436 -U notification_user -d notification_db

# Search Service
psql -h localhost -p 5437 -U search_user -d search_db
```

### **RabbitMQ Management UI**
- **URL:** http://localhost:15672
- **User:** `booking`
- **Password:** `booking123`

### **Redis CLI**
```bash
redis-cli -h localhost -p 6379 -a redis123
```

### **Elasticsearch**
```bash
# Health check
curl http://localhost:9200/_cluster/health?pretty

# List indices
curl http://localhost:9200/_cat/indices?v
```

### **Kong API Gateway**
- **Proxy:** http://localhost:8000
- **Admin API:** http://localhost:8001

---

## 📊 Portas Mapeadas

| Porta | Serviço |
|-------|---------|
| **5432** | PostgreSQL - Auth Service |
| **5433** | PostgreSQL - User Service |
| **5434** | PostgreSQL - Property Management |
| **5435** | PostgreSQL - Payment Service |
| **5436** | PostgreSQL - Notification Service |
| **5437** | PostgreSQL - Search Service |
| **5438** | PostgreSQL - Kong Database |
| **5672** | RabbitMQ - AMQP |
| **15672** | RabbitMQ - Management UI |
| **6379** | Redis |
| **9200** | Elasticsearch - HTTP |
| **9300** | Elasticsearch - Transport |
| **8000** | Kong - Proxy |
| **8001** | Kong - Admin API |

---

## 🔐 Credenciais (Desenvolvimento)

### PostgreSQL
| Serviço | User | Password | Database |
|---------|------|----------|----------|
| Auth | `auth_user` | `auth_pass` | `auth_db` |
| User | `user_user` | `user_pass` | `user_db` |
| Property | `property_user` | `property_pass` | `property_db` |
| Payment | `payment_user` | `payment_pass` | `payment_db` |
| Notification | `notification_user` | `notification_pass` | `notification_db` |
| Search | `search_user` | `search_pass` | `search_db` |

### RabbitMQ
- **User:** `booking`
- **Password:** `booking123`

### Redis
- **Password:** `redis123`

### Elasticsearch
- **Security:** Disabled (dev mode)

⚠️ **Nunca use essas credenciais em produção!**

---

## 📝 Próximos Passos

Agora que a infraestrutura está rodando:

### **1. Configurar variáveis de ambiente**
```bash
cp .env.example .env
# Edite .env com suas configurações
```

### **2. Criar migrations de banco de dados**
Criar arquivos SQL em:
- `migrations/auth-service/`
- `migrations/user-service/`
- `migrations/property-management-service/`
- `migrations/payment-service/`
- `migrations/notification-service/`

### **3. Começar a implementar microserviços**
Seguir a ordem recomendada no plano:
1. **Property Management Service** (Semana 3-6)
   - Módulo Listing
   - Módulo Availability
   - Módulo Booking
2. **Auth Service** (Semana 7-8)
3. **User Service** (Semana 9)
4. **Payment Service** (Semana 10-11)
5. **Notification Service** (Semana 12)
6. **Search Service** (Semana 13-15)

---

## 🐛 Troubleshooting

### **Container não inicia**
```bash
make logs-<service>
# Exemplo: make logs-property
```

### **Porta já em uso**
Edite `docker-compose.yml` e mude a porta externa:
```yaml
ports:
  - "5440:5432"  # Mudou de 5432 para 5440
```

### **Elasticsearch não inicia**
```bash
# Linux
sudo sysctl -w vm.max_map_count=262144
```

### **Resetar tudo do zero**
```bash
make clean
make up
```

---

## 🎉 Pronto!

Seu ambiente de desenvolvimento está configurado!

**Comandos essenciais:**
```bash
make up              # Subir tudo
make status          # Ver status
make logs            # Ver logs
make down            # Parar tudo
make help            # Ver todos os comandos
```

Veja mais detalhes em [DOCKER.md](./DOCKER.md).

Próximo passo: **Implementar Property Management Service** 🚀
