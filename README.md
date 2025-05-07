# Unity Voice Learning Platform

The Unity Voice Learning Platform is a comprehensive language learning application designed to help users improve their English vocabulary through topical word lists, interactive tasks, and voice recognition. The platform is built as a modern web application with a robust backend API.

## Project Structure

This project is organized as a monorepo with the following main components:

- `apps/web`: Next.js frontend application
- `apps/api`: Express.js backend API server
- `packages`: Shared libraries and utilities

## Technology Stack

### Frontend (apps/web)
- **Framework**: Next.js 13+ with App Router
- **Language**: TypeScript
- **UI Libraries**: 
  - Tailwind CSS
  - Lucide React (icons)
  - React Icons
- **State Management**: React Context API
- **API Communication**: Fetch API with fallback mechanisms
- **Authentication**: JWT-based authentication
- **Speech Recognition**: Web Speech API
- **Speech Synthesis**: Web Speech API

### Backend (apps/api)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MySQL with connection pooling
- **ORM**: Sequelize
- **API**: RESTful API endpoints
- **Authentication**: JWT-based authentication
- **Environment**: dotenv for configuration
- **Diagnostics**: Comprehensive database connection diagnostics

## Installation Guide

### Prerequisites

1. Node.js (v16.14 or higher)
2. npm (v7 or higher)
3. MySQL Server (v8.0 recommended)
4. Git

### Step 1: Clone and Basic Setup

```bash
# Clone the repository
git clone <repository-url>
cd <repository-name>

# Install root dependencies
npm install

# Install workspace dependencies
npm run install:all
```

### Step 2: Environment Setup

Create `.env` files in both `apps/web` and `apps/api` directories:

```bash
# apps/web/.env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WEB_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_key

# apps/api/.env
# Database Configuration
MYSQL_HOST=your_host
MYSQL_USER=your_user
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_database
MYSQL_PORT=3306
MYSQL_SSL=false

# API Configuration
JWT_SECRET=your_jwt_secret
PORT=5000
CORS_ORIGIN=http://localhost:3000

# OpenAI Configuration
OPENAI_API_KEY=your_openai_key
```

### Step 3: Install Dependencies

```bash
# Core dependencies
npm install

# Frontend specific dependencies
cd apps/web
npm install lucide-react react-icons uuid @types/uuid
npm install @types/parse-json parse-json
npm install tailwindcss postcss autoprefixer
npm install next@latest react@latest react-dom@latest

# Backend specific dependencies
cd ../api
npm install express cors dotenv
npm install sequelize mysql2
npm install jsonwebtoken @types/jsonwebtoken
npm install bcryptjs @types/bcryptjs
npm install openai
```

### Step 4: Database Setup

1. Create MySQL database:
```sql
CREATE DATABASE unity_voice_learning;
```

2. Run database migrations:
```bash
cd apps/api
npx sequelize-cli db:migrate
```

### Step 5: Development Server

```bash
# Start all services (from root directory)
npm run dev

# Or start services individually:
# Frontend (apps/web)
cd apps/web
npm run dev

# Backend (apps/api)
cd apps/api
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Features

- **Vocabulary Learning**: Topic-based word lists with translations and examples
- **User Authentication**: Secure login and registration
- **Progress Tracking**: Monitor user learning progress
- **Voice Interaction**: Speech recognition and synthesis for conversation practice
- **Multi-source Word Retrieval**: Words can be fetched from:
  - Backend API
  - Local database
  - OpenAI generation
  - Fallback mock data
- **Error Resilience**: Multiple fallback mechanisms
- **Diagnostic Tools**: Comprehensive database connection troubleshooting

## Development Guidelines

- Follow TypeScript best practices
- Add comprehensive error handling for all external service calls
- Use environment variables for configuration
- Add logging for important operations
- Run database diagnostics when experiencing connection issues
- Test fallback mechanisms regularly

## Troubleshooting

### Common Issues

1. **Speech Recognition Not Working**
   - Ensure you're using a supported browser (Chrome recommended)
   - Check microphone permissions
   - Use HTTPS in production

2. **Database Connection Issues**
   - Run diagnostics: `npm run diagnose:db`
   - Check environment variables
   - Verify MySQL server is running

3. **Build Errors**
   - Clear `.next` directory: `rm -rf apps/web/.next`
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Update dependencies: `npm update`

### Running Diagnostics

```bash
# Run comprehensive database diagnostics
cd apps/api
npx ts-node src/scripts/diagnoseDb.ts

# Check environment variables
npx ts-node src/scripts/diagnoseDb.ts env

# Quick connection test
npx ts-node src/scripts/diagnoseDb.ts quick
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
