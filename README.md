## Broviki

![broviki-removebg-preview](https://github.com/user-attachments/assets/2e52e226-c5fc-4d04-9b19-40b06cc15d53)

Demo project for managing ONVIF video cameras.
Uses the [onvif](https://github.com/agsh/onvif) library.

### Structure

```
apps/
  web/       Next.js frontend (port 3000)
  api/       NestJS ONVIF API (port 3001) + socket.io `/camera-events`
  mediamtx/  MediaMTX — RTSP → WebRTC/WHEP (API :9997, HLS :8888, WebRTC :8889)
```

### Setup (Docker — no Node/TS required)

```shell
git clone https://github.com/agsh/broviki.git
cd broviki
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). Camera list is stored in a Docker volume (`broviki-data`).

Default Compose uses **host networking** so ONVIF WS-Discovery (UDP multicast `239.255.255.250:3702`) and RTSP see the LAN. This needs Linux Docker Engine.

| URL | Service |
|-----|---------|
| [http://localhost:3000](http://localhost:3000) | Web UI |
| [http://localhost:3001/api](http://localhost:3001/api) | Nest API |
| [http://localhost:8889](http://localhost:8889) | MediaMTX WebRTC / WHEP |
| [http://localhost:8888](http://localhost:8888) | MediaMTX HLS (MSE backup) |

**Docker Desktop (macOS/Windows)** — host mode is limited; use bridge and add cameras by IP:

```shell
docker compose -f docker-compose.bridge.yml up --build
```

If WebRTC works on the same machine but fails from another device on the LAN, set the host’s LAN IP:

```shell
MTX_WEBRTCADDITIONALHOSTS=192.168.1.10 docker compose up --build
```

Stop: `docker compose down` (add `-v` to also wipe the SQLite volume).

### Setup (local Node)

```shell
git clone https://github.com/agsh/broviki.git
cd broviki
cp apps/api/.env.example apps/api/.env
npm install
npm run db:migrate
npm run dev
```

- Web: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001/api](http://localhost:3001/api)
- MediaMTX WebRTC: [http://localhost:8889](http://localhost:8889)
- MediaMTX HLS (optional / MSE backup): [http://localhost:8888](http://localhost:8888)

`apps/web` proxies HTTP `/api/*` to the Nest API. WebSockets go to the API directly (`hostname:3001`); override with `NEXT_PUBLIC_API_ORIGIN` if needed.

### Playback

1. Connect a camera (ONVIF `getStreamUri`).
2. `GET /api/cam/:id/playback` registers an on-demand MediaMTX path for the RTSP source.
3. The UI plays live video via **WebRTC/WHEP** on port `8889`.
4. Switching the ONVIF media profile updates the RTSP source and restarts the WHEP session.

MSE/HLS (`hls.js`) is kept as a backup under `apps/web/src/components/playback-backups/mse/`.

### Events

- UI **Events** tab opens a socket.io client on namespace `/camera-events`.
- First listener starts the ONVIF pull-point; when nobody is listening, the camera unsubscribes.
- Status includes `listenerCount` so you can see how many clients are attached.

### Device info

After **Connect** (and on **Refresh**), the API collects ONVIF identity into `deviceInfo` (shown on the **Info** tab):

| Field | Source |
|-------|--------|
| Manufacturer, Model, Firmware, Serial number, Hardware ID | `GetDeviceInformation` |
| Name, Location, hardware, Profile, type, supported profiles | `GetScopes` (`onvif://www.onvif.org/…`) |
| Supported services | `GetServices` (filled during connect) |

Parsing lives in `apps/api/src/cameras/device-info.util.ts`.

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | MediaMTX + API + web |
| `npm run dev:api` | Nest only |
| `npm run dev:web` | Next only |
| `npm run dev:mediamtx` | MediaMTX only |
| `npm run build` | Build API + web |
| `npm run db:migrate` | Prisma migrate (SQLite) |
| `npm run db:studio` | Prisma Studio (opens SQLite via absolute `file://` URL) |

Cameras are stored in SQLite via Prisma (`apps/api/dev.db`).

> Prisma 7 Studio rejects `DATABASE_URL=file:./dev.db`. The `db:studio` script passes `file://$(pwd)/dev.db` so migrate/client can keep the relative URL.

### Env (API)

See `apps/api/.env.example`:

- `PORT` — Nest HTTP + socket.io (default `3001`)
- `WEB_ORIGIN` — CORS / socket.io origins (default `http://localhost:3000`)
- `MEDIAMTX_API_URL`, `MEDIAMTX_HLS_PORT`, `MEDIAMTX_WEBRTC_PORT`

### Things that work

- Add / remove / select cameras (manual or SOAP Discovery)
- Edit connection settings (hostname, port, credentials, WS-Security, path)
- Connect / disconnect ONVIF session
- Info tab — manufacturer, model, firmware, serial, scopes, services
- Media profile selection (updates stream URI + MediaMTX path)
- Snapshot + live WebRTC playback
- ONVIF events over WebSocket (pull-point only while listeners exist)
- PTZ controls (connect first, then hold direction buttons)

### Things that don't work yet

- Recording / playback of archive
- Everything else beyond the list above
