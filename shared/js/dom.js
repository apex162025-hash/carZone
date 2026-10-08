export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export function icon(name, cls = "") {
  return `<i data-lucide="${esc(name)}" class="${cls}"></i>`;
}

export function paintIcons(root) {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons({ attrs: { class: "ico" }, nameAttr: "data-lucide", root: root || document });
  }
}
