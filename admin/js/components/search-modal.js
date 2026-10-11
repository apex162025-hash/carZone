import { globalSearch } from "../../../shared/js/services/admin.js";
import { getCurrentAdmin } from "../auth.js";
import { getLang } from "../../../shared/js/i18n.js";

let modalEl = null;

export function initGlobalSearchShortcut() {
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openGlobalSearchModal();
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("#btn-global-search")) {
      openGlobalSearchModal();
    }
  });
}

export function openGlobalSearchModal() {
  if (modalEl) return;

  const admin = getCurrentAdmin();
  const backdrop = document.createElement("div");
  backdrop.className = "admin-modal-backdrop";
  backdrop.style.zIndex = "80";

  backdrop.innerHTML = `
    <div class="command-palette" role="dialog" aria-modal="true">
      <div class="palette-input-wrap">
        <i data-lucide="search" style="inline-size:20px;block-size:20px;color:var(--c-primary-600)"></i>
        <input type="text" class="palette-input" id="palette-input" placeholder="${getLang() === "ar" ? "ابحث عن عملاء، لوحات، حجوزات، أو مغاسل..." : "Search customers, plates, bookings, or washes..."}" autofocus />
        <span class="kbd-shortcut">ESC</span>
      </div>
      <div class="palette-results" id="palette-results">
        <div style="padding:var(--s-6);text-align:center;color:var(--c-ink-500);font-size:var(--fs-14)">
          ${getLang() === "ar" ? "اكتب للبحث في جميع أقسام المنصة..." : "Type to search across the platform..."}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  modalEl = backdrop;

  if (window.lucide?.createIcons) window.lucide.createIcons({ root: backdrop });

  const input = backdrop.querySelector("#palette-input");
  const resultsContainer = backdrop.querySelector("#palette-results");
  let selectedIndex = -1;
  let resultItems = [];

  const close = () => {
    backdrop.remove();
    modalEl = null;
  };

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  input.addEventListener("input", async (e) => {
    const q = e.target.value.trim();
    if (!q) {
      resultsContainer.innerHTML = `
        <div style="padding:var(--s-6);text-align:center;color:var(--c-ink-500);font-size:var(--fs-14)">
          ${getLang() === "ar" ? "اكتب للبحث في جميع أقسام المنصة..." : "Type to search across the platform..."}
        </div>
      `;
      resultItems = [];
      selectedIndex = -1;
      return;
    }

    const res = await globalSearch(q, admin.role);
    renderResults(res);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (resultItems.length > 0) {
        selectedIndex = (selectedIndex + 1) % resultItems.length;
        updateSelection();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (resultItems.length > 0) {
        selectedIndex = (selectedIndex - 1 + resultItems.length) % resultItems.length;
        updateSelection();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && resultItems[selectedIndex]) {
        resultItems[selectedIndex].click();
      }
    }
  });

  function updateSelection() {
    resultItems.forEach((item, i) => {
      item.classList.toggle("active", i === selectedIndex);
      if (i === selectedIndex) {
        item.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function renderResults({ customers, orders, washes, branches }) {
    let html = "";
    const total = customers.length + orders.length + washes.length + branches.length;

    if (total === 0) {
      resultsContainer.innerHTML = `
        <div style="padding:var(--s-6);text-align:center;color:var(--c-ink-500);font-size:var(--fs-14)">
          ${getLang() === "ar" ? "لم يتم العثور على أي نتائج تطابق بحثك" : "No results found matching your search"}
        </div>
      `;
      resultItems = [];
      selectedIndex = -1;
      return;
    }

    if (customers.length > 0) {
      html += `<div class="palette-group-title">${getLang() === "ar" ? "العملاء" : "Customers"} (${customers.length})</div>`;
      for (const c of customers) {
        html += `
          <a href="#/customers/${c.id}" class="palette-item" data-palette-item>
            <i data-lucide="user" style="inline-size:18px;block-size:18px;color:var(--c-primary-600)"></i>
            <div>
              <div style="font-weight:700;font-size:14px">${c.name}</div>
              <div style="font-size:12px;color:var(--c-ink-500)">${c.phone}</div>
            </div>
          </a>
        `;
      }
    }

    if (orders.length > 0) {
      html += `<div class="palette-group-title">${getLang() === "ar" ? "الحجوزات والطلبات" : "Bookings"} (${orders.length})</div>`;
      for (const o of orders) {
        html += `
          <a href="#/orders/${o.id}" class="palette-item" data-palette-item>
            <i data-lucide="calendar" style="inline-size:18px;block-size:18px;color:var(--c-success)"></i>
            <div>
              <div style="font-weight:700;font-size:14px">${o.number} · ${o.plate || ""}</div>
              <div style="font-size:12px;color:var(--c-ink-500)">${o.status} · ${o.total} EGP</div>
            </div>
          </a>
        `;
      }
    }

    if (washes.length > 0) {
      html += `<div class="palette-group-title">${getLang() === "ar" ? "المغاسل" : "Car Washes"} (${washes.length})</div>`;
      for (const w of washes) {
        const name = w.name[getLang()] || w.name.ar;
        html += `
          <a href="#/washes/${w.id}" class="palette-item" data-palette-item>
            <i data-lucide="store" style="inline-size:18px;block-size:18px;color:var(--c-accent-500)"></i>
            <div>
              <div style="font-weight:700;font-size:14px">${name}</div>
              <div style="font-size:12px;color:var(--c-ink-500)">${w.status}</div>
            </div>
          </a>
        `;
      }
    }

    if (branches.length > 0) {
      html += `<div class="palette-group-title">${getLang() === "ar" ? "الفروع" : "Branches"} (${branches.length})</div>`;
      for (const b of branches) {
        const name = b.name[getLang()] || b.name.ar;
        html += `
          <a href="#/branches/${b.id}" class="palette-item" data-palette-item>
            <i data-lucide="map-pin" style="inline-size:18px;block-size:18px;color:var(--c-info)"></i>
            <div>
              <div style="font-weight:700;font-size:14px">${name}</div>
              <div style="font-size:12px;color:var(--c-ink-500)">${b.area} · Capacity: ${b.capacity}</div>
            </div>
          </a>
        `;
      }
    }

    resultsContainer.innerHTML = html;
    if (window.lucide?.createIcons) window.lucide.createIcons({ root: resultsContainer });

    resultItems = Array.from(resultsContainer.querySelectorAll("[data-palette-item]"));
    selectedIndex = resultItems.length > 0 ? 0 : -1;
    updateSelection();

    resultItems.forEach((item) => {
      item.addEventListener("click", () => close());
    });
  }
}
