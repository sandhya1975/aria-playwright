# 🧠 RAG Document Assistant — n8n + Pinecone + Google Gemini

**Part of Sandhya Yatham's AI Automation Portfolio**
Built as part of the Outskill AI Fellowship · April 2026

---

## What This Does

A Retrieval-Augmented Generation (RAG) pipeline built entirely in n8n — no code required.

You upload a document. The workflow chunks it, embeds it into a Pinecone vector store, and creates a question-answering AI agent that retrieves only the relevant content to answer your queries accurately.

Instead of asking an AI to summarise an entire document (which loses detail), this workflow lets you ask precise questions and get answers grounded in the actual document content.

---

## Tech Stack

| Component | Tool |
|---|---|
| Workflow engine | n8n |
| Vector database | Pinecone |
| Embedding model | Google Gemini (768 dimensions) |
| AI Agent | n8n AI Agent node |
| Retrieval tool | Pinecone Vector Store (query mode) |

---

## Workflow Architecture
**Phase 1 — Ingest:** Document is chunked → each chunk converted to a 768-dimension embedding vector → stored in Pinecone index.

**Phase 2 — Query:** User question is embedded → Pinecone returns the most relevant chunks → AI Agent generates a grounded answer using only that retrieved content.

---

## Key Technical Details

- **Embedding model:** Google Gemini (text-embedding-004) — 768-dimension vectors
- **Pinecone index:** Created at 768 dimensions to match Gemini embedding output exactly
- **Similarity metric:** Cosine similarity
- **Retrieval:** Top-K chunks returned to the AI Agent as context
- **Agent:** Anthropic Claude synthesises retrieved chunks into a clear answer

---

## What I Learned Building This

**The dimension mismatch problem** — The most common RAG failure in n8n is a mismatch between your Pinecone index dimensions and your embedding model output. Google Gemini embeddings output 768 dimensions. Your Pinecone index must be created at exactly 768. If they don't match, the insert fails. Solution: always create the Pinecone index FIRST at 768, then connect the embedding node.

**OpenAI vs Gemini embeddings** — Not interchangeable. OpenAI outputs 1536 dimensions; Gemini outputs 768. Switching models mid-build means rebuilding the Pinecone index from scratch.

**Vector store as a tool** — The AI Agent node doesn't query Pinecone directly. You attach the Pinecone Vector Store as a tool to the agent in query mode. The agent decides when to call it based on the user's question.

---

## Skills Demonstrated

- RAG pipeline design and implementation
- Vector database setup and management (Pinecone)
- AI embedding concepts applied in practice
- n8n AI Agent node with custom tool attachment
- Debugging dimension mismatch errors
- Multi-node workflow architecture in n8n

---

## About the Builder

**Sandhya Yatham** — Head of Development & Test | QA Leader | AI Automation Engineer
15+ years in QA and engineering leadership. Outskill AI Fellowship 2026.

- 📧 yvsand81@yahoo.com
- 💼 linkedin.com/in/sandhyayatham
- 🐙 github.com/sandhya1975
