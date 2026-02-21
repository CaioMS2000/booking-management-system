### **Docker Compose (Desenvolvimento)**

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ========================================
  # Nginx (Reverse Proxy)
  # ========================================
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - ms1-instance-1
      - ms1-instance-2
      - ms2
      - ms3
      - ms4
    networks:
      - frontend
      - backend

  # ========================================
  # MS1 - Reservas (3 instâncias)
  # ========================================
  ms1-instance-1:
    build:
      context: ./ms1-reservas
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://admin:secret@postgres-ms1:5432/reservas
      - REDIS_URL=redis://redis-ms1:6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres-ms1
      - redis-ms1
      - rabbitmq
    networks:
      - backend
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  ms1-instance-2:
    build:
      context: ./ms1-reservas
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://admin:secret@postgres-ms1:5432/reservas
      - REDIS_URL=redis://redis-ms1:6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres-ms1
      - redis-ms1
      - rabbitmq
    networks:
      - backend
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  # ========================================
  # MS2 - Pagamentos
  # ========================================
  ms2:
    build:
      context: ./ms2-pagamentos
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://admin:secret@postgres-ms2:5432/pagamentos
      - REDIS_URL=redis://redis-ms2:6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
    depends_on:
      - postgres-ms2
      - redis-ms2
      - rabbitmq
    networks:
      - backend

  # ========================================
  # MS3 - Notificações
  # ========================================
  ms3:
    build:
      context: ./ms3-notificacoes
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - MONGODB_URL=mongodb://mongo:27017/notificacoes
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
    depends_on:
      - mongo
      - rabbitmq
    networks:
      - backend

  # ========================================
  # MS4 - Auth
  # ========================================
  ms4:
    build:
      context: ./ms4-auth
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://admin:secret@postgres-ms4:5432/auth
      - REDIS_URL=redis://redis-ms4:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRATION=15m
      - REFRESH_TOKEN_EXPIRATION=7d
    depends_on:
      - postgres-ms4
      - redis-ms4
    networks:
      - backend

  # ========================================
  # Bancos de Dados
  # ========================================
  postgres-ms1:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: reservas
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres-ms1-data:/var/lib/postgresql/data
    networks:
      - backend

  postgres-ms2:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pagamentos
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres-ms2-data:/var/lib/postgresql/data
    networks:
      - backend

  postgres-ms4:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: auth
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres-ms4-data:/var/lib/postgresql/data
    networks:
      - backend

  mongo:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    networks:
      - backend

  # ========================================
  # Redis (Cache)
  # ========================================
  redis-ms1:
    image: redis:7-alpine
    volumes:
      - redis-ms1-data:/data
    networks:
      - backend

  redis-ms2:
    image: redis:7-alpine
    volumes:
      - redis-ms2-data:/data
    networks:
      - backend

  redis-ms4:
    image: redis:7-alpine
    volumes:
      - redis-ms4-data:/data
    networks:
      - backend

  # ========================================
  # RabbitMQ (Event Bus)
  # ========================================
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "15672:15672"  # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: secret
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - backend

  # ========================================
  # Observabilidade
  # ========================================
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - backend

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
      - grafana-data:/var/lib/grafana
    networks:
      - backend

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "14268:14268"  # Collector HTTP
    networks:
      - backend

  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - backend

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    depends_on:
      - elasticsearch
    networks:
      - backend

volumes:
  postgres-ms1-data:
  postgres-ms2-data:
  postgres-ms4-data:
  mongo-data:
  redis-ms1-data:
  redis-ms2-data:
  redis-ms4-data:
  rabbitmq-data:
  prometheus-data:
  grafana-data:
  elasticsearch-data:

networks:
  frontend:
  backend:
```
