# AI People Track

AI People Track is a local-first people-counting demo built with React, Vite, TensorFlow.js, and Express. Person detection and tracking run in the browser; webcam frames are never sent to the API. The API keeps session and crossing events in memory, while registered account credentials are stored locally as salted password hashes.

## Features

- Browser-side person detection with COCO-SSD and TensorFlow.js
- Live occupancy, ENTRY/EXIT counts, analytics, and event history
- Multi-camera selection and live stream switching
- Stabilized tracking IDs and confidence-checked line crossings
- Administrator login, public registration, password change, and local recovery
- No MySQL service required for the demo

## Requirements

- Node.js 20 or newer and npm
- A modern browser with webcam support (Chrome, Edge, or Firefox recommended)
- Internet access for the first download of the detection model and web fonts

Use `localhost` or HTTPS for camera access. Browsers block webcam access on insecure network origins and `file://` pages.

## Project layout

```text
AI-PEOPLE-TRACK/
├── backend/          Express API, authentication, in-memory tracking store
├── frontend/         Vite + React dashboard and browser-side detection
├── .local-data/      Registered-account JSON store (created when needed)
├── database/         Legacy MySQL schema; unused by the demo backend
└── package.json      npm workspaces and combined development command
```

## Quick start

Install dependencies from the project root:

```bash
npm install
```

Create the local backend environment file. In Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

Edit `backend/.env` and configure the administrator email/password, a unique recovery code, and a strong JWT secret. Generate a JWT secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep `backend/.env` private. It is ignored by Git and is never sent to the browser. The example file contains placeholders, not usable credentials.

Start both services from the project root:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API listens on [http://localhost:4000](http://localhost:4000). Sign in with the administrator values configured in `backend/.env`, or choose **Create an account** to register.

The services can also run in separate terminals:

```bash
npm run dev -w backend
npm run dev -w frontend
```

Build the frontend with `npm run build`. `npm start` starts only the backend API. For a local production-bundle preview after building, run `npm run preview -w frontend`.

## Accounts and recovery

Open [http://localhost:5173/register](http://localhost:5173/register) or choose **Create an account** on the login page. Passwords must be 4–128 characters. Registration is rate limited. Account records are saved in the Git-ignored `.local-data/accounts.json`; passwords are stored as per-account salted scrypt hashes.

The configured administrator remains separate from registered accounts. Change the admin password in **Settings** after signing in, or use **Forgot password?** on the login page with `ADMIN_EMAIL` and `ADMIN_PASSWORD_RESET_CODE` from `backend/.env`. The reset flow is local and does not send email. Reset attempts are rate limited. Admin password changes are stored in `.env` as an internally managed hex value; leave it in place for subsequent logins.

## Using the camera

1. Sign in and open **Dashboard** or **Live tracking**.
2. Select an available camera input from the selector.
3. Choose **Start camera** and allow browser camera access.
4. Wait for COCO-SSD to load. Its first run downloads model assets into the browser cache; inference then runs locally.
5. Green boxes and `P-<number>` labels show detections and temporary track IDs. The dashed horizontal line is the counting line.
6. A top-to-bottom crossing records an ENTRY; bottom-to-top records an EXIT. Current occupancy is the number of people detected in the latest frame.
7. Change the selector while live to switch cameras. The new stream is started before the old one is released, and the session camera label is updated.
8. Choose **Stop camera** to end the stream and close its session.

Camera permission is requested only after **Start camera** is selected. Device names may not appear in the selector until permission has been granted.

## Detection and counting

COCO-SSD Lite MobileNet V2 runs through TensorFlow.js. Predictions are filtered to the `person` class at a minimum confidence of `0.70`; frames are sampled approximately every 220 ms. Tracking associates boxes by center distance and overlap, smooths box movement, and retires tracks after 1.8 seconds without a detection. Track IDs are temporary, local to the camera session, and are not facial identities.

Crossings require a track age of at least one second, four stable frames beyond the line hysteresis band, and confidence of at least `0.80`. ENTRY and EXIT have separate eight-second per-track cooldowns, and the backend independently validates confidence and suppresses duplicates. Detection, tracking, and video overlays remain in the browser; the API receives only session metadata and crossing events.

## Pages

- **Dashboard:** current occupancy, today's in-memory entry/exit totals, camera feed, and detection status.
- **Live tracking:** camera overlay, track IDs, crossing direction, active count, and camera selection.
- **Analytics:** hourly and daily event aggregates for 7, 30, or 90 days.
- **History:** date/type filters and CSV export for up to 500 events.
- **Settings:** local camera/session label, counting line position, and administrator password change.

## API reference

Except for login, registration, admin password reset, and health, routes require `Authorization: Bearer <token>`.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Public | Sign in as the configured admin or a registered account |
| `POST` | `/api/auth/register` | Public, rate limited | Create an account and receive a token |
| `POST` | `/api/auth/reset-password` | Public, rate limited | Reset the admin password with the local recovery code |
| `GET` | `/api/auth/me` | Authenticated | Validate the current token |
| `POST` | `/api/auth/change-password` | Admin | Change the configured admin password |
| `GET` | `/api/health` | Public | Check API health |
| `POST` | `/api/sessions` | Authenticated | Start a tracking session |
| `PATCH` | `/api/sessions/:sessionId/camera` | Authenticated | Update the active session's camera label |
| `PATCH` | `/api/sessions/:sessionId/stop` | Authenticated | End a tracking session |
| `POST` | `/api/events` | Authenticated | Record an ENTRY or EXIT crossing |
| `GET` | `/api/summary/today` | Authenticated | Get today's entry/exit totals |
| `GET` | `/api/analytics?days=7` | Authenticated | Get daily/hourly aggregates and totals |
| `GET` | `/api/history` | Authenticated | List up to 500 events; supports `from`, `to`, and `type` filters |

Event requests include `sessionId`, `trackingId`, `eventType` (`ENTRY` or `EXIT`), and numeric `confidence` from `0.80` to `1.0`. The event's camera label is snapshotted when it is recorded.

## Troubleshooting

- **Camera permission denied:** allow camera access for `localhost` in browser site settings, reload, and start the camera again.
- **No camera appears:** connect or enable a webcam, allow camera permission, and check the selector again.
- **Camera is already in use:** close other tabs or applications using that device.
- **Model fails to load:** allow the initial download from TensorFlow Hub and reload after connectivity returns.
- **API unavailable:** run `npm run dev` from the project root and check [http://localhost:4000/api/health](http://localhost:4000/api/health). If using custom ports, update `FRONTEND_URL` and `frontend/vite.config.js`.
- **No crossings appear:** keep the person visible while crossing well beyond the line; detections and crossings must pass the confidence and stability thresholds.
- **Analytics/history are empty:** events appear only after confirmed crossings. Sessions and events reset whenever the backend restarts.
- **Forgot Password is unavailable:** configure `ADMIN_PASSWORD_RESET_CODE` in `backend/.env` and restart the backend.

## Storage and security

This project is a local demo, not a production identity or event-management system. Registered accounts persist in `.local-data/accounts.json` as salted scrypt hashes. The administrator password and recovery code stay in the ignored backend environment file. Tracking sessions and events are in memory and are cleared on backend restart; the legacy SQL file under `database/` is not used.

Webcam frames are processed in the browser and are not uploaded. The browser stores its bearer token in local storage; sign out to remove it. Before exposing the app beyond localhost, use HTTPS, restrict network access, rotate the example secrets, and replace the in-memory event store and local recovery flow with production-grade persistent storage and account-recovery controls.