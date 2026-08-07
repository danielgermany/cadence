# Cadence functional-prototype orchestration

## Goal

Deliver a polished, browser-only Next.js demo based on the two supplied Cadence `.dc.html` mockups. The demo contains a customer landing page and a Friend/Coach partner portal, with no real messaging, payments, authentication, or data persistence.

## Build inventory

- Customer route (`/`): responsive marketing page, pricing, Friend/Coach comparison, local-only contact confirmation, and guided chat simulator.
- Partner routes (`/partner/sign-in`, `/partner/dashboard`): simulated password and email-code entry, session-scoped access gate, availability switch, queue, earnings, and profile summary.
- Typed fixtures (`lib/demo-data.ts`): provider models, session states, messages, currency formatting, scripted replies, and crisis-resource copy.
- Temporary image (`public/images/cadence-conversation-placeholder.png`): AI-generated editorial placeholder. Replace it with approved, licensed brand imagery before public use.

## Safety and scope

- Present Cadence as a fictional concept and keep a visible non-therapy notice on customer and partner surfaces.
- Intercept only a small, documented set of demo crisis phrases; show immediate crisis-resource copy rather than offering real evaluation, intervention, or a guarantee of response.
- Do not submit contact data, write browser storage for customer information, process payments, send codes, translate text, or create durable session records.
- Partner access is a browser-session demonstration only; it must never be represented as real authentication.

## Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- Manually exercise anchor navigation, connect/hold/resume/end/reset, no-match, crisis interruption, contact confirmation, password sign-in, email-code sign-in, dashboard availability, and sign-out.

## Recommended model routing

| Area | Model | Effort |
|---|---|---|
| Foundation, demo state, safety copy, dashboard | `gpt-5.6-sol` | high |
| Visual components, responsive marketing UI, temporary asset | `gpt-5.6-terra` | medium–high |
| Final accessibility and state-flow review | `gpt-5.6-sol` | xhigh |
