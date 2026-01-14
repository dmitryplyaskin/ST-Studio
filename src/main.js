import { eventSource, event_types } from "/script.js";
import {
  initSettingsUI,
  loadSettings,
  pingState,
  getSettings,
} from "./ui/settings/settingsUI.js";
import { initStudioTopbarPanel } from "./ui/topbar/studioDrawer.js";
import { runPostProcessingForMessage } from "./core/postProcessing.js";

function log(...args) {
  console.log("[ST Studio]", ...args);
}

let initialized = false;

export function initStStudioExtension() {
  if (initialized) return;
  initialized = true;

  log("Extension initialized");
  loadSettings();

  eventSource.on(event_types.APP_READY, async () => {
    const { enabled } = getSettings();
    if (!enabled) return;
    await pingState();
    await initStudioTopbarPanel();
  });

  eventSource.makeLast(
    event_types.CHARACTER_MESSAGE_RENDERED,
    async (messageId, type) => {
      try {
        await runPostProcessingForMessage(messageId, type);
      } catch (e) {
        console.error("[ST Studio] Post-processing error", e);
      }
    }
  );

  eventSource.on(event_types.EXTENSION_SETTINGS_LOADED, () => {
    setTimeout(initSettingsUI, 200);
  });
}
