# AI Evaluation Criteria — Reflex Training Platform

## Overview

Every salesperson turn is evaluated **in real time** by the AI using two separate mechanisms:

1. **Per-Reply Scoring** — after each turn, producing an immediate numeric score, category, and 1–2 sentences of coaching feedback
2. **Post-Session Qualitative Rating** — after the session ends, a holistic narrative report on overall performance

Both evaluations are AI-generated, guided by prompts grounded in **automotive dealership best practices**.

---

## Per-Reply Scoring

### Three Evaluation Dimensions

Each salesperson reply is scored on three dimensions. The AI reviews the full conversation history before grading the most recent reply.

#### 1. Empathy (0–10) — Weight: 40%

> *Building rapport, active listening, validating customer concerns, and maintaining professional demeanor.*

What good looks like:
- Acknowledging the customer's concerns before pivoting to benefits
- Demonstrating genuine interest in the customer's situation and priorities
- Using the customer's language and matching their emotional register
- Remaining calm and professional even when challenged

#### 2. Detail (0–10) — Weight: 40%

> *Needs assessment, tailored feature-benefit presentation, transparency, and depth of product knowledge.*

What good looks like:
- Asking clarifying questions before pitching
- Linking specific features to the customer's expressed priorities
- Being transparent about pricing, timelines, and constraints
- Demonstrating deep product knowledge without overwhelming

#### 3. Tone Alignment (0–10) — Weight: 20%

> *Adapting communication style, projecting professional confidence, handling objections constructively, and moving toward trial closing.*

What good looks like:
- Matching pace and formality to the customer (e.g., concise with Robert; reassuring with Sarah)
- Maintaining confident but non-pushy body language in voice
- Turning objections into opportunities rather than defending
- Naturally inviting next steps (test drive, pricing review)

---

### Final Score Formula

```
final_score_10  = (Empathy × 0.4) + (Detail × 0.4) + (Tone × 0.2)
final_score_100 = round(final_score_10 × 10)
```

---

### Performance Categories

| Score (0–100) | Category | Hex Color | Meaning |
|---|---|---|---|
| 90–100 | 🟢 **The Trusted Advisor** | `#10b981` | Salesperson builds genuine trust, tailors pitch precisely, moves naturally toward close |
| 75–89 | 🔵 **The Professional** | `#3b82f6` | Solid performance — competent, clear, and customer-focused |
| 50–74 | 🟡 **The Script-Follower** | `#f59e0b` | Adequate but formulaic — missing personalization and deeper listening |
| 30–49 | ⚫ **The Order-Taker** | `#6b7280` | Reactive and passive — not guiding the conversation or building value |
| 0–29 | 🔴 **The Liability** | `#ef4444` | Damaging to the sale — rude, dismissive, evasive, or severely off-topic |

---

### Coaching Feedback

Each reply also generates **1–2 sentences of actionable coaching** based on industry standards. This is displayed immediately to the trainee. Examples:

> *"Strong empathy opener, but follow up with a feature-benefit statement tied to what the customer just said."*

> *"Good product knowledge, but tone felt rushed — slow down and check for understanding before moving to price."*

> *"You deflected the eco concern rather than addressing it directly. Acknowledge the conflict and then reframe."*

---

## Post-Session Qualitative Rating

Generated after the session ends; runs as a background task (may arrive 5–15 seconds after `session_summary`).

> **Important:** The AI evaluates **only the salesperson's turns**. The AI customer's replies are used as context only and are never scored.

### Report Fields

| Field | Type | Description |
|---|---|---|
| `overall_score` | integer 1–10 | Holistic rating across Needs Assessment, Presentation, Overcoming Objections, and Closing |
| `strengths` | string[] (max 3) | Specific sales competencies the salesperson demonstrated well |
| `improvements` | string[] (max 3) | Specific areas needing development |
| `customer_engagement` | string | How well the salesperson built rapport and a comfortable atmosphere |
| `needs_assessment_and_pitch` | string | How accurately they assessed the customer's needs and tailored the pitch |
| `objection_handling_and_closing` | string | How effectively they handled objections and moved toward a close |
| `areas_for_improvement` | string[] | Specific, actionable coaching tips |

### Example Output

```json
{
  "overall_score": 7,
  "strengths": [
    "Excellent rapport building from the first exchange",
    "Clear and accurate color and package presentation",
    "Committed to answering all questions without hesitation"
  ],
  "improvements": [
    "Did not probe for budget constraints before presenting price",
    "Missed opportunity to trial close after the test drive request",
    "Could adapt tone better to Sarah's eco concerns"
  ],
  "detailed_feedback": {
    "customer_engagement": "The salesperson created a welcoming atmosphere and used the customer's name naturally. The opening exchange felt genuine rather than scripted.",
    "needs_assessment_and_pitch": "Features were well-presented but not always tied back to the stated priorities. More targeted benefit-linking would strengthen the pitch.",
    "objection_handling_and_closing": "The eco concerns were acknowledged but not substantively addressed. A brief mention of BMW's sustainability initiatives or the hybrid lineup would have resolved this.",
    "areas_for_improvement": [
      "Use the SPIN technique: probe for Situation, Problem, Implication, and Need before pitching.",
      "After a positive test drive signal, invite the next step explicitly: 'Shall I pull up the paperwork?'",
      "When a customer expresses environmental hesitation, lead with BMW's iX or 3-series PHEV before addressing the M-series."
    ]
  }
}
```

---

## Accuracy Percentage

Displayed in the session summary alongside `avg_score`.

```
accuracy_percentage = (number of salesperson turns with score >= 70 / total salesperson turns) × 100
```

A score of `>= 70` is treated as a "pass" for that turn. This gives a simple pass/fail percentage for performance tracking.

---

## AI Guardrails in Customer Behavior

The AI customer's behavior is also designed to create realistic evaluation scenarios:

| Situation | AI Behavior |
|---|---|
| Salesperson gives vague answer | AI shows hesitation: *"I'm not sure I follow — can you be more specific?"* |
| Salesperson gives strong, confident pitch | AI may commit early: *"That actually makes a lot of sense. Can we arrange a test drive today?"* |
| Salesperson is rude or dismissive | AI asks for a manager or exits the conversation politely |
| Salesperson suggests a non-BMW brand | AI politely declines and redirects back to BMW |
| AI already asked a question | AI **never re-asks** — moves to next priority even if rephrased |
