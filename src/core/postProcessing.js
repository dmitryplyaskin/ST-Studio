import { getCurrentChatId } from "/script.js";
import { getContext } from "/scripts/extensions.js";
import { buildUrl, getSettings } from "../ui/settings/settingsUI.js";

function log(...args) {
  console.log("[ST Studio]", ...args);
}

function isPlainObject(value) {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

function hashStringDjb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function extractFencedBlock(text, lang) {
  const needle = "```" + lang;
  const start = text.indexOf(needle);
  if (start === -1) return null;
  const afterLang = start + needle.length;
  const lineBreak = text.indexOf("\n", afterLang);
  if (lineBreak === -1) return null;
  const end = text.indexOf("\n```", lineBreak + 1);
  if (end === -1) return null;
  return text.slice(lineBreak + 1, end).trim();
}

function parseJsonLoose(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function mergeDeep(target, patch) {
  if (!isPlainObject(target)) return patch;
  if (!isPlainObject(patch)) return patch;

  const out = { ...target };
  for (const [k, v] of Object.entries(patch)) {
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = mergeDeep(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function loadState(scope, key) {
  const url = buildUrl(
    `/api/plugins/st-studio/state?scope=${encodeURIComponent(scope)}${
      key ? `&key=${encodeURIComponent(key)}` : ""
    }`
  );
  const res = await fetch(url, { method: "GET", credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`State load failed: ${res.status} ${text}`);
  }
  return await res.json();
}

async function saveState({ scope, key, expectedRevision, state }) {
  const url = buildUrl("/api/plugins/st-studio/state");
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, key, expectedRevision, state }),
  });

  if (res.status === 409) {
    const body = await res.json().catch(() => ({}));
    const current = typeof body?.revision === "number" ? body.revision : null;
    const err = new Error("Revision conflict");
    err.name = "RevisionConflictError";
    err.currentRevision = current;
    throw err;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`State save failed: ${res.status} ${text}`);
  }

  return await res.json();
}

function extractTaggedJsonPatch(messageText) {
  const raw = extractFencedBlock(messageText, "st-studio-state");
  if (!raw) return null;

  const parsed = parseJsonLoose(raw);
  if (!isPlainObject(parsed)) return null;

  const patch = parsed.patch;
  const artifacts = parsed.artifacts;
  if (!isPlainObject(patch)) return null;

  return {
    patch,
    artifacts: isPlainObject(artifacts) ? artifacts : null,
  };
}

export async function runPostProcessingForMessage(messageId, messageType) {
  const { enabled, postProcessingEnabled } = getSettings();
  if (!enabled || !postProcessingEnabled) return;

  const ctx = getContext();
  const msg = ctx?.chat?.[messageId];
  if (!msg || msg.is_user || msg.is_system) return;

  const messageText = String(msg.mes ?? "");
  if (!messageText) return;

  const extracted = extractTaggedJsonPatch(messageText);
  if (!extracted) return;

  const fingerprint = hashStringDjb2(messageText);
  if (!msg.extra || typeof msg.extra !== "object") msg.extra = {};
  if (!msg.extra.stStudio || typeof msg.extra.stStudio !== "object") {
    msg.extra.stStudio = {};
  }
  if (msg.extra.stStudio.postProcessing?.fingerprint === fingerprint) {
    return;
  }

  const chatKey = String(getCurrentChatId?.() ?? "unknown");
  if (!chatKey || chatKey === "unknown") {
    log("Post-processing skipped: chat key is missing", {
      messageId,
      messageType,
    });
    return;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const loaded = await loadState("chat", chatKey);
    const next = mergeDeep(loaded.state ?? {}, extracted.patch);
    try {
      await saveState({
        scope: "chat",
        key: chatKey,
        expectedRevision: loaded.revision,
        state: next,
      });
      msg.extra.stStudio.postProcessing = {
        fingerprint,
        messageId,
        messageType: String(messageType ?? ""),
        appliedAt: Date.now(),
        artifacts: extracted.artifacts,
      };
      log("Post-processing applied", { chatKey, messageId, attempt });
      return;
    } catch (e) {
      if (e?.name === "RevisionConflictError" && attempt === 0) {
        continue;
      }
      throw e;
    }
  }
}
