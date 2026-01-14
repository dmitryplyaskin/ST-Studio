import { initStStudioExtension } from "./src/main.js";

try {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStStudioExtension);
  } else {
    setTimeout(initStStudioExtension, 50);
  }
} catch (e) {
  console.error("[ST Studio] Initialization error", e);
}
