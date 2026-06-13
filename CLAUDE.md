# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**MailPulse** — a Node.js (CommonJS) service that watches a Gmail inbox over IMAP IDLE,
optionally filters messages, and forwards a summary to **Telegram** via the Telegram Bot API.
It also serves a web dashboard (Express + Socket.IO) for live email logs, filter CRUD, and
browser voice notifications.

Original spec ([prd.md](prd.md)) targeted WhatsApp via `whatsapp-web.js`; that has been
**fully removed** and replaced with Telegram. Ignore the WhatsApp parts of the PRD.

## Architecture

Single Node process started from [src/index.js](src/index.js):

- **[src/index.js](src/index.js)** — Express app + HTTP server + Socket.IO. Wires modules
  together. `processIncomingEmail()` is the pipeline callback: classify (new/reply/forward),
  emit `new_email` to clients for the dashboard, run filter, format, send to Telegram. Hosts
  the `/api/filters` REST routes and serves [public/](public/).
- **[src/imap.js](src/imap.js)** — `imap-simple` connection to `imap.gmail.com:993`. Listens
  for the `mail` event, fetches **only the latest 1 UNSEEN** message, parses with `mailparser`,
  marks seen. Auto-reconnects on `end`/error.
- **[src/filter.js](src/filter.js)** — `isEmailAllowed()`. **Currently bypassed:** it
  `return true` on the first line, so every email is forwarded. The real rule-matching logic
  below that is dead code until the bypass is removed.
- **[src/db.js](src/db.js)** — `sqlite3` wrapper over `database.sqlite`. Creates+seeds the
  `filters` table on boot. Exposes promise-based CRUD.
- **[src/formatter.js](src/formatter.js)** — builds the Telegram message string as **HTML**
  (`<b>` labels) and HTML-escapes dynamic values (sender/subject). Body is intentionally not
  included currently.
- **[src/telegram.js](src/telegram.js)** — `sendTelegramMessage()` POSTs to
  `https://api.telegram.org/bot<token>/sendMessage` using the global `fetch` (Node 18+),
  with `parse_mode: 'HTML'`. No external Telegram library.
- **[public/](public/)** — dashboard (`index.html`, `app.js`, `style.css`). Live logs +
  Indonesian voice (`SpeechSynthesis`). Note `index.html` computes a `<base href>` to support
  Traefik sub-path routing under `/mail-wa`.

## Run / build

```bash
npm install
npm start                                                # node src/index.js, UI on :3000

docker compose -f docker-compose.local.yml up --build -d # local Docker, detached (UI on :3005)
docker compose -f docker-compose.local.yml logs -f       # follow logs
docker compose -f docker-compose.local.yml down          # stop & remove
docker compose up --build                                 # PROD: needs external 'proxy' net + Traefik

# Send a test Telegram message using the container's env (no secrets printed):
docker compose -f docker-compose.local.yml exec -T mail-wa \
  node -e "require('./src/telegram').sendTelegramMessage('Tes 👋').then(console.log)"
```

Code under `src/` and `public/` is baked into the image at build time (`COPY . .`) — after
editing it you must rebuild (`up --build -d`); a plain restart runs the old code. `.env`,
`database.sqlite`, and DB-stored filters survive rebuilds (env_file + volume mount).

There are **no tests** (`npm test` is a placeholder) and no linter configured.

## Conventions & gotchas

- CommonJS (`require`/`module.exports`), Node 18, callback/Promise SQLite — match this style.
- Telegram sending uses the global `fetch` (Node 18+); there is no `node-telegram-bot-api`
  dependency. Keep it that way unless inbound bot commands are needed.
- Config via `.env` (dotenv): `GMAIL_USER`, `GMAIL_APP_PASSWORD` (Google App Password, not the
  account password), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (group chat IDs are negative),
  `PORT`. index.js reads `WEB_PORT || PORT || 3000`.
- Telegram message uses `parse_mode: 'HTML'`. Any dynamic text injected into the message MUST
  be HTML-escaped (see `escapeHtml` in [src/formatter.js](src/formatter.js)) — sender strings
  contain `<...>` angle brackets that would otherwise break parsing.
- Persisted state lives in `database.sqlite` (gitignored).
- Docker volume mounts target `database.sqlite` (a file); it must exist before `up` or Docker
  creates a directory in its place and SQLite breaks.
- Comments and some logs are in Indonesian; the user communicates in Indonesian. Keep new
  user-facing strings/logs consistent with surrounding code.

## When changing behavior

- Re-enabling filtering = remove the early `return true;` in [src/filter.js](src/filter.js#L4).
- Email body is fetched (`parsed.text`/`parsed.html`) but not forwarded; the PRD wants an
  HTML→text, truncated (~1000 char) body. Use `html-to-text` (already a dependency) if adding
  it, and remember to HTML-escape before sending to Telegram.
- Keep prod (`docker-compose.yml`, Traefik/`/mail-wa`) and local (`docker-compose.local.yml`)
  compose files in sync when adding env vars or ports.
