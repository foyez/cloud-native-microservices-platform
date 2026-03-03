# EKS Microservices App

A full-stack, cloud-native e-commerce platform built with a microservices architecture and deployed on AWS EKS (Elastic Kubernetes Service). The project demonstrates containerization, service-to-service communication, caching, API gateway patterns, and infrastructure as code.

## Architecture

```
                        ┌───────────────────────────────────────┐
                        │          AWS EKS Cluster              │
                        │                                       │
  Client ──► ALB ──► Ingress ──► Frontend (Nginx)               │
                        │              │                        │
                        │        API Gateway                    │
                        │         /    |    \                   │
                        │   Product   User    Order             │
                        │  Service  Service  Service            │
                        │     │   \    │    /                   │
                        │  Redis   PostgreSQL                   │
                        └───────────────────────────────────────┘
```

## Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Frontend       | React 19, Vite, React Router, Axios     |
| API Gateway    | Node.js, Express                        |
| User Service   | Go, Gin, PostgreSQL, JWT                |
| Product Service| Go, Gin, PostgreSQL, Redis              |
| Order Service  | Node.js, Express, PostgreSQL, Redis     |
| Database       | PostgreSQL 16                           |
| Cache          | Redis 7                                 |
| Container      | Docker, Docker Compose                  |
| Orchestration  | Kubernetes (AWS EKS)                    |
| IaC            | Terraform                               |
| Cloud          | AWS (EKS, ALB, S3, DynamoDB)            |
| Web Server     | Nginx (reverse proxy + SPA serving)     |

## Services

### Frontend (Port 80)
- React SPA with product listing, cart management, order history, and user authentication
- Served via Nginx with SPA routing and API proxying
- Optimized with gzip compression and static asset caching

### API Gateway (Port 8000)
- Single entry point for all client-to-service communication
- JWT-based authentication middleware
- Proxies requests to appropriate microservices
- Public routes: user registration, login, product listing
- Protected routes: user profile, create/update products, order management

### User Service (Port 8080) — Go
- User registration and login
- Password hashing with bcrypt
- JWT token generation
- PostgreSQL for persistent storage

### Product Service (Port 8081) — Go
- Full CRUD for products
- Redis caching with 5-minute TTL for product lists and individual products
- Cache invalidation on create, update, and delete
- `X-Cache: HIT/MISS` response headers

### Order Service (Port 8082) — Node.js
- Order creation with multi-item support
- Validates product availability via HTTP call to product service
- Calculates total price and updates order status
- Redis caching for user order history and individual orders
- PostgreSQL with transactional inserts

## Features

- **Microservices architecture** — independently deployable and scalable services
- **API Gateway** — centralized routing, auth, and request forwarding
- **JWT Authentication** — stateless token-based auth across services
- **Redis caching** — reduces database load for read-heavy endpoints
- **Docker Compose** — full local development stack with one command
- **Kubernetes manifests** — production-ready K8s deployments, services, configmaps, and secrets
- **AWS ALB Ingress** — internet-facing load balancer with health checks
- **Terraform IaC** — AWS EKS cluster provisioning with remote state in S3 + DynamoDB locking
- **Multi-stage Dockerfiles** — minimal production images for all services
- **Health check endpoints** — each service exposes `/health` for liveness checks

## Project Structure

```
eks-microservices-app/
├── frontend/                    # React + Vite SPA
│   ├── src/
│   │   ├── components/          # UI components (ProductList, Cart, Auth, Orders)
│   │   └── services/            # Axios API clients
│   ├── nginx.conf               # Nginx config with SPA routing and API proxy
│   └── Dockerfile               # Multi-stage build (Node → Nginx)
├── microservices/
│   ├── api-gateway/             # Node.js - request routing and auth middleware
│   ├── user-service/            # Go - registration, login, JWT
│   ├── product-service/         # Go - product CRUD with Redis caching
│   └── order-service/           # Node.js - order management with Redis caching
└── infra/
    ├── docker-compose/          # Local development stack
    ├── k8s/                     # Kubernetes manifests
    │   ├── namespace.yaml
    │   ├── configmap.yaml
    │   ├── secrets.yaml
    │   ├── ingress.yaml
    │   ├── frontend/
    │   ├── api-gateway/
    │   ├── user-service/
    │   ├── product-service/
    │   └── order-service/
    └── terraform/               # AWS EKS cluster provisioning
```

## Local Development

### Prerequisites
- Docker and Docker Compose
- Go 1.21+
- Node.js 20+

### Run with Docker Compose

```bash
cd infra/docker-compose
docker compose build
docker compose up
```

| Service         | URL                           |
|-----------------|-------------------------------|
| Frontend        | http://localhost              |
| API Gateway     | http://localhost:8000         |
| User Service    | http://localhost:8080         |
| Product Service | http://localhost:8081         |
| Order Service   | http://localhost:8082         |

## API Endpoints (via API Gateway)

### Users
| Method | Endpoint             | Auth     | Description      |
|--------|----------------------|----------|------------------|
| POST   | /api/v1/users        | Public   | Register         |
| POST   | /api/v1/users/login  | Public   | Login            |
| GET    | /api/v1/users/:id    | Required | Get user profile |

### Products
| Method | Endpoint               | Auth     | Description       |
|--------|------------------------|----------|-------------------|
| GET    | /api/v1/products       | Public   | List all products |
| GET    | /api/v1/products/:id   | Public   | Get product       |
| POST   | /api/v1/products       | Required | Create product    |
| PUT    | /api/v1/products/:id   | Required | Update product    |
| DELETE | /api/v1/products/:id   | Required | Delete product    |

### Orders
| Method | Endpoint                          | Auth     | Description         |
|--------|-----------------------------------|----------|---------------------|
| POST   | /api/v1/orders                    | Required | Create order        |
| GET    | /api/v1/users/:userId/orders      | Required | Get user's orders   |
| GET    | /api/v1/orders/:id                | Required | Get order by ID     |
| PATCH  | /api/v1/orders/:id/status         | Required | Update order status |

## Kubernetes Deployment

```bash
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/configmap.yaml
kubectl apply -f infra/k8s/secrets.yaml
kubectl apply -f infra/k8s/
```

## Infrastructure Provisioning (Terraform)

```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

- Provisions AWS EKS cluster
- Remote state stored in S3 with DynamoDB locking
- Configures AWS ALB Ingress Controller
