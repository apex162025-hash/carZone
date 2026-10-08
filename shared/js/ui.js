import { paintIcons } from "./dom.js";

function host() {
  return document.querySelector(".device-inner") || document.body;
}

export function toast(message) {
  const wrap = host();
  let stack = wrap.querySelector(".toast-wrap");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-wrap";
    wrap.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function openLayer(className, inner) {
  const el = document.createElement("div");
  el.className = `overlay ${className}`;
  el.innerHTML = inner;
  host().appendChild(el);
  paintIcons(el);
  return el;
}

export function sheet(body) {
  return new Promise((resolve) => {
    const el = openLayer("", `<div class="sheet" role="dialog"><div class="handle"></div>${body}</div>`);
    const done = (value) => {
      const fields = {};
      el.querySelectorAll("input").forEach((input) => {
        if (!input.name) return;
        if (input.type === "radio" && !input.checked) return;
        fields[input.name] = input.type === "checkbox" ? input.checked : input.value;
      });
      el.remove();
      resolve({ value, fields });
    };
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-close]")) done(null);
      const pick = e.target.closest("[data-pick]");
      if (pick) done(pick.dataset.pick);
    });
  });
}

export function confirmDialog({ title, body, ok, cancel, danger }) {
  return new Promise((resolve) => {
    const el = openLayer("center", `<div class="modal" role="dialog">
      <h3>${title}</h3>
      <p class="muted tiny" style="margin-block:12px 20px">${body || ""}</p>
      <div class="row">
        <button class="btn ghost grow" data-no>${cancel}</button>
        <button class="btn grow ${danger ? "danger" : ""}" data-yes>${ok}</button>
      </div>
    </div>`);
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-yes]")) { el.remove(); resolve(true); }
      if (e.target === el || e.target.closest("[data-no]")) { el.remove(); resolve(false); }
    });
  });
}

export function closeLayers() {
  host().querySelectorAll(".overlay").forEach((el) => el.remove());
}
