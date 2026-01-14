# ST Studio

Current development status (MVP: state store + basic UI panel).

## Implemented

### Server plugin (ST-Studio-Server)

- **Base architecture**: modules `routes/`, `services/`, `utils/`, `constants`, `types`.
- **Endpoints**:
  - `GET /api/plugins/st-studio/state?scope=global|chat|character|group&key=...`
  - `POST /api/plugins/st-studio/state` with `{ scope, key?, expectedRevision?, state }`
  - `GET /api/plugins/st-studio/events` — SSE stub (keepalive ping).
- **State storage**:
  - path `data/{user}/st-studio/state/...` (derived from `request.user.directories.root`);
  - state versions (`version`), migration/normalization;
  - revisions and conflict on `expectedRevision` (409).

### Client extension (ST-Studio)

- **Settings panel** in the standard SillyTavern style:
  - enable/disable;
  - `serverBase` (optional, defaults to current origin);
  - **Ping state** button.
- **Server ping**:
  - request `GET /api/plugins/st-studio/state?scope=global`;
  - logs response to console;
  - shows status (HTTP code) next to the button.
- **Auto-ping** on `APP_READY` if the extension is enabled.

## Not implemented

- Multi-agent / orchestration.
- UI graph / workflow.
- Patch endpoint and separate health/diagnostics.

## How to test

1. Make sure the server plugin is enabled in `config.yaml` (`enableServerPlugins: true`).
2. Open Extensions settings → ST Studio.
3. Click **Ping state** and check the console log.
