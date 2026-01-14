# ST Studio

Текущее состояние разработки (MVP: стейт‑хранилище + базовая UI‑панель).

## Что реализовано

### Серверный плагин (ST-Studio-Server)

- **Базовая архитектура**: модули `routes/`, `services/`, `utils/`, `constants`, `types`.
- **Эндпоинты**:
  - `GET /api/plugins/st-studio/state?scope=global|chat|character|group&key=...`
  - `POST /api/plugins/st-studio/state` с `{ scope, key?, expectedRevision?, state }`
  - `GET /api/plugins/st-studio/events` — SSE‑заготовка (keepalive ping).
- **Хранилище стейта**:
  - путь `data/{user}/st-studio/state/...` (берётся из `request.user.directories.root`);
  - версии стейта (`version`), миграция/нормализация;
  - ревизии и конфликт по `expectedRevision` (409).

### Клиентское расширение (ST-Studio)

- **Панель настроек** в стандартном стиле ST:
  - включение/выключение;
  - `serverBase` (опционально, по умолчанию текущий origin);
  - кнопка **Ping state**.
- **Пинг сервера**:
  - запрос `GET /api/plugins/st-studio/state?scope=global`;
  - лог ответа в консоль;
  - отображение статуса (HTTP‑код) рядом с кнопкой.
- **Автопинг** при `APP_READY`, если расширение включено.

## Что НЕ реализовано

- Multi‑agent / оркестрация.
- UI‑граф/воркфлоу.
- Patch‑эндпоинт и отдельные health/diagnostics.

## Как проверить

1. Убедиться, что server‑plugin включён в `config.yaml` (`enableServerPlugins: true`).
2. Открыть настройки расширений → ST Studio.
3. Нажать **Ping state** и проверить лог в консоли.
