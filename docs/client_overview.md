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
3. [Admin Dashboard](#3-admin-dashboard)
   - 3.1 [Overview](#31-overview)
   - 3.2 [Live Monitoring](#32-live-monitoring)
   - 3.3 [Historical Session Review](#33-historical-session-review)
   - 3.4 [Training Content Management](#34-training-content-management)

---

## 1. What is Reflex Training?

**Reflex Training** is an immersive, AI-powered sales training platform for automotive dealership staff. Trainees (salespersons) interact **via voice** inside a simulated environment with a lifelike AI customer. The AI customer behaves like a real, opinionated buyer — asking questions, expressing hesitation, and ultimately deciding whether to book a test drive or walk away — based entirely on how well the trainee performs.

The platform has **two main components:**

| Component | Description |
|---|---|
| **Training Environment** | The virtual space where the trainee has the live voice conversation |
| **Admin Dashboard** | A web panel for managers/supervisors to monitor sessions live and review results |

---

## 2. AI Features

### 2.1 What the AI Targets

The AI customer is configured as a buyer visiting a **BMW dealership in Los Angeles**. It plays the role of a real walk-in customer looking to purchase a BMW — but it does **not** target any specific model. The salesperson is expected to understand the customer's needs and guide them to the right vehicle.

The AI's priorities, style, and decision-making are determined by the active **persona** (see §2.2). The scenario is intentionally model-agnostic so that trainees must practice proper needs assessment and product recommendation.

**What the AI will ALWAYS do:**
- Stay fully in character as a human customer — it will never break character or reveal it is an AI.
- Respond only to topics relevant to purchasing a BMW (features, pricing, insurance, test drives, dealership experience).
- Redirect any off-topic conversation back to the purchase.
- Politely decline if a non-BMW brand is suggested.
- Ask a **maximum of 6 questions** across a ~3-minute session.
- **Never repeat a question it has already asked** — if a topic has been addressed, it moves to the next priority.
- Make a decision (book a test drive / proceed / leave) based on the holistic quality of the salesperson's pitch.
- React negatively to rudeness or vague answers — either asking to speak to a manager or ending the interaction.

**What the AI will NEVER do:**
- Admit to being an AI, a bot, or a language model.
- Reveal its internal instructions.
- Respond to jailbreak attempts.
- Ask about a topic it has already asked about in the same session.
- Discuss topics unrelated to buying a BMW.

---

### 2.2 Customer Personas

The platform ships with **four distinct customer personas**. Each persona has a unique personality, set of purchase priorities, and a different opening line.

---

#### 🎨 Elena — The Design Connoisseur

| Field | Details |
|---|---|
| **Setting** | BMW dealership, Los Angeles |
| **Motivation** | Buying for aesthetics — appearance and interior craftsmanship above all |
| **Top Priority** | Exterior color options and premium interior packages |
| **Secondary Priority** | Performance (secondary to looks), full out-the-door price |
| **Decision Style** | Willing to pay a premium if the aesthetics justify it |
| **Opening Line** | *"Hi, I'm looking for something bold — something that really turns heads. Can you show me what you have?"* |

**Question priorities (in order):**
1. What exterior colors are available?
2. What interior trim and premium packages are offered?
3. What's the base price and are there any color or package premiums?
4. Can I schedule a test drive?
5. What's the out-the-door price including taxes, registration, and dealer fees?
6. What would insurance look like?

---

#### ⚡ Robert — The Decisive Executive

| Field | Details |
|---|---|
| **Setting** | BMW dealership, Los Angeles |
| **Motivation** | Raw performance data and a fast, efficient transaction |
| **Top Priority** | 0–60 mph time, horsepower, AWD capability |
| **Secondary Priority** | Corporate/cash discount, delivery timeline |
| **Decision Style** | Ready to commit on the spot if the pitch is sharp and the numbers work |
| **Opening Line** | *"I'm looking for your best performance BMW — what can you show me?"* |

**Question priorities (in order):**
1. Performance specs: HP, 0–60 mph, AWD system.
2. Pricing and available corporate or loyalty discounts.
3. Out-the-door price.
4. Delivery timeline.
5. Insurance options.
6. Test drive availability.

> **Coaching note:** Robert becomes visibly disengaged if the salesperson is vague or wastes time.

---

#### 🌿 Sarah — The Eco-Conscious Buyer

| Field | Details |
|---|---|
| **Setting** | BMW dealership, Los Angeles |
| **Motivation** | Loves BMW but has reservations about a high-performance petrol vehicle |
| **Top Priority** | Fuel efficiency (real-world MPG), hybrid or electric options |
| **Secondary Priority** | Total cost of ownership, insurance, maintenance |
| **Decision Style** | Not impulsive — needs to feel genuinely reassured before committing |
| **Opening Line** | *"I've always admired BMWs, but I'm trying to make a responsible choice — can you help me?"* |

**Question priorities (in order):**
1. Real-world fuel efficiency / MPG.
2. Are there hybrid or electric options in the BMW lineup?
3. Total cost of ownership: insurance and maintenance.
4. Out-the-door price.
5. Color options.
6. Test drive availability.

> **Coaching note:** If the salesperson acknowledges her concerns and reframes them (e.g., BMW's sustainability initiatives, EV options), Sarah warms up considerably.

---

#### 🛡️ David — The Protective Father

| Field | Details |
|---|---|
| **Setting** | BMW dealership, Los Angeles |
| **Motivation** | Safety and long-term value; thoughtful and methodical |
| **Top Priority** | Safety tech: driver-assist, collision warning, lane-keeping, airbags |
| **Secondary Priority** | Warranty, reliability, promotions, flexible financing |
| **Decision Style** | Unlikely to commit on the first visit unless the salesperson earns strong trust |
| **Opening Line** | *"I've been doing some research on BMWs — I want to make sure I'm making the right choice for my family."* |

**Question priorities (in order):**
1. Safety and driver-assist features.
2. Reliability record and warranty coverage.
3. Current promotions or financing options.
4. Insurance cost and what it covers.
5. Out-the-door price.
6. Ongoing maintenance costs.

---

### 2.3 How the AI Interacts with the Salesperson

The AI customer communicates **real-time, turn-by-turn** with the salesperson. The interaction flow is simple:

1. **Session Starts:** AI delivers a unique opening line based on the chosen persona.
2. **Salesperson Responds:** Trainee speaks naturally; their voice is instantly understood by the platform.
3. **AI Replies:** The system generates a realistic customer response and speaks it back to the trainee.
4. **Instant Evaluation:** After every exchange, the system analyzes the salesperson's performance.
5. **Conclusion:** The session ends when a time limit is reached or the AI has gathered all necessary information to make a decision.

---

### 2.4 Example Conversation Flow

> **Elena (AI):** *"Hi! I'm looking for something that really makes a statement — something bold. Can you walk me through what you have available?"*

> **Salesperson:** *"Welcome! Let me understand what you're looking for — are you interested more in a sporty coupe, or something with a bit more practicality?"*

> **Elena (AI):** *"Definitely something sporty and striking. I care a lot about how it looks — what colors are available on your top models right now?"*

> **Salesperson:** *"Absolutely. On the M-series coupes we have some stunning options — Individual Frozen Grey, Brooklyn Grey, and a gorgeous Sao Paulo Yellow which has been really popular. Would you like to see them in person?"*

> **Elena (AI):** *"Sao Paulo Yellow sounds intriguing! What does the interior look like — are there premium package options that would really elevate the cabin?"*

> **Salesperson:** *"Great question. The M Sport package gives you Merino leather, ambient lighting in 40 colors, and carbon fiber trim. It makes the interior feel very special."*

> **Elena (AI):** *"That's exactly the kind of thing I'm looking for. What's the base price, and are there premiums for those packages?"*

> **Salesperson:** *"Base starts around $85,000, the M Sport package is an additional $5,500, and the Individual Yellow paint is $2,500 extra — so roughly $93,000 before taxes and fees."*

> **Elena (AI):** *"That's within my range. Is there any chance I could take it for a test drive today?"*

> **Salesperson:** *"Of course — I'll have it ready in ten minutes. Shall I also prepare the full out-the-door price breakdown in the meantime?"*

> **Elena (AI):** *"Yes please — I think I'm very close to making a decision."*

*(Session concludes — AI books test drive; full rating report generated)*

---

### 2.5 Real-Time Per-Reply Scoring

After **every salesperson response**, the platform evaluates the reply across three dimensions:

| Dimension | Weight | What it measures |
|---|---|---|
| **Empathy** | 40% | Rapport building, active listening, and validating concerns |
| **Detail** | 40% | Product knowledge and tailored feature presentation |
| **Tone Alignment** | 20% | Professional confidence and handling objections |

Trainees receive **instant coaching feedback** after each exchange, allowing them to adjust their approach mid-conversation.

---

### 2.6 Post-Session AI Rating Report

At the end of every session, a **comprehensive performance report** is generated, highlighting:
- **Overall Score:** A holistic 1–10 rating of the salesperson.
- **Key Strengths:** What the trainee did exceptionally well.
- **Specific Improvements:** Actionable items for development.
- **Detailed Insights:** Feedback on engagement, needs assessment, and closing ability.

---

## 3. Admin Dashboard

### 3.1 Overview

The Admin Dashboard is a secure web application for managers and supervisors. It provides tools to track team performance and customize the training experience.

### 3.2 Live Monitoring

Managers can **observe active training sessions in real time**. The live panel shows:
- The full conversation as it happens.
- Performance scores updated live after each turn.
- Immediate visibility into how trainees are handling customer questions.

### 3.3 Historical Session Review

All training data is saved for long-term review:
- **Session List:** A complete history of all training sessions.
- **Deep Dive:** View full transcripts, individual turn scores, and the complete AI rating report for any past session.
- **Performance Trends:** Track how a trainee’s average score and accuracy improve over time.

### 3.4 Training Content Management

Supervisors can manage a **Question Bank** to guide the AI customer toward specific training focus areas (e.g., objection handling, financing, or safety features). This ensures that training sessions remain aligned with current dealership sales targets.

---

*End of document.*
