import { eventSource, event_types } from "../../../../script.js";
import {
  initSettingsUI,
  loadSettings,
  pingState,
  getSettings,
} from "./settings.js";

function log(...args) {
  console.log("[ST Studio]", ...args);
}

function init() {
  log("Extension initialized");
  loadSettings();

  eventSource.on(event_types.APP_READY, async () => {
    const { enabled } = getSettings();
    if (!enabled) return;
    await pingState();
  });
}

try {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 50);
  }

  eventSource.on(event_types.EXTENSION_SETTINGS_LOADED, () => {
    setTimeout(initSettingsUI, 200);
  });
} catch (e) {
  console.error("[ST Studio] Initialization error", e);
}
