# Setup Guide

This guide provides detailed instructions for setting up the Health Chatbot project for development and deployment.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0.0 or higher
- **pnpm** 8.0.0 or higher (or npm 9.0.0+)
- **PostgreSQL** 14.0 or higher
- **Git**

Check your versions:
```bash
node --version
pnpm --version
postgres --version
```

## Step 1: Clone the Repository

```bash
git clone https://github.com/Walon-Foundation/health-chatbot.git
cd health-chatbot
```

## Step 2: Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install

# Or using yarn
yarn install
```

## Step 3: API Keys Setup

You'll need API keys from several services. Create a `.env.local` file in the project root:

```bash
touch .env.local
```

### Get Your API Keys

#### OpenAI API
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy it to your `.env.local`

#### OpenRouter API
1. Go to https://openrouter.ai/keys
2. Create a new API key
3. Copy it to your `.env.local`

#### Pinecone Vector Database
1. Sign up at https://www.pinecone.io/
2. Create a new index (e.g., `health-chatbot`)
3. Copy your API key and index name to `.env.local`

#### Whapi (WhatsApp Integration)
1. Go to https://www.whapi.cloud/
2. Create an account and get your API key
3. Copy to `.env.local` (optional if not using WhatsApp integration)

### Database Setup

#### Option A: Using Docker Compose (Recommended)

If you have Docker installed, create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: health_user
      POSTGRES_PASSWORD: health_password
      POSTGRES_DB: health_chatbot
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Start the database:
```bash
docker-compose up -d
```

#### Option B: Local PostgreSQL Installation

Create a new database:

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql:
CREATE DATABASE health_chatbot;
CREATE USER health_user WITH PASSWORD 'health_password';
ALTER ROLE health_user SET client_encoding TO 'utf8';
ALTER ROLE health_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE health_user SET default_transaction_deferrable TO on;
ALTER ROLE health_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE health_chatbot TO health_user;
\q
```

## Step 4: Environment Variables

Update your `.env.local` file with all required variables:

```env
# Database Configuration
DATABASE_URL=postgresql://health_user:health_password@localhost:5432/health_chatbot

# Environment
NODE_ENV=development

# Pinecone Configuration
PINE_CONE_API_KEY=your_pinecone_api_key_here
PINE_CONE_INDEX_NAME=your_index_name_here

# AI Models
OPENAI_API_KEY=sk-your_openai_key_here
OPENROUTER_API_KEY=your_openrouter_key_here

# WhatsApp Integration (Optional)
WHAPI_API_KEY=your_whapi_key_here
```

**Important**: Never commit `.env.local` to version control!

## Step 5: Initialize Database

```bash
# Generate Drizzle migrations
pnpm db:generate

# Apply migrations to your database
pnpm db:push

# Verify the schema (optional)
pnpm db:studio
```

This will create all necessary tables in your PostgreSQL database.

## Step 6: Prepare Health Documents

1. Place your healthcare documents (`.docx` files) in the `src/data/` directory:

```bash
mkdir -p src/data
cp path/to/your/health_documents.docx src/data/
```

2. The project comes with a sample file: `health_rag_1000_qa.docx`

## Step 7: Ingest Documents

Process your documents and load them into Pinecone:

```bash
pnpm ingest-doc
```

This will:
- Extract text from .docx files
- Split documents into chunks
- Generate embeddings using OpenAI
- Upload embeddings to Pinecone

## Step 8: Start Development Server

```bash
pnpm dev
```

The server will start on `http://localhost:5000`

You should see output:
```
Server is running on http://localhost:5000
```

## Step 9: Verify Installation

Test the API with curl:

```bash
# Health check
curl http://localhost:5000/api/v1/

# Query endpoint (if RAG is set up)
curl -X POST http://localhost:5000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"query":"What is diabetes?"}'
```

## Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql postgresql://health_user:health_password@localhost:5432/health_chatbot

# If connection fails, verify:
# 1. PostgreSQL is running
# 2. Credentials are correct
# 3. Database exists
```

### Missing API Keys

```bash
# Verify your .env.local file exists and contains all keys
cat .env.local

# Keys should not be empty
grep OPENAI_API_KEY .env.local
```

### Pinecone Issues

```bash
# Test Pinecone connectivity
# The ingest-doc script will fail if Pinecone is unreachable

# Check your:
# 1. PINE_CONE_API_KEY is correct
# 2. PINE_CONE_INDEX_NAME matches your actual index
# 3. Index is active in Pinecone dashboard
```

### Port Already in Use

```bash
# Change the port in src/index.ts (currently 5000)
# Or kill the process using port 5000
lsof -ti:5000 | xargs kill -9
```

### TypeScript Compilation Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Clear TypeScript cache
rm -rf dist/
pnpm build
```

## Development Commands Reference

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start with hot reload |
| `pnpm build` | Compile TypeScript |
| `pnpm start` | Run production build |
| `pnpm ingest-doc` | Process healthcare documents |
| `pnpm db:generate` | Create migrations |
| `pnpm db:push` | Apply migrations |
| `pnpm db:studio` | Open database GUI |

## Project Structure

```
health-chatbot/
├── src/
│   ├── config/          # External service configuration
│   ├── db/              # Database setup and schemas
│   ├── lib/             # Core utilities
│   ├── routes/          # API route handlers
│   └── index.ts         # App entry point
├── drizzle.config.ts    # Drizzle ORM config
├── tsconfig.json        # TypeScript settings
├── package.json         # Dependencies
├── SETUP.md            # This file
├── SECURITY.md         # Security guidelines
├── LICENSE             # MIT License
└── README.md           # Project overview
```

## Next Steps

1. **Read the README.md** for project overview
2. **Review SECURITY.md** for security best practices
3. **Check API routes** in `src/routes/`
4. **Customize documents** for your use case
5. **Deploy** following deployment guidelines

## Getting Help

- **Setup issues**: Check troubleshooting section above
- **Security questions**: See SECURITY.md
- **API questions**: Review route handlers in src/routes/
- **Database issues**: Check Drizzle ORM documentation
- **Report bugs**: Open an issue on GitHub

## System Requirements

Recommended for development:
- 8GB RAM minimum
- 2GB free disk space
- Stable internet connection (for API calls)
- macOS, Linux, or WSL on Windows

## Production Deployment

Before deploying to production:

1. Set `NODE_ENV=production` in your environment
2. Use strong, unique API keys
3. Enable database SSL
4. Set up proper error logging
5. Configure rate limiting
6. Use a process manager (PM2, systemd, etc.)
7. Enable CORS appropriately
8. Set up monitoring and alerts

See SECURITY.md for detailed production guidelines.
