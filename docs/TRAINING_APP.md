# Training App Guide

## Overview

The Training App is the web-based client for salesperson trainees. It connects to the backend via WebSocket, plays the AI customer's voice/text, and submits the salesperson's spoken responses for scoring.

**URL:** `https://training.pyuscraft.space/`

---

## How a Session Works

1. **Select Persona** — Choose which AI buyer you'll practice with
2. **Start Session** — AI greets you as a customer visiting the BMW dealership
3. **Respond** — Speak or type your salesperson response
4. **Get Scored** — Each reply is scored live (intent, sentiment, color indicator)
5. **Session Ends** — At 3 minutes (or manual end), receive summary + AI feedback

---

## AI Buyer Personas

| Persona | Trait | What They Care About | Opening Style |
|---|---|---|---|
| **Elena** | Design Connoisseur | Paint quality, interior, finishes | Asks about aesthetics first |
| **Robert** | Prestige Executive | Performance, brand heritage, resale | Asks about engineering & value |
| **Sarah** | Tech Enthusiast | Curved display, connectivity, apps | Asks about digital features |
| **David** | Safety-Minded Father | ADAS, space, child safety | Asks about safety ratings |

---

## AI Customer Behaviour Rules

The AI customer follows these strict rules (regardless of persona):

- **Opening:** May say "I want to buy a car" generically OR mention BMW directly
- **BMW-only:** Will redirect if you suggest non-BMW vehicles
- **Max 6 questions:** AI asks ≤ 6 questions across the full 3-min session
- **Topics explored** (not all required): features, colors, pricing, discounts, on-road price, insurance
- **Decision:** AI judges your pitch holistically — will book test drive or purchase if satisfied
- **Rude handling:** If you're dismissive, AI will ask for manager or leave politely

---

## Scoring System

Each of your responses is scored on:

| Metric | Description |
|---|---|
| **Intent Category** | What your reply was trying to do (greeting, feature pitch, price reveal, closing, etc.) |
| **Score (0–10)** | How well you executed that intent |
| **Sentiment** | Positive, neutral, or negative tone |
| **Color** | 🟢 ≥7 · 🟡 4–6 · 🔴 <4 |

---

## Running Locally

```bash
cd app
npm install
npm run dev          # http://localhost:5174
```

**Environment (optional):**
```bash
# app/.env
VITE_BACKEND_URL=http://localhost:8000
VITE_BACKEND_WS_URL=ws://localhost:8000/ws
```
