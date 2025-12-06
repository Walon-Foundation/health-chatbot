# Health Chatbot

A healthcare-focused RAG (Retrieval-Augmented Generation) chatbot built with TypeScript, Hono, and AI-powered document processing. This chatbot leverages OpenAI and OpenRouter for intelligent responses, Pinecone for vector similarity search, and PostgreSQL for data persistence.

## Features

- 🤖 **AI-Powered Responses**: Integration with OpenAI and OpenRouter APIs for intelligent health-related queries
- 📄 **Document Processing**: Extract and process healthcare documents (.docx files) into vector embeddings
- 🔍 **Vector Search**: Pinecone-based semantic search for relevant medical information
- 💾 **Persistent Storage**: PostgreSQL database with Drizzle ORM for data management
- 🔐 **Secure**: Security headers, environment validation, and API key management
- 🌐 **REST API**: Clean REST API built with Hono framework
- 📱 **Webhook Support**: WhatsApp integration via Whapi for multi-channel access
- 🔄 **Document Ingestion**: CLI tool for importing healthcare documents into the vector database

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: [Hono](https://hono.dev/) - Ultrafast web framework
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Vector DB**: [Pinecone](https://www.pinecone.io/) for semantic search
- **AI Models**: OpenAI & OpenRouter APIs
- **Document Processing**: Mammoth for .docx extraction
- **Validation**: Zod for runtime schema validation
- **Messaging**: WhatsApp integration via Whapi

## Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)
- PostgreSQL database
- API Keys:
  - OpenAI
  - OpenRouter
  - Pinecone
  - Whapi (for WhatsApp integration)

### Installation

```bash
# Clone the repository
git clone https://github.com/Walon-Foundation/health-chatbot.git
cd health-chatbot

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your API keys and database URL
```

### Development

```bash
# Start development server
pnpm dev

# Server runs on http://localhost:5000
# API available at http://localhost:5000/api/v1/
```

### Database Setup

```bash
# Generate database migrations
pnpm db:generate

# Apply migrations to database
pnpm db:push

# Open Drizzle Studio for database management
pnpm db:studio
```

### Document Ingestion

```bash
# Ingest health documents into Pinecone vector database
# Place your .docx files in src/data/ directory first
pnpm ingest-doc
```

### Production

```bash
# Build the project
pnpm build

# Start the server
pnpm start
```

## API Endpoints

### Health Check
```
GET /api/v1/
```

### Query Endpoint
```
POST /api/v1/query
Content-Type: application/json

{
  "query": "What are the symptoms of diabetes?",
  "conversationId": "optional-conversation-id"
}
```

### Webhook
```
POST /api/v1/webhook
```
Receives WhatsApp messages and processes them through the chatbot.

## Project Structure

```
.
├── src/
│   ├── config/           # Configuration files for external services
│   │   ├── env.ts        # Environment variables validation
│   │   ├── openai.ts     # OpenAI client setup
│   │   ├── openRouter.ts # OpenRouter client setup
│   │   └── pinecone.ts   # Pinecone client setup
│   ├── db/               # Database configuration
│   │   ├── db.ts         # Database connection
│   │   └── schema.ts     # Drizzle ORM schema
│   ├── lib/              # Utility libraries
│   │   ├── doc-reader.ts # Extract text from .docx files
│   │   ├── doc-splitter.ts # Split documents into chunks
│   │   └── ingest-doc.ts # CLI tool for document ingestion
│   ├── routes/           # API routes
│   │   ├── query.ts      # Query handler
│   │   └── webhook.ts    # WhatsApp webhook handler
│   └── index.ts          # Application entry point
├── drizzle.config.ts     # Drizzle ORM configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/health_chatbot

# Environment
NODE_ENV=development

# Pinecone Vector Database
PINE_CONE_API_KEY=your_pinecone_api_key
PINE_CONE_INDEX_NAME=your_index_name

# AI Models
OPENAI_API_KEY=your_openai_key
OPENROUTER_API_KEY=your_openrouter_key

# WhatsApp Integration
WHAPI_API_KEY=your_whapi_key
```

## Development Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build TypeScript to JavaScript |
| `pnpm start` | Run production build |
| `pnpm ingest-doc` | Process and ingest healthcare documents |
| `pnpm db:generate` | Generate database migrations |
| `pnpm db:push` | Apply migrations to database |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:studio` | Open Drizzle Studio dashboard |

## Security

This project implements multiple security measures:

- **Environment Validation**: All environment variables are validated at startup using Zod
- **Secure Headers**: Hono's `secureHeaders` middleware prevents common web vulnerabilities
- **API Key Management**: Sensitive keys are managed via environment variables (never committed)
- **Database Encryption**: PostgreSQL connection uses SSL
- **CORS & Input Validation**: Request validation with Zod schemas

See [SECURITY.md](./SECURITY.md) for detailed security guidelines.

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details on how to:

- Report bugs
- Suggest features
- Submit pull requests
- Set up your development environment

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

For questions or issues:

1. Check the [SETUP.md](./SETUP.md) guide for setup help
2. Review [SECURITY.md](./SECURITY.md) for security concerns
3. Open an issue on GitHub
4. Contact the Walon Foundation

## Acknowledgments

- Built by the Walon Foundation
- Powered by OpenAI, OpenRouter, and Pinecone
- Built with Hono framework
- Database powered by PostgreSQL and Drizzle ORM

## Roadmap

- [ ] Support for PDF documents
- [ ] Multi-language support
- [ ] User authentication and conversation history
- [ ] Advanced RAG parameters tuning
- [ ] Admin dashboard for document management
- [ ] Rate limiting and usage analytics

---

**Note**: This chatbot is for informational purposes. Always consult with healthcare professionals for medical advice.
