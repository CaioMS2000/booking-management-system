# 🐳 Docker Setup - Booking Management System

## 📦 Serviços Configurados

Este `docker-compose.yml` fornece toda a infraestrutura necessária para desenvolvimento local:

### **Bancos de Dados PostgreSQL** (6 instâncias - Database per Service)
| Serviço | Container | Porta | Database | User | Password |
|---------|-----------|-------|----------|------|----------|
| Auth Service | booking-postgres-auth | **5432** | auth_db | auth_user | auth_pass |
| User Service | booking-postgres-user | **5433** | user_db | user_user | user_pass |
| Property Management | booking-postgres-property | **5434** | property_db | property_user | property_pass |
| Payment Service | booking-postgres-payment | **5435** | payment_db | payment_user | payment_pass |
| Notification Service | booking-postgres-notification | **5436** | notification_db | notification_user | notification_pass |
| Search Service | booking-postgres-search | **5437** | search_db | search_user | search_pass |

### **Message Broker**
| Serviço | Container | Portas | User | Password | Management UI |
|---------|-----------|--------|------|----------|---------------|
| RabbitMQ | booking-rabbitmq | 5672 (AMQP)<br>15672 (UI) | booking | booking123 | http://localhost:15672 |

### **Cache & Sessions**
| Serviço | Container | Porta | Password |
|---------|-----------|-------|----------|
| Redis | booking-redis | **6379** | redis123 |

### **Search Engine**
| Serviço | Container | Portas | Cluster |
|---------|-----------|--------|---------|
| Elasticsearch | booking-elasticsearch | 9200 (HTTP)<br>9300 (Transport) | booking-cluster |

### **API Gateway**
| Serviço | Container | Portas | Descrição |
|---------|-----------|--------|-----------|
| Kong | booking-kong | 8000 (Proxy)<br>8001 (Admin) | Gateway entry point |
| Kong Database | booking-kong-database | **5438** | Metadata do Kong |

---

## 🚀 Como Usar

### **1. Iniciar todos os serviços**
```bash
docker-compose up -d
```

### **2. Verificar status dos containers**
```bash
docker-compose ps
```

### **3. Ver logs de todos os serviços**
```bash
docker-compose logs -f
```

### **4. Ver logs de um serviço específico**
```bash
docker-compose logs -f postgres-property
docker-compose logs -f rabbitmq
docker-compose logs -f elasticsearch
```

### **5. Parar todos os serviços**
```bash
docker-compose down
```

### **6. Parar e remover volumes (⚠️ apaga dados)**
```bash
docker-compose down -v
```

### **7. Reiniciar um serviço específico**
```bash
docker-compose restart postgres-property
```

---

## 🔍 Health Checks

Todos os serviços possuem health checks configurados. Para verificar:

```bash
docker-compose ps
```

Procure pela coluna **State** - deve mostrar `healthy` quando o serviço estiver pronto.

---

## 🧪 Testando Conexões

### **PostgreSQL**
```bash
# Auth Service
psql -h localhost -p 5432 -U auth_user -d auth_db
# Password: auth_pass

# Property Management Service
psql -h localhost -p 5434 -U property_user -d property_db
# Password: property_pass
```

### **RabbitMQ**
- **Management UI:** http://localhost:15672
- **User:** booking
- **Password:** booking123

### **Redis**
```bash
redis-cli -h localhost -p 6379 -a redis123
> PING
PONG
```

### **Elasticsearch**
```bash
curl http://localhost:9200
curl http://localhost:9200/_cluster/health?pretty
```

### **Kong**
```bash
# Proxy endpoint
curl http://localhost:8000

# Admin API
curl http://localhost:8001
```

---

## 📊 Portas Mapeadas (Resumo)

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
| **8000** | Kong - Proxy (API Gateway) |
| **8001** | Kong - Admin API |

---

## 🗂️ Volumes Persistentes

Os dados são persistidos em volumes Docker:

```
postgres-auth-data
postgres-user-data
postgres-property-data
postgres-payment-data
postgres-notification-data
postgres-search-data
rabbitmq-data
rabbitmq-logs
redis-data
elasticsearch-data
kong-db-data
```

### **Listar volumes**
```bash
docker volume ls | grep booking
```

### **Inspecionar um volume**
```bash
docker volume inspect booking-management-system_postgres-property-data
```

### **Remover volumes órfãos**
```bash
docker volume prune
```

---

## 🔧 Troubleshooting

### **Problema: Container não inicia**
```bash
docker-compose logs <service-name>
```

### **Problema: Porta já em uso**
Edite o `docker-compose.yml` e altere a porta externa (lado esquerdo):
```yaml
ports:
  - "5440:5432"  # Mudou de 5432 para 5440
```

### **Problema: Elasticsearch não inicia (memória)**
```bash
# Linux
sudo sysctl -w vm.max_map_count=262144

# Permanente
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

### **Problema: Health check falha**
Aguarde alguns segundos. Serviços como Elasticsearch podem demorar ~30s para ficarem prontos.

```bash
docker-compose ps
# Aguarde status mudar de "starting" para "healthy"
```

---

## 🎯 Desenvolvimento Rápido

### **Subir apenas infraestrutura essencial (sem Kong)**
```bash
docker-compose up -d postgres-property postgres-auth rabbitmq redis
```

### **Subir apenas Property Management dependencies**
```bash
docker-compose up -d postgres-property rabbitmq redis
```

### **Subir apenas Search Service dependencies**
```bash
docker-compose up -d postgres-search elasticsearch rabbitmq
```

---

## 🧹 Limpeza Completa

Se precisar resetar TUDO (⚠️ apaga todos os dados):

```bash
# Parar containers
docker-compose down

# Remover volumes
docker-compose down -v

# Remover imagens
docker-compose down --rmi all

# Subir novamente do zero
docker-compose up -d
```

---

## 📝 Próximos Passos

Após subir a infraestrutura:

1. ✅ **Criar migrations SQL** para cada serviço
2. ✅ **Configurar variáveis de ambiente** (copiar `.env.example` para `.env`)
3. ✅ **Implementar Property Management Service** (primeiro microserviço)
4. ✅ **Testar conexão com PostgreSQL** no código
5. ✅ **Testar publicação de eventos** no RabbitMQ

---

## 🔐 Credenciais de Acesso (Desenvolvimento)

⚠️ **ATENÇÃO:** Estas são credenciais de DESENVOLVIMENTO. Nunca use em produção!

### PostgreSQL
- **Users:** `auth_user`, `user_user`, `property_user`, `payment_user`, `notification_user`, `search_user`
- **Passwords:** `{service}_pass` (ex: `auth_pass`, `property_pass`)

### RabbitMQ
- **User:** `booking`
- **Password:** `booking123`

### Redis
- **Password:** `redis123`

### Elasticsearch
- **Security:** Desabilitada (desenvolvimento)

### Kong Database
- **User:** `kong`
- **Password:** `kong`

---

## 🌐 Networks

Todos os serviços compartilham a mesma rede Docker: `booking-network`

Isso permite que os microserviços se comuniquem usando os nomes dos containers:

```javascript
// De dentro de um container, você pode acessar:
const postgresHost = 'postgres-property'; // Em vez de localhost
const rabbitmqHost = 'rabbitmq';
const redisHost = 'redis';
const elasticsearchHost = 'elasticsearch';
```

**Nota:** Do **host** (sua máquina), use `localhost` com as portas mapeadas.

---

## 🎉 Pronto!

Agora você tem toda a infraestrutura rodando localmente. Execute:

```bash
docker-compose up -d && docker-compose logs -f
```

Aguarde os health checks passarem e comece a desenvolver! 🚀
