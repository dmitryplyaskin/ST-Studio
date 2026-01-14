import { extension_settings } from "/scripts/extensions.js";

export const STUDIO_SETTINGS_KEY = "stStudio";

const defaultStudioSettings = {
  enabled: true,
  serverBase: "",
  postProcessingEnabled: true,
  processors: [],
};

export function ensureStudioSettings() {
  if (
    !extension_settings[STUDIO_SETTINGS_KEY] ||
    typeof extension_settings[STUDIO_SETTINGS_KEY] !== "object"
  ) {
    extension_settings[STUDIO_SETTINGS_KEY] = {};
  }

  const s = extension_settings[STUDIO_SETTINGS_KEY];
  for (const [k, v] of Object.entries(defaultStudioSettings)) {
    if (!(k in s)) s[k] = v;
  }

  if (!Array.isArray(s.processors)) s.processors = [];

  return s;
}

export function getStudioSettings() {
  return ensureStudioSettings();
}
