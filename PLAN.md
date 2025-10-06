# Docling RAG Agent - Implementatie Status & Volgende Stappen

## ✅ Wat is Voltooid

### Backend (Python - FastAPI)
- ✅ `/chat/stream` endpoint met SSE streaming
- ✅ Conversation management endpoints:
  - `GET /conversations?user_id=xxx` - lijst van gesprekken
  - `GET /conversations/{id}/messages` - messages ophalen
  - `POST /conversations` - nieuwe conversatie
  - `DELETE /conversations/{id}` - verwijderen
- ✅ Automatisch opslaan van messages tijdens chat
- ✅ Database helper functies in `utils/conversation_db.py`
- ✅ RAG agent met knowledge base search

### Frontend (Next.js)
- ✅ Chat interface met streaming responses
- ✅ Sidebar met conversation history
- ✅ "New Chat" functionaliteit
- ✅ API routes die doorverbinden naar backend
- ✅ SSE parsing voor streaming tokens
- ✅ Conversation selectie en laden van messages

### Database (Supabase PostgreSQL)
- ✅ `conversations` tabel (zonder auth constraints)
- ✅ `messages` tabel met foreign keys
- ✅ Indexes voor performance
- ✅ Triggers voor auto-update timestamps

---

## 🐛 Huidig Probleem

**Symptoom:** Conversations worden opgeslagen in database, maar verschijnen niet in de sidebar na het stellen van een vraag.

**Mogelijk oorzaken:**
1. `onConversationCreated()` wordt niet aangeroepen
2. API response format komt niet overeen
3. Frontend laadt conversations wel, maar toont ze niet correct

---

## 🔍 Debugging Stappen (Volgende Sessie)

### Stap 1: Console Logs Checken
Start de applicatie en stel een vraag. Check in browser console (F12):

```
Expected logs:
- "Adding user message: ..."
- "Conversation created: [uuid]"
- "handleConversationCreated called with id: [uuid]"
- "Loading conversations for user: 00000000-0000-0000-0000-000000000001"
- "Loaded conversations: [aantal] [array]"
```

### Stap 2: Database Verificatie
Check in Supabase SQL Editor of data daadwerkelijk wordt opgeslagen:

```sql
-- Check conversations
SELECT * FROM conversations ORDER BY created_at DESC LIMIT 5;

-- Check messages
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;
```

### Stap 3: API Response Checken
Test de API endpoints direct in browser of Postman:

```
GET http://localhost:8000/conversations?user_id=00000000-0000-0000-0000-000000000001
```

Expected response:
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Eerste vraag...",
    "last_message": "antwoord tekst",
    "created_at": "2025-...",
    "updated_at": "2025-..."
  }
]
```

### Stap 4: Frontend State Debugging
Voeg React DevTools toe en check:
- `conversations` state in `FullChatApp` component
- Of `setConversations()` daadwerkelijk wordt aangeroepen
- Of de sidebar component de juiste props ontvangt

---

## 🔧 Mogelijke Fixes

### Fix 1: Forceer Sidebar Refresh
Als `loadConversations()` niet automatisch werkt:

```typescript
// In handleConversationCreated
const handleConversationCreated = (id: string) => {
  console.log('handleConversationCreated called with id:', id)
  setCurrentConversationId(id)

  // Force reload after short delay to ensure backend has saved
  setTimeout(() => {
    loadConversations()
  }, 500)
}
```

### Fix 2: Check API Response Format
Mogelijk issue in backend response. Check `api_server.py` line 383:

```python
@app.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(user_id: str):
    conversations = await conversation_db.get_conversations(db_pool, user_id)
    return [ConversationResponse(**conv) for conv in conversations]
```

Verify dat dit een list returnt, niet een object met een `conversations` key.

### Fix 3: Frontend API Route Check
Check `app/api/conversations/route.ts`:

```typescript
const data = await response.json();
return NextResponse.json(data);  // Should return array directly
```

---

## 📁 File Overzicht

### Backend Files
```
C:\Agents\ottomator-agents\docling-rag-agent\
├── api_server.py                    # Main FastAPI server (MODIFIED)
├── utils/
│   └── conversation_db.py           # Database helper functions (NEW)
├── .env                             # Environment variables
└── pyproject.toml                   # Dependencies
```

### Frontend Files
```
c:\Agents\docling_agent_frontend\
├── app/
│   ├── page.tsx                     # Main chat component (MODIFIED)
│   └── api/
│       ├── chat/route.ts            # Chat API route (MODIFIED)
│       └── conversations/
│           ├── route.ts             # Conversations list API (NEW)
│           └── [id]/messages/route.ts # Messages API (NEW)
└── sql/
    └── supabase_schema.sql          # Database schema (MODIFIED)
```

---

## 🚀 Deployment Checklist (Later)

### Database
- [ ] Voer final schema uit in Supabase (zonder auth constraints)
- [ ] Verwijder RLS policies als ze problemen geven
- [ ] Voeg production indexes toe als nodig

### Backend
- [ ] Verwijder debug logging (console.log's)
- [ ] Voeg authentication toe (Supabase Auth of JWT)
- [ ] Update foreign key constraints naar `auth.users`
- [ ] Voeg rate limiting toe
- [ ] Deploy naar Render/Railway/Fly.io

### Frontend
- [ ] Verwijder debug logging
- [ ] Vervang dummy USER_ID met echte auth
- [ ] Voeg loading states toe
- [ ] Voeg error boundaries toe
- [ ] Deploy naar Vercel

---

## 🎯 Volgende Features (Toekomst)

### Must Have
- [ ] User authentication (Supabase Auth)
- [ ] Conversation titel bewerken
- [ ] Conversation verwijderen (UI + backend koppeling)
- [ ] Search in conversations
- [ ] Mobile responsive design

### Nice to Have
- [ ] Markdown rendering verbeteren
- [ ] Code syntax highlighting
- [ ] File upload voor RAG ingestion
- [ ] Export conversation naar PDF/Markdown
- [ ] Dark mode toggle
- [ ] Keyboard shortcuts

### Advanced
- [ ] Multi-user support met Teams
- [ ] Share conversations via link
- [ ] Conversation folders/tags
- [ ] Voice input (Whisper API)
- [ ] Multi-language support

---

## 🐞 Debug Commands

### Start Backend
```bash
cd C:\Agents\ottomator-agents\docling-rag-agent
python -m uvicorn api_server:app --reload --port 8000
```

### Start Frontend
```bash
cd C:\Agents\docling_agent_frontend
npm run dev
```

### Check Database
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM conversations;
SELECT COUNT(*) FROM messages;
```

### Check Logs
- Backend logs: Terminal waar uvicorn draait
- Frontend logs: Browser console (F12)
- Network requests: Browser DevTools Network tab

---

## 📞 Contact & Resources

- Backend repository: `C:\Agents\ottomator-agents\docling-rag-agent`
- Frontend repository: `C:\Agents\docling_agent_frontend`
- Supabase Dashboard: https://supabase.com/dashboard
- API Documentation: http://localhost:8000/docs (when backend is running)

---

## ⚠️ Known Issues

1. **Sidebar niet refreshing**: Conversations worden opgeslagen maar verschijnen niet automatisch
2. **Logfire warnings**: Kan genegeerd worden of fix met env var `LOGFIRE_IGNORE_NO_CONFIG=1`
3. **No auth**: Gebruikt dummy user_id, moet vervangen worden met echte auth

---

*Last updated: 2025-10-03*
*Next session: Debug sidebar refresh issue*
