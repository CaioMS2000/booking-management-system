### **Geração de IDs: Base62 + Redis INCR - Decisão Hardcore** ✅

**Em [system.md](system.md):**
Você propõe usar Redis INCR + ofuscação Base62.

**Análise Revista (Contexto: Sistema Distribuído Local):**
```
Sua justificativa está CORRETA:
✅ Em sistema distribuído, colisão de IDs é um problema real
✅ Redis centralizado garante unicidade global
✅ Base62 ofuscado impede enumeration attacks
✅ IDs curtos e legíveis (bom para logs, debugging)

CONTRAS (mas mitigáveis):
❌ Redis é SPOF → SOLUÇÃO: Redis Sentinel (HA) ou Redis Cluster
❌ Ofuscação não é cripto → OK, objetivo é anti-enumeration, não crypto
```

**Comparação com Alternativas:**

| Estratégia | Único Global | Ordenado | Curto | SPOF | Complexidade |
|------------|--------------|----------|-------|------|--------------|
| **Base62+Redis** | ✅ | ✅ | ✅ (6-8 chars) | ⚠️ Redis | Média |
| UUIDv7 | ✅ | ✅ | ❌ (36 chars) | ❌ | Baixa |
| Snowflake ID | ✅ | ✅ | ⚠️ (13+ chars) | ❌ | Alta |

**Decisão:**
```
MANTENHA Base62 + Redis, MAS adicione Redis Sentinel:

docker-compose.yml:
  redis-master:
    image: redis:7-alpine
  redis-sentinel-1:
    image: redis:7-alpine
    command: redis-sentinel /sentinel.conf
  redis-sentinel-2:
    ...
  redis-sentinel-3:
    ...
```

**Implementação Recomendada:**
```typescript
// src/shared/infrastructure/id-generator/redis-id.service.ts
@Injectable()
export class RedisIdGenerator {
  constructor(
    @Inject('REDIS_SENTINEL') private redis: Redis,
    private base62: Base62Service,
  ) {}

  async generate(prefix: string): Promise<string> {
    const id = await this.redis.incr(`id:${prefix}`);
    const encoded = this.base62.encode(id); // "a3Bx9"
    return `${prefix}_${encoded}`; // "res_a3Bx9"
  }
}

// Uso:
const reservaId = await idGenerator.generate('res'); // "res_a3Bx9"
const clienteId = await idGenerator.generate('cli'); // "cli_b2Cy8"
```

**AÇÃO NECESSÁRIA:**
- ✅ Implementar Base62 + Redis com Sentinel
- ✅ Prefixo por entidade (res_, cli_, pag_) - bom para debug
- ✅ Fallback: Se Redis cair, throw exception (fail fast, não gera ID duplicado)
- 🟡 Considerar Snowflake ID como Plano B (se Redis provar ser muito complexo)

---