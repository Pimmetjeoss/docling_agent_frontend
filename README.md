# Docling RAG Agent - Frontend

Modern Next.js frontend for the Docling RAG Agent. AI-powered knowledge assistant with semantic search through your documents.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?logo=tailwindcss)

## 🎯 Overview

This is the frontend application for the Docling RAG Agent. It provides a clean, modern chat interface to interact with your knowledge base powered by RAG (Retrieval Augmented Generation).

**Backend Repository:** [docling_agent](https://github.com/Pimmetjeoss/docling_agent)

## ✨ Features

- 💬 **Real-time streaming** - See AI responses as they're generated
- 🎨 **Modern UI** - Clean, responsive design with dark mode
- 📱 **Mobile-friendly** - Works perfectly on all devices
- ⚡ **Fast** - Optimized Next.js with edge runtime
- 🔄 **Live updates** - Auto-reconnect to backend
- 📊 **Health monitoring** - See backend status and knowledge base stats

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Backend API running (see [backend repo](https://github.com/Pimmetjeoss/docling_agent))

### Installation

```bash
# Clone the repository
git clone https://github.com/Pimmetjeoss/docling_agent_frontend.git
cd docling_agent_frontend

# Install dependencies
npm install
```

### Configuration

Create a `.env.local` file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development

```bash
npm run dev
# Open http://localhost:3000
```

## 📁 Project Structure

```
docling_agent_frontend/
├── app/
│   ├── api/              # API routes (proxy to backend)
│   │   ├── chat/         # Chat streaming
│   │   └── health/       # Health check
│   ├── components/       # React components
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── lib/
│   └── utils.ts          # Utilities
└── .env.local.example    # Config template
```

## 🔌 API Integration

| Route | Backend | Description |
|-------|---------|-------------|
| `/api/chat` | `POST /chat/stream` | Streaming chat |
| `/api/health` | `GET /health` | Health check |

## 🚢 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Click deploy button
2. Add env var: `NEXT_PUBLIC_API_URL=<your-backend-url>`
3. Deploy!

## 🔧 Development

```bash
# Terminal 1 - Backend
cd ../docling_agent
uv run python api_server.py

# Terminal 2 - Frontend
npm run dev
```

## 🐛 Troubleshooting

**Can't connect to backend?**
- Check backend is running on port 8000
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Test: `curl http://localhost:8000/health`

## 📄 License

MIT License

## 🔗 Links

- [Backend Repo](https://github.com/Pimmetjeoss/docling_agent)
- [Docling](https://github.com/DS4SD/docling)
- [Next.js](https://nextjs.org)
