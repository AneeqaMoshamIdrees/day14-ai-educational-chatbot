# Day 14 — Learning Playground

An AI-powered educational web application developed as part of the Week 2 full-stack AI engineering project.

The application combines React, FastAPI, Gemini API, prompt engineering, streaming responses, session management, conversation history, and activity-specific AI behavior.

## Features

### 🧩 Brain Buster
- Provides age-appropriate riddles.
- Gives up to three hints.
- Reveals the answer after the third hint or when the user gives up.
- Provides positive feedback for correct answers.
- Allows additional attempts for incorrect answers.
- Avoids repeating riddles within a session.

### ⚡ Quick Fire
- Provides educational questions from different topics.
- Topics include:
  - Science
  - Mathematics
  - Geography
  - English
  - Animals
  - Space
  - General Knowledge
- Provides feedback for correct and incorrect answers.
- Gives a short educational fact after correct answers.
- Avoids repeating questions within a session.

### 🧭 Ask & Explore
- Allows users to ask educational questions.
- Provides simple, concise, age-appropriate answers.
- Encourages curiosity and further learning.
- Uses streaming responses.

## AI Safety

Each activity uses a dedicated system prompt.

The application includes:
- Activity-specific prompts
- Common safety instructions
- Filtering and redirection of inappropriate or harmful conversations
- Child-friendly educational responses

## Conversation History

The application maintains a global Journey History.

- The **6 most recent exchanges** are retained.
- One exchange consists of:
  - User message
  - AI response
- User and AI messages are therefore counted as **one conversation entry**.
- History is shared across all three activities.
- History entries can be viewed from the Home screen and Activity Chat screen.
- History is stored in memory and is not persisted in a database.

## Session Management

Each activity creates an independent in-memory session.

A session ends when:
- The user returns to the Home screen, or
- The user remains inactive for more than 60 seconds.

When a session ends:
- The backend session is deleted.
- Conversation state is cleared.
- The user is redirected to the Home screen.

## Streaming Responses

The application uses streaming responses from the FastAPI backend.

For streaming requests:

```text
User
 ↓
React Frontend
 ↓
FastAPI Backend
 ↓
Gemini API
 ↓
Streaming Response
 ↓
React Frontend
 ↓
AI response appears progressively