# Go Backend Clean Architecture – Full Project Structures

Tài liệu này mô tả **2 cấu trúc project đầy đủ** cho backend Go theo Clean Architecture:

1. **Layered Modular Monolith**
2. **Domain-Centric Microservices**

---

## 1. Layered Modular Monolith

👉 Một project duy nhất, chia thành nhiều layer (domain, application, infrastructure, interfaces).  
👉 Domain chia theo module con (user, order, …).

### 📂 Full Project Structure

```

project/
├── cmd/
│   └── server/
│       └── main.go
│
├── domain/                  # Core Business
│   ├── entities/
│   │   ├── user/
│   │   │   └── user.go
│   │   └── order/
│   │       └── order.go
│   ├── repositories/
│   │   ├── user/
│   │   │   └── user\_repository.go
│   │   └── order/
│   │       └── order\_repository.go
│   ├── usecases/
│   │   ├── user/
│   │   │   └── create\_user.go
│   │   └── order/
│   │       └── create\_order.go
│   └── errors/
│       └── domain\_error.go
│
├── application/             # Application logic / Orchestration
│   ├── dto/
│   │   ├── user\_dto.go
│   │   └── order\_dto.go
│   └── services/
│       ├── user\_service.go
│       └── order\_service.go
│
├── infrastructure/          # Technical details
│   ├── config/
│   │   └── config.go
│   ├── database/
│   │   ├── postgres.go
│   │   └── migrations/
│   │       └── 001\_init.sql
│   ├── logger/
│   │   └── logger.go
│   ├── persistence/
│   │   ├── user\_repository\_pg.go
│   │   └── order\_repository\_pg.go
│   ├── messaging/
│   │   └── kafka\_producer.go
│   └── cache/
│       └── redis.go
│
├── interfaces/              # Delivery layer
│   ├── http/
│   │   ├── handlers/
│   │   │   ├── user\_handler.go
│   │   │   └── order\_handler.go
│   │   ├── middleware/
│   │   │   └── auth\_middleware.go
│   │   └── router.go
│   ├── grpc/
│   │   ├── user\_handler.go
│   │   └── order\_handler.go
│   └── events/
│       └── kafka\_consumer.go
│
├── pkg/                     # Shared utils
│   ├── errors.go
│   ├── response.go
│   └── validator.go
│
└── go.mod

```

---

## 2. Domain-Centric Microservices

👉 Mỗi domain chính là **một service độc lập** (user-service, order-service, payment-service...).  
👉 Mỗi service tự chứa entity, repo, usecase, infra, interface.  
👉 Các service giao tiếp qua **Kafka / RabbitMQ / gRPC / REST**.

### 📂 Full Multi-Service Repo

```

services/
├── user-service/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── domain/
│   │   ├── user.go
│   │   ├── user\_repository.go
│   │   └── create\_user.go
│   ├── application/
│   │   ├── dto/
│   │   │   └── user\_dto.go
│   │   └── services/
│   │       └── user\_service.go
│   ├── infrastructure/
│   │   ├── config/
│   │   │   └── config.go
│   │   ├── database/
│   │   │   └── postgres.go
│   │   ├── persistence/
│   │   │   └── user\_repository\_pg.go
│   │   ├── messaging/
│   │   │   └── kafka\_producer.go
│   │   └── logger/
│   │       └── logger.go
│   └── interfaces/
│       ├── http/
│       │   ├── handlers/
│       │   │   └── user\_handler.go
│       │   └── router.go
│       └── events/
│           └── kafka\_consumer.go
│
├── order-service/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── domain/
│   │   ├── order.go
│   │   ├── order\_repository.go
│   │   └── create\_order.go
│   ├── application/
│   │   └── services/
│   │       └── order\_service.go
│   ├── infrastructure/
│   │   └── database/
│   │       └── postgres.go
│   └── interfaces/
│       └── http/
│           └── handlers/
│               └── order\_handler.go
│
└── shared-libs/              # Dùng chung
├── events/
│   └── kafka\_event.go
├── dto/
│   └── common.go
└── utils/
└── validator.go

```

---

## 🔑 So sánh nhanh

| Đặc điểm  | Layered Modular Monolith        | Domain-Centric Microservices        |
| --------- | ------------------------------- | ----------------------------------- |
| Dự án     | 1 repo duy nhất                 | Nhiều repo/service                  |
| Domain    | Tách trong cùng project         | Mỗi domain = 1 service              |
| Giao tiếp | Nội bộ trong process            | Kafka / RabbitMQ / gRPC / REST      |
| Deploy    | 1 binary                        | Nhiều binary, nhiều container       |
| Scale     | Theo chiều dọc (vertical scale) | Theo chiều ngang (horizontal scale) |

---

## 📌 Kết luận

- **Layered Modular Monolith**:

  - Phù hợp team nhỏ, dự án chưa cần tách service.
  - Dễ quản lý logic chung, ít tốn hạ tầng.

- **Domain-Centric Microservices**:
  - Phù hợp khi domain phức tạp, cần scale độc lập.
  - Mỗi service có vòng đời riêng, deploy riêng.
  - Tương tác qua Kafka/RabbitMQ/gRPC.

👉 Bạn có thể bắt đầu bằng **Monolith** và sau này **refactor tách ra microservices** theo cấu trúc thứ 2.
