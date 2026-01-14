import { doNavbarIconClick, saveSettingsDebounced } from "/script.js";
import { renderExtensionTemplateAsync } from "/scripts/extensions.js";
import { ensureStudioSettings } from "../state/studioState.js";

function log(...args) {
  console.log("[ST Studio]", ...args);
}

function newId() {
  return `p_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderProcessors() {
  const s = ensureStudioSettings();
  const $list = $("#st-studio-processors");
  if (!$list.length) return;

  const items = s.processors ?? [];
  if (!items.length) {
    $list.html(
      `<div class="st-studio-empty">No processors yet. Click <b>Add</b>.</div>`
    );
    return;
  }

  const html = items
    .map((p) => {
      const id = escapeHtml(p.id);
      const prompt = escapeHtml(p.prompt ?? "");
      const type = String(p.type ?? "post");

      return `
        <div class="st-studio-processor" data-processor-id="${id}">
          <div class="flex-container alignitemscenter spaceBetween flexNoGap marginBot5">
            <div class="flex-container alignitemscenter flexGap10">
              <label class="flex-container alignitemscenter flexGap10 margin0">
                <span class="st-studio-label">Type</span>
                <select class="st-studio-processor-type margin0">
                  <option value="post" ${
                    type === "post" ? "selected" : ""
                  }>Post-processing</option>
                </select>
              </label>
            </div>
            <div
              class="menu_button menu_button_icon st-studio-remove-processor"
              title="Remove processor"
            >
              <i class="fa-solid fa-trash-can"></i>
              <span>Remove</span>
            </div>
          </div>

          <textarea
            class="text_pole st-studio-processor-prompt"
            rows="6"
            placeholder="Write a prompt/instructions for this processor..."
          >${prompt}</textarea>
        </div>
      `;
    })
    .join("");

  $list.html(html);
}

function findProcessorIndex(id) {
  const s = ensureStudioSettings();
  return (s.processors ?? []).findIndex((p) => p && p.id === id);
}

function addProcessor() {
  const s = ensureStudioSettings();
  s.processors.push({ id: newId(), type: "post", prompt: "" });
  saveSettingsDebounced();
  renderProcessors();
}

function removeProcessor(id) {
  const s = ensureStudioSettings();
  const idx = findProcessorIndex(id);
  if (idx === -1) return;
  s.processors.splice(idx, 1);
  saveSettingsDebounced();
  renderProcessors();
}

function updateProcessor(id, patch) {
  const s = ensureStudioSettings();
  const idx = findProcessorIndex(id);
  if (idx === -1) return;
  s.processors[idx] = { ...s.processors[idx], ...patch };
  saveSettingsDebounced();
}

let panelInitialized = false;

export async function initStudioTopbarPanel() {
  if (panelInitialized) return;
  panelInitialized = true;

  try {
    if ($("#st-studio-button").length) {
      renderProcessors();
      return;
    }

    const html = await renderExtensionTemplateAsync(
      "third-party/ST-Studio",
      "studioPanel"
    );

    const $holder = $("#top-settings-holder");
    if (!$holder.length) {
      console.warn("[ST Studio] Top settings holder not found");
      return;
    }

    $holder.append(html);

    // Drawers added dynamically won't have core click handlers attached.
    $("#st-studio-button .drawer-toggle")
      .off("click.ststudio")
      .on("click.ststudio", doNavbarIconClick);

    $(document)
      .off("click", "#st-studio-add-processor")
      .on("click", "#st-studio-add-processor", () => addProcessor());

    $(document)
      .off("click", ".st-studio-remove-processor")
      .on("click", ".st-studio-remove-processor", function () {
        const id = $(this)
          .closest(".st-studio-processor")
          .attr("data-processor-id");
        if (id) removeProcessor(id);
      });

    $(document)
      .off("change", ".st-studio-processor-type")
      .on("change", ".st-studio-processor-type", function () {
        const id = $(this)
          .closest(".st-studio-processor")
          .attr("data-processor-id");
        const value = String($(this).val() ?? "post");
        if (!id) return;
        updateProcessor(id, { type: value });
      });

    $(document)
      .off("input", ".st-studio-processor-prompt")
      .on("input", ".st-studio-processor-prompt", function () {
        const id = $(this)
          .closest(".st-studio-processor")
          .attr("data-processor-id");
        if (!id) return;
        updateProcessor(id, { prompt: String($(this).val() ?? "") });
      });

    renderProcessors();
    log("Topbar panel initialized");
  } catch (e) {
    console.error("[ST Studio] Failed to init topbar panel", e);
  }
}
