# Access Pro

Your access needs, ready on the spot. A hackathon demo with three products that share one profile.

| Product | File | Status |
| --- | --- | --- |
| 1. iPhone / phone app | `phone.html` | built |
| 2. QR scan check-in | `scan.html` (code on screen), `checkin.html` (what the phone opens) | built |
| 3. Check-in kiosk | `kiosk.html` | built |
| Welcome (silence check, starts by itself) | `welcome.html` | built |
| Staff screen | `staff.html` | built |

Shared code is in `shared.js` (profile, languages, request and card wording, check-in channel).
`qrcode.js` is the MIT-licensed qrcode-generator library.

## Run it

```
node server.js
```

Open `http://localhost:3000` on the computer (it links every screen). The server also prints a Wi-Fi address
(for example `http://192.168.1.20:3000`). Phones on the same Wi-Fi use that address. The scan page
fills it in for you. Check-ins are kept in memory and reset when the server restarts.

Without the server, open the files directly: everything works on one device, but check-ins only
appear in the same browser.

## What is real and what is not

- Request and card wording is **templated** (English, Spanish, Chinese, Russian). To use a real
  AI model, set `window.ACCESSPRO_AI_URL` to an endpoint that accepts
  `POST {profile, situation, lang}` and returns `{request, card}`. If it fails, the template is used.
- Language detection is a **guess from the characters** typed or spoken, not true voice recognition.
- The silence prompt ("Are you Deaf or hard of hearing? Do you use ASL?") only asks. It never assumes.
- The card says "This is a request, not a booking." Access Pro does not guarantee an accommodation.
- No accounts, no database, no analytics. Only what the person ticks is shared at a location.
