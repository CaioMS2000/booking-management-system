.PHONY: help up down restart logs clean test-connections

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

##@ General

help: ## Display this help
	@echo "$(BLUE)Booking Management System - Docker Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(GREEN)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Docker Compose

up: ## Start all services
	@echo "$(BLUE)🚀 Starting all services...$(NC)"
	docker compose up -d
	@echo "$(GREEN)✅ All services started!$(NC)"
	@echo "$(YELLOW)Run 'make logs' to see logs$(NC)"

down: ## Stop all services
	@echo "$(BLUE)🛑 Stopping all services...$(NC)"
	docker compose down
	@echo "$(GREEN)✅ All services stopped!$(NC)"

restart: ## Restart all services
	@echo "$(BLUE)🔄 Restarting all services...$(NC)"
	docker compose restart
	@echo "$(GREEN)✅ All services restarted!$(NC)"

logs: ## Show logs (all services)
	docker compose logs -f

status: ## Show status of all containers
	@echo "$(BLUE)📊 Container Status:$(NC)"
	@docker compose ps

clean: ## Stop and remove all containers, networks, volumes
	@echo "$(RED)⚠️  Warning: This will delete all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)🧹 Cleaning up...$(NC)"; \
		docker compose down -v --rmi local; \
		echo "$(GREEN)✅ Cleanup complete!$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled.$(NC)"; \
	fi

##@ Individual Services

up-infra: ## Start only infrastructure (DBs, RabbitMQ, Redis, Elasticsearch)
	@echo "$(BLUE)🏗️  Starting infrastructure services...$(NC)"
	docker compose up -d postgres-auth postgres-user postgres-property postgres-payment postgres-notification postgres-search rabbitmq redis elasticsearch
	@echo "$(GREEN)✅ Infrastructure services started!$(NC)"

up-dbs: ## Start only PostgreSQL databases
	@echo "$(BLUE)🗄️  Starting PostgreSQL databases...$(NC)"
	docker compose up -d postgres-auth postgres-user postgres-property postgres-payment postgres-notification postgres-search
	@echo "$(GREEN)✅ Databases started!$(NC)"

up-messaging: ## Start only RabbitMQ
	@echo "$(BLUE)📨 Starting RabbitMQ...$(NC)"
	docker compose up -d rabbitmq
	@echo "$(GREEN)✅ RabbitMQ started!$(NC)"
	@echo "$(YELLOW)Management UI: http://localhost:15672 (booking/booking123)$(NC)"

up-cache: ## Start only Redis
	@echo "$(BLUE)💾 Starting Redis...$(NC)"
	docker compose up -d redis
	@echo "$(GREEN)✅ Redis started!$(NC)"

up-search: ## Start only Elasticsearch
	@echo "$(BLUE)🔍 Starting Elasticsearch...$(NC)"
	docker compose up -d elasticsearch
	@echo "$(GREEN)✅ Elasticsearch started!$(NC)"
	@echo "$(YELLOW)HTTP API: http://localhost:9200$(NC)"

up-gateway: ## Start only Kong API Gateway
	@echo "$(BLUE)🌐 Starting Kong...$(NC)"
	docker compose up -d kong-database kong-migrations kong
	@echo "$(GREEN)✅ Kong started!$(NC)"
	@echo "$(YELLOW)Proxy: http://localhost:8000$(NC)"
	@echo "$(YELLOW)Admin: http://localhost:8001$(NC)"

restart-property: ## Restart Property Management database
	docker compose restart postgres-property

restart-auth: ## Restart Auth database
	docker compose restart postgres-auth

restart-rabbitmq: ## Restart RabbitMQ
	docker compose restart rabbitmq

restart-redis: ## Restart Redis
	docker compose restart redis

##@ Logs

logs-property: ## Show Property Management DB logs
	docker compose logs -f postgres-property

logs-auth: ## Show Auth DB logs
	docker compose logs -f postgres-auth

logs-rabbitmq: ## Show RabbitMQ logs
	docker compose logs -f rabbitmq

logs-redis: ## Show Redis logs
	docker compose logs -f redis

logs-elasticsearch: ## Show Elasticsearch logs
	docker compose logs -f elasticsearch

logs-kong: ## Show Kong logs
	docker compose logs -f kong

##@ Testing

test-connections: ## Test all service connections
	@echo "$(BLUE)🧪 Testing connections...$(NC)"
	@echo ""
	@echo "$(YELLOW)PostgreSQL - Auth (5432):$(NC)"
	@docker exec -it booking-postgres-auth pg_isready -U auth_user -d auth_db && echo "$(GREEN)✅ Connected$(NC)" || echo "$(RED)❌ Failed$(NC)"
	@echo ""
	@echo "$(YELLOW)PostgreSQL - Property (5434):$(NC)"
	@docker exec -it booking-postgres-property pg_isready -U property_user -d property_db && echo "$(GREEN)✅ Connected$(NC)" || echo "$(RED)❌ Failed$(NC)"
	@echo ""
	@echo "$(YELLOW)RabbitMQ (15672):$(NC)"
	@curl -s -u booking:booking123 http://localhost:15672/api/overview > /dev/null && echo "$(GREEN)✅ Connected$(NC)" || echo "$(RED)❌ Failed$(NC)"
	@echo ""
	@echo "$(YELLOW)Redis (6379):$(NC)"
	@docker exec -it booking-redis redis-cli -a redis123 PING 2>/dev/null | grep PONG > /dev/null && echo "$(GREEN)✅ Connected$(NC)" || echo "$(RED)❌ Failed$(NC)"
	@echo ""
	@echo "$(YELLOW)Elasticsearch (9200):$(NC)"
	@curl -s http://localhost:9200/_cluster/health > /dev/null && echo "$(GREEN)✅ Connected$(NC)" || echo "$(RED)❌ Failed$(NC)"

health: ## Check health status of all services
	@echo "$(BLUE)🏥 Health Check:$(NC)"
	@docker compose ps

##@ Database

db-connect-auth: ## Connect to Auth database
	docker exec -it booking-postgres-auth psql -U auth_user -d auth_db

db-connect-user: ## Connect to User database
	docker exec -it booking-postgres-user psql -U user_user -d user_db

db-connect-property: ## Connect to Property database
	docker exec -it booking-postgres-property psql -U property_user -d property_db

db-connect-payment: ## Connect to Payment database
	docker exec -it booking-postgres-payment psql -U payment_user -d payment_db

db-connect-notification: ## Connect to Notification database
	docker exec -it booking-postgres-notification psql -U notification_user -d notification_db

db-connect-search: ## Connect to Search database
	docker exec -it booking-postgres-search psql -U search_user -d search_db

##@ RabbitMQ

rabbitmq-ui: ## Open RabbitMQ Management UI
	@echo "$(BLUE)🐰 Opening RabbitMQ Management UI...$(NC)"
	@echo "$(YELLOW)URL: http://localhost:15672$(NC)"
	@echo "$(YELLOW)User: booking$(NC)"
	@echo "$(YELLOW)Password: booking123$(NC)"

rabbitmq-shell: ## Access RabbitMQ shell
	docker exec -it booking-rabbitmq /bin/sh

##@ Redis

redis-cli: ## Access Redis CLI
	docker exec -it booking-redis redis-cli -a redis123

redis-monitor: ## Monitor Redis commands in real-time
	docker exec -it booking-redis redis-cli -a redis123 MONITOR

##@ Elasticsearch

elasticsearch-health: ## Check Elasticsearch cluster health
	@curl -s http://localhost:9200/_cluster/health?pretty

elasticsearch-indices: ## List all Elasticsearch indices
	@curl -s http://localhost:9200/_cat/indices?v

elasticsearch-shell: ## Access Elasticsearch container shell
	docker exec -it booking-elasticsearch /bin/bash

##@ Development

dev-setup: up-infra ## Setup development environment (infra only)
	@echo "$(GREEN)✅ Development environment ready!$(NC)"
	@echo ""
	@echo "$(YELLOW)Services running:$(NC)"
	@echo "  - PostgreSQL databases (6432-5437)"
	@echo "  - RabbitMQ (5672, UI: 15672)"
	@echo "  - Redis (6379)"
	@echo "  - Elasticsearch (9200)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Copy .env.example to .env"
	@echo "  2. Run migrations for each service"
	@echo "  3. Start your microservices"

reset: clean up ## Complete reset (removes all data and restarts)
	@echo "$(GREEN)✅ System reset complete!$(NC)"

##@ Information

ports: ## Show all port mappings
	@echo "$(BLUE)📡 Port Mappings:$(NC)"
	@echo "$(YELLOW)PostgreSQL:$(NC)"
	@echo "  5432 - Auth Service"
	@echo "  5433 - User Service"
	@echo "  5434 - Property Management"
	@echo "  5435 - Payment Service"
	@echo "  5436 - Notification Service"
	@echo "  5437 - Search Service"
	@echo "  5438 - Kong Database"
	@echo ""
	@echo "$(YELLOW)Message Broker:$(NC)"
	@echo "  5672  - RabbitMQ AMQP"
	@echo "  15672 - RabbitMQ Management UI"
	@echo ""
	@echo "$(YELLOW)Cache & Search:$(NC)"
	@echo "  6379 - Redis"
	@echo "  9200 - Elasticsearch HTTP"
	@echo "  9300 - Elasticsearch Transport"
	@echo ""
	@echo "$(YELLOW)API Gateway:$(NC)"
	@echo "  8000 - Kong Proxy"
	@echo "  8001 - Kong Admin API"

credentials: ## Show all service credentials
	@echo "$(BLUE)🔐 Service Credentials (Development):$(NC)"
	@echo ""
	@echo "$(YELLOW)PostgreSQL:$(NC)"
	@echo "  Auth:         user: auth_user         | pass: auth_pass"
	@echo "  User:         user: user_user         | pass: user_pass"
	@echo "  Property:     user: property_user     | pass: property_pass"
	@echo "  Payment:      user: payment_user      | pass: payment_pass"
	@echo "  Notification: user: notification_user | pass: notification_pass"
	@echo "  Search:       user: search_user       | pass: search_pass"
	@echo ""
	@echo "$(YELLOW)RabbitMQ:$(NC)"
	@echo "  User: booking | Pass: booking123"
	@echo "  Management UI: http://localhost:15672"
	@echo ""
	@echo "$(YELLOW)Redis:$(NC)"
	@echo "  Password: redis123"
	@echo ""
	@echo "$(YELLOW)Elasticsearch:$(NC)"
	@echo "  Security: Disabled (dev mode)"

.DEFAULT_GOAL := help
