import { saveSettingsDebounced } from "../../../../script.js";
import { extension_settings, renderExtensionTemplateAsync } from "../../../extensions.js";

const SETTINGS_KEY = "stStudio";

const defaultSettings = {
  enabled: true,
  serverBase: "",
};

let settingsUIInitialized = false;

function normalizeBase(url) {
  const trimmed = String(url ?? "").trim();
  return trimmed.replace(/\/+$/, "");
}

function resolveBase() {
  const base = normalizeBase(extension_settings[SETTINGS_KEY]?.serverBase);
  return base ? base : "";
}

function buildUrl(path) {
  const base = resolveBase();
  if (!base) return path;
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

export function loadSettings() {
  if (!extension_settings[SETTINGS_KEY]) {
    extension_settings[SETTINGS_KEY] = { ...defaultSettings };
    saveSettingsDebounced();
  }

  let shouldSave = false;
  for (const key of Object.keys(defaultSettings)) {
    if (!(key in extension_settings[SETTINGS_KEY])) {
      extension_settings[SETTINGS_KEY][key] = defaultSettings[key];
      shouldSave = true;
    }
  }

  if (shouldSave) saveSettingsDebounced();

  $("#st-studio-enabled").prop(
    "checked",
    extension_settings[SETTINGS_KEY].enabled !== false
  );
  $("#st-studio-server-base").val(
    normalizeBase(extension_settings[SETTINGS_KEY].serverBase)
  );
}

export function getSettings() {
  if (!extension_settings[SETTINGS_KEY]) loadSettings();
  const s = extension_settings[SETTINGS_KEY];
  return {
    enabled: s.enabled !== false,
    serverBase: normalizeBase(s.serverBase),
  };
}

export function setPingResult(ok, text) {
  const $el = $("#st-studio-ping-result");
  if (!$el.length) return;
  $el.text(text ?? "-");
}

export async function pingState() {
  const { enabled } = getSettings();
  if (!enabled) {
    console.info("[ST Studio] disabled; ping skipped");
    setPingResult(false, "disabled");
    return false;
  }

  const url = buildUrl("/api/plugins/st-studio/state?scope=global");
  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
    });
    const text = await res.text();
    console.info("[ST Studio] ping response", res.status, text);
    setPingResult(res.ok, `${res.status}`);
    return res.ok;
  } catch (error) {
    console.error("[ST Studio] ping failed", error);
    setPingResult(false, "error");
    return false;
  }
}

export async function initSettingsUI() {
  if (settingsUIInitialized) return;
  if ($("#st_studio_settings").length) {
    settingsUIInitialized = true;
    loadSettings();
    return;
  }

  try {
    const settingsHtml = await renderExtensionTemplateAsync(
      "third-party/ST-Studio",
      "settings"
    );

    const $container = $(
      document.getElementById("extensions_settings") ??
        document.getElementById("extensions")
    );

    if (!$container.length) {
      console.warn("[ST Studio]: Settings container not found");
      return;
    }

    if ($("#st_studio_settings").length) {
      settingsUIInitialized = true;
      loadSettings();
      return;
    }

    $container.append(settingsHtml);
    settingsUIInitialized = true;

    loadSettings();

    $(document)
      .off("change", "#st-studio-enabled")
      .on("change", "#st-studio-enabled", function () {
        extension_settings[SETTINGS_KEY].enabled = $(this).prop("checked");
        saveSettingsDebounced();
      });

    $(document)
      .off("input", "#st-studio-server-base")
      .on("input", "#st-studio-server-base", function () {
        extension_settings[SETTINGS_KEY].serverBase = normalizeBase($(this).val());
        saveSettingsDebounced();
      });

    $(document)
      .off("click", "#st-studio-ping")
      .on("click", "#st-studio-ping", async function () {
        await pingState();
      });
  } catch (error) {
    console.error("[ST Studio]: Settings UI init error", error);
  }
}
