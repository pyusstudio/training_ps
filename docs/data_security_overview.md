# Data Security & Platform Integrity — Reflex Training

> **Confidential** · Technical Overview for Client Review · March 2026

## Executive Summary

Reflex Training is built with a "Security-First" philosophy, ensuring that client data is isolated, protected in transit, and stored using industry-standard encryption. Our architecture is designed to provide complete data sovereignty for our clients, ensuring that sensitive training information and performance metrics remain strictly confidential.

---

## 1. Multi-Tenant Data Isolation

The cornerstone of our data security strategy is **Physical Data Isolation**. Unlike traditional "Shared Schema" systems where multiple clients' data reside in the same database tables, Reflex Training provides:

- **Dedicated MongoDB Database Instance**: Each client is provisioned with an individual, isolated MongoDB database.
- **Zero Cross-Leakage**: Because the data is physically separated at the database level, it is architecturally impossible for one client's data to be queried or accessed by another.
- **Client-Specific Environment**: Database connection strings are unique to each client deployment, ensuring that the backend services only ever communicate with the client's authorized data store.

---

## 2. Authentication & Access Control

We employ a robust authentication framework to ensure that only authorized personnel can access the Admin Dashboard or initiate training sessions.

### 2.1 Identity Management
- **Encrypted Credentials**: All user passwords are one-way hashed using **bcrypt**, ensuring that even in the event of a database breach, original passwords cannot be recovered.
- **Role-Based Access Control (RBAC)**: Access is strictly controlled through defined roles (e.g., Admin). Advanced functions like training content management and real-time session monitoring are restricted to authorized administrators.

### 2.2 Secure Session Management
- **JSON Web Tokens (JWT)**: We use HS256-signed JWTs for all API interactions.
- **Short-Lived Tokens**: Tokens are configured with expiration limits to minimize the window of opportunity for unauthorized reuse.
- **Stateless Authorization**: Every request is independently verified, ensuring that access rights are checked in real-time.

---

## 3. Communication Security

Data in transit is protected using modern encryption protocols to prevent interception or tampering.

- **Encryption in Transit**: All REST API traffic is handled via **HTTPS**, utilizing TLS encryption.
- **Secure WebSockets (WSS)**: Real-time data streams between the Unity environment, the backend, and the Admin Dashboard are encrypted using Secure WebSockets.
- **Cross-Origin Protection**: Strict CORS (Cross-Origin Resource Sharing) policies are enforced to ensure that only authorized frontend domains can interact with the backend services.

---

## 4. AI Ethics & Privacy

The AI layer is designed to be ephemeral and privacy-respecting.

- **Ephemeral Conversation State**: AI customer personas do not "remember" or store permanent context from previous sessions unless explicitly saved as a transcript in the client's dedicated database.
- **Model Isolation**: While we utilize state-of-the-art LLMs (like Gemini, OpenAI, or Llama), no client-specific training data is used to train these models globally. Your proprietary training scenarios remain your own.
- **Content Filtering**: Built-in safety layers ensure that the AI customer remains within the bounds of professional sales conversation, redirecting or terminating interactions that violate safety protocols.

---

## 5. Infrastructure Integrity

The platform is hosted on secure, modern infrastructure designed for high availability and resilience.

- **Managed Database Hosting**: We utilize industry-leading managed services (like MongoDB Atlas) which provide automatic point-in-time recovery, continuous backups, and 24/7 monitoring.
- **Service Segregation**: The backend API, AI processing layer, and database are segmented to reduce the attack surface.
- **Audit Logging**: Key administrative actions are logged to provide a clear audit trail of system modifications.

---

*For further technical inquiries or detailed security questionnaires, please contact your Reflex Training account representative.*
