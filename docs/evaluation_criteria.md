# Car Dealership Salesperson Evaluation Criteria

This document outlines the qualitative grading rubric and evaluation criteria used by the AI service to score salesperson interactions during roleplay sessions. These criteria are aligned with automotive industry best practices to provide actionable coaching.

## Evaluation Dimensions

The AI system evaluates each individual response across three dimensions, generating scores from 0-10.

### 1. Empathy (40% Weight)
*Focuses on qualitative relationship-building, active listening, and customer-centric responses.*
* **10 Points (Exceeds Expectations):** Identifies underlying concerns, demonstrates exceptional active listening, validates customer feelings with empathy, and builds immediate rapport beyond just the sale.
* **7-9 Points (Meets Expectations):** Polite, welcoming, and attempts to build basic rapport. Acknowledges objections but may not dive deep into underlying concerns.
* **4-6 Points (Needs Improvement):** Interacts transactionally. Interrupts occasionally or misinterprets customer needs. Inconsistent demeanor.
* **0-3 Points (Below Expectations):** Fails to engage professionally, ignores customer concerns, or exhibits an argumentative/unwelcoming attitude.

### 2. Detail (40% Weight)
*Focuses on informational depth, tailored product presentation, and transparency.*
* **10 Points (Exceeds Expectations):** Dynamically pairs vehicle features to the customer's explicitly identified needs (Feature-to-Benefit). Proactively addresses pricing, transparency, and product knowledge with precision.
* **7-9 Points (Meets Expectations):** Explains vehicle features clearly but may rely on generic benefits. Generally answers questions accurately.
* **4-6 Points (Needs Improvement):** Skips needs assessment entirely. Answers questions vaguely or gets lost in unnecessary "fluff".
* **0-3 Points (Below Expectations):** Provides incorrect information, disorganized product pitches, or lacks transparency when answering direct questions.

### 3. Tone Alignment (20% Weight)
*Focuses on adaptability, objection handling, and smoothly guiding the customer.*
* **10 Points (Exceeds Expectations):** Seamlessly matches the customer's communication style. Skillfully transitions through objections without being aggressive, and naturally uses trial closes or establishes firm next steps.
* **7-9 Points (Meets Expectations):** Maintains a professional tone. Attempts to close or establish next steps, but may hesitate or use weaker closing techniques.
* **4-6 Points (Needs Improvement):** Rigid communication style. Flustered by objections or offers weak rebuttals. Inconsistent follow-up plan.
* **0-3 Points (Below Expectations):** Uses a one-size-fits-all, robotic approach. Becomes overly aggressive during objections or avoids closing altogether.

## Categorization Matrix

After blending the three dimensions according to their weighting, the final score (out of 10) dictates the salesperson's category. 

| Score Range | Category Name | Description | Color Code |
| :--- | :--- | :--- | :--- |
| **9.0 - 10.0** | **The Trusted Advisor** | Displays mastery in building rapport, needs assessment, tailored presentation, and objection handling. | 🟢 `#10b981` |
| **7.5 - 8.9** | **The Professional** | Proficient in standard sales processes. Handles objections well and communicates features clearly. | 🔵 `#3b82f6` |
| **5.0 - 7.4** | **The Script-Follower** | Average performance. Relies on standard pitches rather than tailoring the experience to the user. | 🟡 `#f59e0b` |
| **3.0 - 4.9** | **The Order-Taker** | Primarily answers questions without guiding the sale or attempting to understand the customer's motives. | 🔘 `#6b7280` |
| **Below 3.0** | **The Liability** | Sub-par performance. Aggressive, unhelpful, or lacks necessary product knowledge. | 🔴 `#ef4444` |

---
*Note: The AI's evaluation report will structure feedback using headings such as Customer Engagement, Needs Assessment & Pitch, and Objection Handling & Closing, to ensure it aligns with these standards.*
