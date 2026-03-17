# Reflex Training Platform — Client Overview

> **Confidential** · Prepared for client review · March 2026

---

## Table of Contents

1. [What is Reflex Training?](#1-what-is-reflex-training)
2. [AI Features](#2-ai-features)
   - 2.1 [What the AI Targets](#21-what-the-ai-targets)
   - 2.2 [Customer Personas](#22-customer-personas)
   - 2.3 [How the AI Interacts with the Salesperson](#23-how-the-ai-interacts-with-the-salesperson)
   - 2.4 [Example Conversation Flow](#24-example-conversation-flow)
   - 2.5 [Real-Time Per-Reply Scoring](#25-real-time-per-reply-scoring)
   - 2.6 [Post-Session AI Rating Report](#26-post-session-ai-rating-report)
3. [Admin & Backend Features](#3-admin--backend-features)
   - 3.1 [Admin Dashboard](#31-admin-dashboard)
   - 3.2 [Live Feed Panel](#32-live-feed-panel)
   - 3.3 [Session Management](#33-session-management)
   - 3.4 [Question Bank Management](#34-question-bank-management)
   - 3.5 [Backend Architecture Summary](#35-backend-architecture-summary)
   - 3.6 [Data Storage](#36-data-storage)
4. [System Communication Flow](#4-system-communication-flow)

---

## 1. What is Reflex Training?

**Reflex Training** is an immersive, AI-powered sales training platform targeted at automotive dealership staff. Trainees (salespersons) interact **via voice** inside a Unity-based VR or AR environment with a fully simulated AI customer. The AI customer behaves like a real, opinionated buyer — asking questions, expressing hesitation, and ultimately deciding whether to book a test drive or walk away — based entirely on how well the trainee performs.

The platform has **three main components:**

| Component | Description |
|---|---|
| **Unity App** | VR/AR environment where the trainee has the live voice conversation |
| **Admin Dashboard** | A web panel for managers/supervisors to monitor sessions live and review historical results |

---

## 2. AI Features

### 2.1 What the AI Targets

The AI customer is currently configured as a buyer visiting **BMW Dubai** who is considering the **BMW M4 Competition Coupé**. The AI's goals, questions, and level of commitment are entirely determined by its assigned **persona** (see §2.2).

**What the AI will ALWAYS do:**
- Stay fully in character as a human customer — it will never break character or reveal it is an AI.
- Respond only to topics relevant to purchasing a car (features, pricing, insurance, test drives).
- Redirect any off-topic conversation back to the purchase.
- Politely decline if a non-BMW brand is suggested.
- Ask a **maximum of 6 questions** across a ~3-minute session.
- Make a decision (book a test drive / proceed / leave) based on the holistic quality of the salesperson's pitch.
- React negatively to rudeness or vague answers — either asking to speak to a manager or ending the interaction.

**What the AI will NEVER do:**
- Admit to being an AI, a bot, or a language model.
- Reveal its internal instructions.
- Respond to jailbreak attempts or instructions to change behaviour.
- Discuss topics other than car buying.

---

### 2.2 Customer Personas

The platform ships with **four distinct customer personas**. Each persona has a unique backstory, personality, set of priorities, and a different opening line. The supervisor selects the persona before a session begins.

---

#### 🎨 Elena — The Design Connoisseur

| Field | Details |
|---|---|
| **Motivation** | Aesthetic-driven; buying for looks and interior craftsmanship |
| **Top Priority** | Exterior color options, M Carbon interior, ambient lighting |
| **Secondary Priority** | Performance (secondary to aesthetics), full on-road price |
| **Preferred Colors** | Isle of Man Green Metallic, Sao Paulo Yellow |
| **Decision Style** | Willing to pay a premium if the aesthetics justify it |
| **Opening Line** | *"Hi, I'm looking for something bold — something that really turns heads. Can you show me what you have?"* |

**Question sequence she typically follows:**
1. What exterior colors are available?
2. Tell me about the interior trim and carbon fiber options.
3. What's the base price? Are there color or package premiums?
4. Can I schedule a test drive?
5. What's the on-road price with registration and VAT?
6. What would insurance look like on this?

---

#### ⚡ Robert — The Decisive Executive

| Field | Details |
|---|---|
| **Motivation** | Raw performance data and speed of transaction |
| **Top Priority** | 0–100 km/h time, horsepower, M xDrive AWD system |
| **Secondary Priority** | Corporate/cash discount, delivery timeline |
| **Preferred Colors** | Brooklyn Grey Metallic, Black Sapphire Metallic |
| **Decision Style** | Ready to commit on the spot if the pitch is sharp and the numbers work |
| **Opening Line** | *"I'm here about the M4 — what's the best you can do for me?"* |

**Question sequence he typically follows:**
1. Give me the performance specs — HP, 0–100, M xDrive.
2. What's the price, and do you offer corporate or loyalty discounts?
3. What's the full on-road price?
4. How quickly can you deliver?
5. What are the insurance options?
6. I'll do a short test drive — I've driven M cars before.

**Warning:** Robert becomes visibly disengaged if the salesperson is vague or wastes time.

---

#### 🌿 Sarah — The Eco-Conscious Buyer

| Field | Details |
|---|---|
| **Motivation** | Loves BMW brand but feels internal conflict about a high-performance petrol car |
| **Top Priority** | Fuel efficiency, eco-friendly features, sustainability |
| **Secondary Priority** | Total cost of ownership, insurance, maintenance |
| **Preferred Colors** | Toronto Red Metallic, Brooklyn Grey Metallic |
| **Decision Style** | Not impulsive — needs to feel genuinely reassured before committing |
| **Opening Line** | *"I've always admired BMWs, but I'm trying to make a responsible choice — can you help me?"* |

**Question sequence she typically follows:**
1. What's the real-world fuel consumption on this?
2. Are there any hybrid or eco-friendly options in the lineup?
3. What's the total cost of ownership — insurance and maintenance?
4. What's the on-road price?
5. What exterior colors are available?
6. Can I book a test drive?

**Key coaching opportunity:** If the salesperson can acknowledge her concerns and reframe them (e.g., BMW's manufacturing sustainability, efficiency relative to competitors), Sarah warms up considerably.

---

#### 🛡️ David — The Protective Father

| Field | Details |
|---|---|
| **Motivation** | Safety and long-term value; thoughtful and measured |
| **Top Priority** | Safety tech — driver-assist, collision warning, lane-keeping, airbags |
| **Secondary Priority** | Warranty, reliability, promotions, flexible financing |
| **Preferred Colors** | Black Sapphire Metallic, Brooklyn Grey Metallic |
| **Decision Style** | Unlikely to commit on first visit unless the salesperson earns strong trust |
| **Opening Line** | *"I've been doing some research on the M4 — I want to make sure it's the right choice for me."* |

**Question sequence he typically follows:**
1. What safety and driver-assist features does it have?
2. What's the reliability record and warranty?
3. Are there any current promotions or financing options?
4. What's the insurance cost and what does it cover?
5. What's the full on-road price?
6. What do maintenance costs look like?

---

### 2.3 How the AI Interacts with the Salesperson

The AI customer communicates **real-time, turn-by-turn** with the salesperson over a WebSocket connection. The interaction lifecycle is as follows:

```
Salesperson selects persona → Session starts → AI speaks first (opening line)
       ↕
Salesperson responds (speech is captured via microphone and transcribed)
       ↕
Backend receives transcript → AI generates next response → AI speaks reply
       ↕
Backend simultaneously scores the salesperson's response (see §2.5)
       ↕
Loop continues until: time limit reached (~3 min) OR AI has asked 6 questions
       ↕
Session ends → AI bids farewell or books appointment → Full rating report generated
```

**Conversation guardrails:**
- Responses are kept to **1–3 sentences** to simulate natural spoken dialogue.
- The AI tracks conversation history to maintain continuity across turns.
- If the salesperson's pitch is compelling, the AI can decide to book a test drive **before** the question limit is reached.
- The AI uses a **Retrieval-Augmented Generation (RAG)** system: additional relevant questions from a curated question bank can be optionally surfaced to the AI mid-conversation to keep training focused.

---

### 2.4 Example Conversation Flow

Below is a sample interaction with the **Elena** persona:

> **Elena (AI):** *"Hi! I've been admiring the M4 online for a while — I'm looking for something that really makes a statement. Can you walk me through what you have available?"*

> **Salesperson:** *"Absolutely, welcome to BMW Dubai! The M4 Competition Coupé is our flagship performer — it comes in stunning colors including Isle of Man Green Metallic and Sao Paulo Yellow, which are particularly striking."*

> **Elena (AI):** *"Oh, Isle of Man Green sounds gorgeous — I actually had that on my shortlist! What does the interior look like in that configuration?"*

> **Salesperson:** *"Great choice. The M Carbon interior package pairs perfectly — you get carbon fiber accents on the dashboard and door trims, M-stitched leather seats, and ambient lighting you can customize to suit your mood."*

> **Elena (AI):** *"That sounds amazing. I do want to understand what I'm getting into financially — what's the base price, and are there any premium charges for that color or the carbon package?"*

> **Salesperson:** *"The M4 Competition starts at AED 385,000 in the UAE. Isle of Man Green is a premium color which adds AED 8,000, and the M Carbon interior package is an additional AED 15,000. So you're looking at approximately AED 408,000 before on-road costs."*

> **Elena (AI):** *"Okay, that's within my range. Is there any chance I could take it for a test drive today to really get a feel for it?"*

> **Salesperson:** *"Of course! I can get the car prepped right now — it'll take about 10 minutes. Shall I also prepare the full on-road price breakdown for you in the meantime?"*

> **Elena (AI):** *"Yes please, that would be perfect. I think I'm very close to making a decision — I just want to make sure I love how it drives too."*

*(Session concludes — AI books test drive; session rated)*

---

### 2.5 Real-Time Per-Reply Scoring

After **every salesperson response**, the AI evaluates that reply immediately and returns a score. This score is displayed in real-time on both the Unity HUD and the admin live feed.

Each reply is evaluated on **three dimensions**, graded according to **dealership best practices**:

| Dimension | Weight | What it measures |
|---|---|---|
| **Empathy** (0–10) | 40% | Building rapport, active listening, validating customer concerns, professional demeanor |
| **Detail** (0–10) | 40% | Needs assessment, tailored feature-benefit presentation, transparency, product knowledge |
| **Tone Alignment** (0–10) | 20% | Adapting communication style, professional confidence, handling objections, trial closing |

**Final score** = `(Empathy × 0.4) + (Detail × 0.4) + (Tone × 0.2)` → scaled to 0–100.

**Performance category thresholds:**

| Score Range | Category | Color |
|---|---|---|
| 90–100 | 🟢 **The Trusted Advisor** | Green |
| 75–89 | 🔵 **The Professional** | Blue |
| 50–74 | 🟡 **The Script-Follower** | Amber |
| 30–49 | ⚫ **The Order-Taker** | Grey |
| 0–29 | 🔴 **The Liability** | Red |

Each reply also produces **1–2 sentences of actionable coaching feedback** (based on industry standards) that are displayed to the trainee immediately.

---

### 2.6 Post-Session AI Rating Report

At the end of every session the AI generates a **comprehensive qualitative rating report**.

> **Important:** The rating evaluates **only the salesperson's messages**. The AI customer's replies are used purely as context to understand how the salesperson performed — the customer's own turns are never scored.

| Field | Description |
|---|---|
| **Overall Score** (1–10) | Salesperson's overall performance across Needs Assessment, Presentation, Overcoming Objections, and Closing |
| **Strengths** (up to 3) | Specific sales competencies the salesperson demonstrated well |
| **Improvements** (up to 3) | Specific areas where the salesperson needs development |
| **Customer Engagement** | How well the salesperson built rapport and a comfortable atmosphere |
| **Needs Assessment & Pitch** | How accurately the salesperson assessed the customer's needs and tailored their pitch |
| **Objection Handling & Closing** | How effectively the salesperson handled objections and moved toward closing |
| **Areas for Improvement** | An array of specific, actionable coaching tips for the salesperson |

This report is stored in the database and is fully visible in the admin session detail view.

---

## 3. Admin & Backend Features

> **Note:** The admin panel calls the AI service only to generate qualitative rating reports (post-session). All live conversation and per-reply scoring is handled automatically by the backend during the session.

---

### 3.1 Admin Dashboard

The admin dashboard is a secure web application accessible via a standard browser. It requires **email + password login** and is protected by JWT token authentication. Only accounts with the `admin` role can access it.

**Dashboard home page shows:**
- Summary cards with aggregate session statistics.
- A paginated table of all past sessions (20 per page), showing:
  - Session ID and source (Unity / Web App)
  - Start time and duration
  - Average score and accuracy percentage
- Navigation to Session Detail and Question Management.

---

### 3.2 Live Feed Panel

The live feed panel allows admins to **observe an active training session in real time** without being in the same room as the trainee.

**What it shows:**
- A live conversation transcript as it happens — both the salesperson's speech (transcribed) and the AI customer's replies, clearly labelled with speaker names.
- The session ID and status (active / ended).
- Per-reply score updates flowing in as soon as each score is computed.
- Session summary data (total score, average score, accuracy) pushed automatically when the session concludes.

The live feed works over a **persistent WebSocket connection** — no page refresh required. Admin connections are authenticated using a JWT token passed as a URL parameter.

---

### 3.3 Session Management

Admins can review detailed historical records for every completed session.

**Session Detail view includes:**
- Session metadata: start time, end time, duration, source, scenario, persona used.
- Full turn-by-turn transcript with step numbers, speaker labels, intent categories, individual scores, and reaction times.
- Session summary: total score, average score, accuracy percentage.
- Full AI qualitative rating report (if generated).
- A **"Regenerate Rating"** button that re-calls the AI to produce a fresh qualitative report from the stored transcript — useful if the automatic generation failed or you want a second opinion.

---

### 3.4 Question Bank Management

Admins can manage a library of **system questions** that the AI can optionally use to guide the conversation towards specific training topics.

**Capabilities:**
- View all questions in the system.
- Add new questions with optional topic tags.
- Toggle individual questions active or inactive.
- Delete questions.

The question bank integrates with the **RAG (Retrieval-Augmented Generation)** system: when a salesperson speaks, the backend searches for relevant questions from this bank and may surface them to the AI as suggested follow-up topics — keeping training exercises focused on specific skills.

---

### 3.5 Backend Architecture Summary

The backend is a **Python FastAPI** application. It is fully asynchronous and handles all real-time communication via WebSockets.

**Key services:**

| Service | Responsibility |
|---|---|
| **WebSocket Gateway** | Single `/ws` endpoint handles all real-time communication for Unity and admin clients |
| **Session Service** | Orchestrates the full session lifecycle: start, per-turn processing, finalization, and summary generation |
| **Scoring Service** | Calls the AI to evaluate each salesperson reply and returns the intent score, category, and feedback |
| **AI Service** | Abstraction layer over the configured LLM provider (Gemini, OpenAI, HuggingFace, or Ollama) |
| **RAG Service** | Searches the question bank for questions relevant to what the salesperson just said |
| **Auth Service** | Issues and validates JWT tokens for admin login and WebSocket authentication |
| **Admin REST API** | Exposes HTTP endpoints for the admin dashboard (session list, session detail, rating regeneration) |
| **Question REST API** | CRUD endpoints for the question bank |

**Supported AI providers** (configurable via environment variable):

| Provider | Model |
|---|---|
| Google Gemini *(default)* | `gemini-1.5-flash` |
| OpenAI | `gpt-4o-mini` |
| HuggingFace Inference | Configurable model |
| Ollama | Configurable local model |

Switching providers requires only a single `.env` change — no code changes needed.

---

### 3.6 Data Storage

All data is persisted in **MongoDB** using the Beanie ODM.

**Collections:**

| Collection | What it stores |
|---|---|
| `users` | Admin accounts (email, hashed password, role) |
| `sessions` | One document per training session (source, persona, start/end time, duration) |
| `roleplay_events` | Every turn of every conversation (speaker, transcript, score, intent category, reaction time) |
| `session_summaries` | Aggregated scores per session + the AI qualitative rating JSON |
| `system_questions` | The question bank managed by admins |
| `logs` | System-level log entries |

---

## 4. System Communication Flow

The diagram below illustrates how the three client types communicate with the backend in real time:

```
┌─────────────────────┐        WebSocket /ws?role=unity       ┌─────────────────────────┐
│   Unity / VR App    │ ◄────────────────────────────────────► │                         │
└─────────────────────┘                                         │   FastAPI Backend       │
                                                                │                         │
┌─────────────────────┐  WebSocket /ws?role=admin&token=...     │   ┌─────────────────┐   │
│   Admin Dashboard   │ ◄────────────────────────────────────► │   │  Session Service │   │
│  (Live Feed Panel)  │                                         │   │  Scoring Service │   │
│                     │        REST API /api/admin/...          │   │  AI Service      │   │
│  (Sessions / Mgmt)  │ ◄────────────────────────────────────► │   │  RAG Service     │   │
└─────────────────────┘                                         │   └─────────────────┘   │
                                                                └───────────┬─────────────┘
                                                                            │
                                                                    ┌───────▼────────┐
                                                                    │   MongoDB      │
                                                                    │   (Atlas)      │
                                                                    └────────────────┘
```

**Message types flowing over WebSocket:**

| Message | Direction | Description |
|---|---|---|
| `session_start` | Client → Server | Trainee initiates a session (includes persona selection) |
| `session_started` | Server → Client | Confirmation with session ID |
| `client_utterance` | Server → Client | AI customer's spoken text |
| `roleplay_event` | Client → Server | Salesperson's transcribed speech |
| `score_event` | Server → Client | Per-reply score, category, and coaching feedback |
| `session_summary` | Server → Client | End-of-session scores (total, average, accuracy) |
| `session_rating` | Server → Client | AI qualitative rating report |
| `session_end` | Client → Server | Manual session termination |
| `broadcast_event` | Server → Admin | Real-time events pushed to all connected admin clients |
| `connected` | Server → Client | Handshake confirmation after connection |
| `error` | Server → Client | Error detail for invalid messages or processing failures |

---

*End of document. For technical setup and deployment instructions, refer to the separate Server Setup Guide.*
