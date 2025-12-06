# Security Guidelines

This document outlines security best practices and guidelines for the Health Chatbot project.

## Table of Contents

- [Security Overview](#security-overview)
- [Environment Variables](#environment-variables)
- [API Security](#api-security)
- [Database Security](#database-security)
- [Authentication & Authorization](#authentication--authorization)
- [Data Protection](#data-protection)
- [Dependency Management](#dependency-management)
- [Deployment Security](#deployment-security)
- [Incident Response](#incident-response)
- [Compliance](#compliance)

## Security Overview

The Health Chatbot implements multiple layers of security:

1. **Input Validation**: Zod schema validation on all inputs
2. **Secure Headers**: HTTP security headers via Hono middleware
3. **Environment Isolation**: Sensitive configuration via environment variables
4. **API Key Management**: Secure handling of third-party API credentials
5. **Database Security**: Connection encryption and access controls
6. **Error Handling**: Safe error messages without sensitive data leakage

## Environment Variables

### Critical Security Rules

⚠️ **NEVER COMMIT** sensitive data to version control:

```bash
# ❌ WRONG
git add .env
git commit -m "Add API keys"

# ✅ CORRECT
echo ".env.local" >> .gitignore
# Use .env.local for local development only
```

### Sensitive Variables

These variables must be kept secret:

```env
DATABASE_URL              # Contains database credentials
OPENAI_API_KEY           # AI model access
OPENROUTER_API_KEY       # AI model access
PINE_CONE_API_KEY        # Vector database access
WHAPI_API_KEY            # WhatsApp integration access
```

### Environment-Specific Configuration

```bash
# Development
NODE_ENV=development
# Use `.env.local` with test/dummy keys

# Production
NODE_ENV=production
# Use strong, unique keys in production environment
# Rotate keys regularly
```

### Key Rotation Best Practices

1. **Monthly**: Rotate API keys in production
2. **Immediately**: Rotate if leaked or compromised
3. **Before Offboarding**: Rotate when team members leave
4. **Version History**: Keep audit log of key changes

## API Security

### Request Validation

All API requests are validated using Zod:

```typescript
// Example from src/routes/query.ts
const requestSchema = z.object({
  query: z.string().min(1).max(1000),
  conversationId: z.string().optional()
});

// Validates and parses incoming data safely
const validated = requestSchema.parse(req.body);
```

### Secure Headers Middleware

The application uses Hono's `secureHeaders()` middleware:

```typescript
app.use(secureHeaders()) // Adds:
// - Content-Security-Policy
// - X-Content-Type-Options
// - X-Frame-Options
// - X-XSS-Protection
// - Strict-Transport-Security
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```bash
# Recommended: Use reverse proxy or API Gateway
# nginx, Cloudflare, or AWS API Gateway
# Limit: 100 requests per minute per IP
```

### CORS Configuration

```typescript
// Control which origins can access your API
// Edit in src/index.ts if needed
app.use(cors({
  origin: ['https://yourfrontend.com'],
  credentials: true,
  methods: ['POST', 'GET'],
  allowHeaders: ['Content-Type']
}))
```

## Database Security

### Connection Security

```env
# ✅ CORRECT: SSL/TLS enabled
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# ❌ WRONG: No encryption
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### Principle of Least Privilege

```sql
-- Create database user with minimal permissions
CREATE USER health_bot WITH ENCRYPTED PASSWORD 'strong_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE health_chatbot TO health_bot;
GRANT USAGE ON SCHEMA public TO health_bot;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO health_bot;

-- Revoke unnecessary permissions
REVOKE DELETE, DROP ON ALL TABLES IN SCHEMA public FROM health_bot;
```

### Prepared Statements

Drizzle ORM automatically uses parameterized queries, preventing SQL injection:

```typescript
// ✅ SAFE: Uses parameterized query
const user = await db.select()
  .from(users)
  .where(eq(users.id, userId))

// Drizzle never concatenates user input into SQL strings
```

### Backup & Recovery

```bash
# Regular automated backups
pg_dump health_chatbot > backup_$(date +%Y%m%d).sql

# Test restore procedures monthly
pg_restore -d health_chatbot_test backup_*.sql
```

### Database Monitoring

```sql
-- Log all connections
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

-- Log slow queries (>1 second)
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Reload configuration
SELECT pg_reload_conf();
```

## Authentication & Authorization

### API Key Authentication

For production, implement proper authentication:

```typescript
// Example middleware for API key validation
function validateApiKey(req: Request) {
  const apiKey = req.headers.get('X-API-Key')
  
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    throw new Error('Invalid API key')
  }
}

app.post('/api/v1/admin/*', (c) => {
  validateApiKey(c.req)
  // Handle admin request
})
```

### Session Management

For user-facing features, implement session tokens:

```typescript
// Example: JWT-based sessions
import jwt from 'jsonwebtoken'

const token = jwt.sign(
  { userId, exp: Date.now() + 24 * 60 * 60 * 1000 },
  process.env.JWT_SECRET
)
```

### WebSocket Security

For real-time features (if added):

```typescript
// Validate origin
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin
  if (!ALLOWED_ORIGINS.includes(origin)) {
    ws.close(1008, 'Unauthorized origin')
    return
  }
})
```

## Data Protection

### Sensitive Data Handling

Never log or expose:
- API keys or tokens
- Database passwords
- Personal health information (PHI)
- User credentials
- Financial information

```typescript
// ❌ WRONG: Logs sensitive data
console.log('API Key:', process.env.OPENAI_API_KEY)
console.log('Database URL:', process.env.DATABASE_URL)

// ✅ CORRECT: Use masked logging
console.log('API Key:', process.env.OPENAI_API_KEY?.substring(0, 5) + '...')
```

### Data Encryption at Rest

```sql
-- Enable encryption for PostgreSQL
CREATE EXTENSION pgcrypto;

-- Encrypt sensitive columns
ALTER TABLE users ADD COLUMN email_encrypted BYTEA;

-- Use pgcrypto for encryption
UPDATE users SET email_encrypted = pgp_sym_encrypt(email, 'password');
```

### Data Encryption in Transit

```typescript
// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((c, next) => {
    if (c.req.raw.headers.get('X-Forwarded-Proto') !== 'https') {
      return c.text('HTTPS required', 400)
    }
    return next()
  })
}
```

### Data Retention & Deletion

```typescript
// Example: Implement conversation cleanup
// Delete conversations older than 30 days
async function cleanupOldConversations() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  await db.delete(conversations)
    .where(lt(conversations.createdAt, thirtyDaysAgo))
}

// Run daily
setInterval(cleanupOldConversations, 24 * 60 * 60 * 1000)
```

### User Privacy

```typescript
// Never expose full user data
const safeUserData = {
  id: user.id,
  email: maskEmail(user.email),
  createdAt: user.createdAt
  // Never expose: password, apiKey, etc.
}
```

## Dependency Management

### Keep Dependencies Updated

```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies safely
pnpm update

# For security patches only
pnpm update --depth 1
```

### Vulnerability Scanning

```bash
# GitHub: Enable Dependabot alerts
# Settings > Code security and analysis > Enable Dependabot

# Local scanning
npm audit --audit-level=moderate
```

### Lock Files

Always commit lock files to ensure reproducible builds:

```bash
# ✅ COMMIT these
git add pnpm-lock.yaml
git add package.json

# ❌ DON'T COMMIT
git rm node_modules
echo "node_modules/" >> .gitignore
```

### Minimal Dependencies

- Review new dependencies before adding
- Use security-focused alternatives when possible
- Remove unused dependencies regularly

```bash
# Find unused dependencies
npx depcheck
```

## Deployment Security

### Production Checklist

- [ ] NODE_ENV=production
- [ ] All environment variables set securely
- [ ] API keys rotated
- [ ] HTTPS/TLS enabled
- [ ] Database SSL/TLS enabled
- [ ] Firewall configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Error logging configured (not exposing details)
- [ ] Monitoring and alerts set up
- [ ] Backups configured
- [ ] Dependencies audited for vulnerabilities

### Environment Validation

```typescript
// Ensure all required variables are set at startup
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required')
}
```

### Deployment Platforms

#### Docker Deployment

```dockerfile
# ✅ CORRECT: Multi-stage build
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Don't run as root
USER node

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "dist/index.js"]
```

#### Kubernetes Deployment

```yaml
# Store secrets in Kubernetes
apiVersion: v1
kind: Secret
metadata:
  name: health-chatbot-secrets
type: Opaque
stringData:
  DATABASE_URL: postgresql://...
  OPENAI_API_KEY: sk-...

# Reference in deployment
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: health-chatbot-secrets
        key: DATABASE_URL
```

### Network Security

```nginx
# nginx reverse proxy configuration
server {
    listen 443 ssl http2;
    server_name api.health-chatbot.com;
    
    # TLS certificate
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req zone=api;
    
    location /api/v1/ {
        proxy_pass http://localhost:5000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Incident Response

### Security Incident Procedure

1. **Identify**: Detect unusual activity
2. **Isolate**: Limit impact and scope
3. **Contain**: Stop the incident
4. **Eradicate**: Remove the root cause
5. **Recover**: Restore normal operations
6. **Learn**: Document and improve

### If API Keys are Compromised

```bash
# 1. Immediately revoke compromised keys
# Go to OpenAI/OpenRouter/Pinecone dashboards

# 2. Generate new keys
# Update in secrets management system

# 3. Rotate in production
# Update environment variables

# 4. Audit logs
# Check for unauthorized access

# 5. Notify team
# Inform about the incident
```

### Logging & Monitoring

```typescript
// Log security events
function logSecurityEvent(event: string, details: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    details,
    // Don't include sensitive data
    // details should never contain keys/tokens
  }))
}

// Monitor for suspicious patterns
// - Multiple failed authentications
// - Unusual query patterns
// - High error rates
// - Unexpected traffic spikes
```

## Compliance

### HIPAA Compliance (for Healthcare Data)

If handling Protected Health Information (PHI):

- [ ] Enable audit logging
- [ ] Implement access controls
- [ ] Encrypt data at rest and in transit
- [ ] Maintain backup procedures
- [ ] Document data handling procedures
- [ ] Implement breach notification procedures
- [ ] Regular security assessments

### GDPR Compliance (EU Users)

- [ ] Obtain explicit consent for data collection
- [ ] Implement right to access
- [ ] Implement right to deletion ("right to be forgotten")
- [ ] Data protection by design
- [ ] Privacy policy
- [ ] Data Processing Agreement

### PCI DSS (if processing payments)

- [ ] Never store full credit card numbers
- [ ] Use PCI-compliant payment processors
- [ ] Encrypt payment data
- [ ] Implement secure protocols

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Hono Security](https://hono.dev/docs/guides/rpc)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)
- [OpenAI API Security](https://platform.openai.com/docs/guides/authentication)

## Reporting Security Vulnerabilities

If you discover a security vulnerability:

1. **Do NOT open a public issue**
2. **Email**: security@walon-foundation.org
3. **Include**:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

4. **Response time**: We aim to respond within 48 hours

## Security Checklist for Developers

- [ ] No API keys in code or git history
- [ ] Input validation on all endpoints
- [ ] Error handling doesn't expose sensitive info
- [ ] Dependencies are up to date
- [ ] Passwords hashed with bcrypt/argon2
- [ ] Sensitive data encrypted
- [ ] Logging doesn't contain secrets
- [ ] Tests include security test cases
- [ ] Code review completed
- [ ] Security documentation updated

---

**Last Updated**: December 2024
**Maintained By**: Walon Foundation Security Team
