import { t, getLang } from "../../../shared/js/i18n.js";

let currentDrawer = null;

export function openDrawer({ title, subtitle = "", bodyHtml = "", fullDetailsUrl = null, actionsHtml = "" }) {
  closeDrawer();

  const backdrop = document.createElement("div");
  backdrop.className = "drawer-backdrop";

  backdrop.innerHTML = `
    <div class="drawer-panel" role="dialog" aria-modal="true">
      <div class="drawer-header">
        <div>
          <h3 style="margin:0;font-size:var(--fs-18);font-weight:800">${title}</h3>
          ${subtitle ? `<div style="font-size:var(--fs-12);color:var(--c-ink-500);margin-block-start:4px">${subtitle}</div>` : ""}
        </div>
        <button type="button" class="icon-btn sm" data-drawer-close aria-label="Close">
          <i data-lucide="x" style="inline-size:18px;block-size:18px"></i>
        </button>
      </div>

      <div class="drawer-body">
        ${bodyHtml}
      </div>

      <div class="drawer-footer">
        ${fullDetailsUrl ? `
          <a href="${fullDetailsUrl}" class="btn primary grow" style="text-decoration:none">
            <i data-lucide="external-link" style="inline-size:16px;block-size:16px"></i>
            <span>${t("admin.drawer.fullDetails")}</span>
          </a>
        ` : ""}
        ${actionsHtml}
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  currentDrawer = backdrop;

  if (window.lucide && window.lucide.createIcons) {
    window.lucide.createIcons({ root: backdrop });
  }

  requestAnimationFrame(() => {
    backdrop.classList.add("open");
  });

  const close = () => closeDrawer();

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop || e.target.closest("[data-drawer-close]")) {
      close();
    }
  });

  const keyHandler = (e) => {
    if (e.key === "Escape") {
      close();
      window.removeEventListener("keydown", keyHandler);
    }
  };
  window.addEventListener("keydown", keyHandler);
}

export function closeDrawer() {
  if (!currentDrawer) return;
  const drawer = currentDrawer;
  currentDrawer = null;
  drawer.classList.remove("open");
  setTimeout(() => {
    drawer.remove();
  }, 250);
}
