# Access Pro

Work in this folder. Access Pro is a digital access passport: a person says what they need once, and every place they go understands it without a long explanation. Hackathon demo, built for Oct 19, 2026.

Read `HOW-TO-RUN.md` first. Run the demo with `node server.js`.

## The three products (one shared profile)

1. Phone app: `phone.html`
2. QR scan check-in: `scan.html` (code shown at a location) and `checkin.html` (what the phone opens, no app needed)
3. Check-in kiosk: `kiosk.html`, a big touch screen at an MTA station, airport or clinic

Also: `welcome.html` (silence check, starts by itself), `staff.html` (staff see who needs help and reply), `shared.js` (profile, languages, request and card wording, check-in channel), `server.js` (zero-dependency Node server, check-ins kept in memory).

## Core feature

The AI adapts to the person. Three ways in: speak, type, or stay silent.

- Speak or type: detect the language and switch to it. The request and card come out in that language.
- Silence for 6 seconds: ASK "Are you Deaf or hard of hearing? Do you use ASL?" with Yes and No buttons. Never assume. Only add ASL and written communication if they answer Yes.
- Then ask follow-ups: what they need, how to get an interpreter (book one, own interpreter, video is fine), preferred doctor, anything else.

## Product rules

- Free for the individual. No login, no accounts. The profile is saved locally on the device.
- Only what the person ticks is shared with a location. Nothing else is sent.
- The kiosk clears everything on Start over, on idle (60 s), and after a completed check-in.
- The access card is the main screen on the phone. Readable at arm's length, high contrast (yellow on black), usable with no talking.
- The card says "This is a request, not a booking." Access Pro does not guarantee an accommodation or confirm legal compliance.
- Needs: ASL interpreter, written communication, interpreter in my language, wheelchair access, visual alerts, quiet space, plain language, pregnant (priority help or a seat).
- Places: doctor or hospital, job interview, housing office, court, MTA or transit, airport.
- Languages: English, Spanish, Chinese, Russian. Keep these. Add more only after the core flow is solid.
- Do not add accounts, a database, analytics, or new npm dependencies. Do not remove languages, places, or the kiosk and QR flows.
- Staff-facing text is always English so any staff member can read it.

## AI generation

`generate()` in `shared.js` builds the request and card from templates. To use a real model, set `window.ACCESSPRO_AI_URL` to an endpoint that accepts `POST {profile, situation, lang}` and returns `{request, card}`. If it fails or is unset, the templates are used so the demo never breaks. Keep that fallback. Read any API key from an environment variable on the server. Never put a key in the repo or in browser code.

## Style

Plain language. Short sentences. Large touch targets (at least 48 px; 72 px or more on the kiosk). Visible focus outlines. Respect `prefers-reduced-motion`. Escape all user text before it goes into HTML (use `textContent` or `AP.esc`).

## Known gaps

- Language detection is a guess from the characters typed or spoken, not true voice recognition.
- Microphone listening and QR scanning are untested on real devices.
- Check-ins are in memory and reset when the server restarts.
