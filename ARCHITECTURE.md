# Decisões de Arquitetura

## Por que NÃO usar API Gateway com autenticação centralizada?

### TL;DR
Optamos por **validação de JWT em cada microserviço** ao invés de centralizar no API Gateway por questões de **segurança**, **autonomia** e **pragmatismo**.

### Análise de Tradeoffs

#### Abordagem Considerada (mas rejeitada):
```
Frontend → API Gateway (Kong) → MS (confiam cegamente no Gateway)
```

#### Abordagem Escolhida:
```
Frontend → Nginx (routing simples) → MS (cada um valida JWT)
```

### Justificativa:

**1. Defense in Depth (Segurança em Camadas)**
- Se atacante bypassar o Nginx (ex: acesso direto à rede interna), MS ainda estão protegidos
- Zero Trust Architecture: nunca confiar, sempre verificar
- Cada MS é autônomo e responsável pela própria segurança

**2. Escala não justifica complexidade adicional**
- Sistema target: ~1.000 req/s
- Validação JWT: ~0.5-2ms (~0.2% do tempo total de request)
- Gargalo real: Database queries (50%), chamadas entre MS (30%)
- ROI negativo: complexidade adicional não compensa ganho marginal de performance

**3. Autonomia dos Microserviços**
- Cada MS pode ser testado/deployado/executado independentemente
- Facilita debugging e troubleshooting
- Permite evolução independente (ex: MS1 usar JWT, MS2 usar OAuth)

**4. Simplicidade e Manutenibilidade**
- Menos "magic" na arquitetura
- Stack trace mais claro
- Onboarding de novos devs mais fácil

### Quando reconsi deraríamos API Gateway robusto:

- [ ] Escala > 10.000 req/s (CPU de validação JWT vira bottleneck)
- [ ] Múltiplos consumidores externos (B2B, parceiros)
- [ ] Necessidade de features específicas:
  - Circuit breaker distribuído
  - API versioning complexo (/v1, /v2 com comportamentos muito diferentes)
  - Rate limiting global cross-service
  - Transformação complexa de requests/responses
  - Analytics/metering por tenant (multi-tenancy)

### O que usamos no lugar:

**Nginx:**
- SSL/TLS termination
- Routing entre MS
- Load balancing (least_conn)
- Compressão (gzip/brotli)
- Static file serving
- Request logging

**Cada Microserviço:**
- JWT validation (`@UseGuards(JwtAuthGuard)`)
- Authorization (regras de negócio)
- Rate limiting (Redis distribuído)
- CORS (configuração própria)
- Input validation

### Métricas para Validar a Decisão:

Iremos monitorar:
- Latência p95 de requests (target: < 200ms)
- CPU usage dos MS (target: < 70%)
- Taxa de erros 5xx (target: < 0.1%)
- Tempo de validação JWT (esperado: < 2ms)

Se observarmos degradação nesses indicadores, reavaliaremos a arquitetura.

---

## Outras Decisões Importantes

### Por que PostgreSQL para Reservas/Pagamentos/Auth?
- ACID transactions (crítico para reservas e pagamentos)
- JSON support (flexibilidade quando necessário)
- Maturidade e tooling
- Replicação read/write built-in

### Por que MongoDB para Notificações?
- Schema flexível (diferentes tipos de notificação)
- Append-only workload (write-heavy)
- Não precisa de ACID

### Por que RabbitMQ ao invés de Kafka?
- Menor complexidade operacional
- Pattern matching flexível (topic exchanges)
- Suficiente para nossa escala (<10k msg/s)
- Melhor para workloads onde ordem não é crítica

### Por que CQRS?
- Separação clara read/write
- Permite otimizar queries (read models)
- Facilita Event Sourcing (futuro)
- Alinha com DDD
