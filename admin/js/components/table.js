import { t, getLang } from "../../../shared/js/i18n.js";

export function createDataTable({
  columns,
  data,
  initialSort = null,
  filters = [],
  quickChips = [],
  searchable = true,
  searchPlaceholder = "",
  pageSize = 10,
  onRowClick = null,
  actions = null,
  emptyMessage = null,
  exportFileName = "export",
}) {
  let sortKey = initialSort?.key || null;
  let sortAsc = initialSort?.asc ?? true;
  let currentPage = 1;
  let activeChip = quickChips.find((c) => c.active)?.id || null;
  let searchQuery = "";
  let activeFilterValues = {};

  const el = document.createElement("div");
  el.className = "table-container";

  function getProcessedData() {
    let result = [...data];

    // 1. Quick chip filter
    if (activeChip) {
      const chipDef = quickChips.find((c) => c.id === activeChip);
      if (chipDef && chipDef.predicate) {
        result = result.filter(chipDef.predicate);
      }
    }

    // 2. Custom dropdown filters
    for (const [key, val] of Object.entries(activeFilterValues)) {
      if (val && val !== "all") {
        const filterDef = filters.find((f) => f.key === key);
        if (filterDef && filterDef.predicate) {
          result = result.filter((row) => filterDef.predicate(row, val));
        } else {
          result = result.filter((row) => String(row[key]) === String(val));
        }
      }
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((row) => {
        return columns.some((col) => {
          const val = col.accessor ? col.accessor(row) : row[col.key];
          if (val === null || val === undefined) return false;
          if (typeof val === "object") return JSON.stringify(val).toLowerCase().includes(q);
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // 4. Sorting
    if (sortKey) {
      const colDef = columns.find((c) => c.key === sortKey);
      result.sort((a, b) => {
        const valA = colDef?.sortAccessor ? colDef.sortAccessor(a) : (colDef?.accessor ? colDef.accessor(a) : a[sortKey]);
        const valB = colDef?.sortAccessor ? colDef.sortAccessor(b) : (colDef?.accessor ? colDef.accessor(b) : b[sortKey]);
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        return (valA > valB ? 1 : -1) * (sortAsc ? 1 : -1);
      });
    }

    return result;
  }

  function exportCsv() {
    const processed = getProcessedData();
    if (processed.length === 0) return;

    const headers = columns.map((c) => `"${c.title.replace(/"/g, '""')}"`).join(",");
    const rows = processed.map((row) => {
      return columns.map((col) => {
        const raw = col.exportAccessor ? col.exportAccessor(row) : (col.accessor ? col.accessor(row) : row[col.key]);
        const clean = (typeof raw === "string" ? raw : (raw ?? "")).toString().replace(/"/g, '""');
        return `"${clean}"`;
      }).join(",");
    });

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFileName}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function render() {
    const processed = getProcessedData();
    const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * pageSize;
    const pageRows = processed.slice(startIdx, startIdx + pageSize);

    let html = `
      <div class="table-toolbar">
        <div class="table-filters">
    `;

    // Quick filter chips
    if (quickChips.length > 0) {
      html += `<div style="display:flex;gap:6px;flex-wrap:wrap">`;
      for (const chip of quickChips) {
        const on = activeChip === chip.id;
        html += `<button type="button" class="chip ${on ? "on" : "flat"}" data-chip="${chip.id}">${chip.label} ${chip.count !== undefined ? `(${chip.count})` : ""}</button>`;
      }
      html += `</div>`;
    }

    // Search input
    if (searchable) {
      html += `
        <div style="position:relative;min-inline-size:220px">
          <input type="text" class="control" style="min-block-size:36px;padding-inline:32px 12px;font-size:13px" placeholder="${searchPlaceholder || t("search.ph")}" value="${searchQuery}" data-table-search />
          <i data-lucide="search" style="position:absolute;inset-inline-start:10px;inset-block-start:9px;inline-size:16px;block-size:16px;color:var(--c-ink-500)"></i>
        </div>
      `;
    }

    // Dropdown filters
    for (const filter of filters) {
      html += `
        <select class="select" style="min-block-size:36px;font-size:13px;inline-size:auto" data-filter-key="${filter.key}">
          <option value="all">${filter.label}</option>
          ${filter.options.map((opt) => `<option value="${opt.value}" ${activeFilterValues[filter.key] === opt.value ? "selected" : ""}>${opt.label}</option>`).join("")}
        </select>
      `;
    }

    html += `
        </div>
        <div style="display:flex;align-items:center;gap:var(--s-2)">
          <button type="button" class="btn sm ghost" data-export-csv title="Export CSV">
            <i data-lucide="download" style="inline-size:14px;block-size:14px"></i>
            <span>${t("admin.action.exportCsv")}</span>
          </button>
        </div>
      </div>

      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
    `;

    for (const col of columns) {
      const isSorted = sortKey === col.key;
      const arrow = isSorted ? (sortAsc ? " ↑" : " ↓") : "";
      html += `
        <th class="${col.sortable !== false ? "sortable" : ""}" data-sort-key="${col.sortable !== false ? col.key : ""}" style="${col.width ? `inline-size:${col.width}` : ""}">
          ${col.title}${arrow}
        </th>
      `;
    }

    if (actions) {
      html += `<th style="inline-size:100px;text-align:end">${getLang() === "ar" ? "إجراءات" : "Actions"}</th>`;
    }

    html += `
            </tr>
          </thead>
          <tbody>
    `;

    if (pageRows.length === 0) {
      html += `
        <tr>
          <td colspan="${columns.length + (actions ? 1 : 0)}" style="text-align:center;padding:48px 16px">
            <div class="empty">
              <i data-lucide="folder-search" style="inline-size:48px;block-size:48px;color:var(--c-ink-300)"></i>
              <h3>${emptyMessage || (getLang() === "ar" ? "لا توجد بيانات مطابقة" : "No matching records")}</h3>
              <p>${getLang() === "ar" ? "جرّب تغيير خيارات البحث أو التصفية" : "Try adjusting your search or filters"}</p>
            </div>
          </td>
        </tr>
      `;
    } else {
      for (const row of pageRows) {
        html += `<tr data-row-id="${row.id || ""}">`;
        for (const col of columns) {
          const val = col.render ? col.render(row) : (col.accessor ? col.accessor(row) : row[col.key]);
          html += `<td>${val ?? "—"}</td>`;
        }
        if (actions) {
          html += `<td style="text-align:end">${actions(row)}</td>`;
        }
        html += `</tr>`;
      }
    }

    html += `
          </tbody>
        </table>
      </div>

      <div class="table-pagination">
        <div>
          ${getLang() === "ar" ? `عرض ${startIdx + 1}–${Math.min(processed.length, startIdx + pageSize)} من ${processed.length}` : `Showing ${startIdx + 1}–${Math.min(processed.length, startIdx + pageSize)} of ${processed.length}`}
        </div>
        <div style="display:flex;gap:6px">
          <button type="button" class="btn sm ghost" data-page-prev ${currentPage <= 1 ? "disabled" : ""}>
            ${getLang() === "ar" ? "السابق" : "Previous"}
          </button>
          <button type="button" class="btn sm ghost" data-page-next ${currentPage >= totalPages ? "disabled" : ""}>
            ${getLang() === "ar" ? "التالي" : "Next"}
          </button>
        </div>
      </div>
    `;

    el.innerHTML = html;

    // Repaint Lucide icons
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons({ root: el });
    }

    bindEvents();
  }

  function bindEvents() {
    // Quick chips
    el.querySelectorAll("[data-chip]").forEach((chipBtn) => {
      chipBtn.addEventListener("click", () => {
        const id = chipBtn.dataset.chip;
        activeChip = activeChip === id ? null : id;
        currentPage = 1;
        render();
      });
    });

    // Search input
    const searchInput = el.querySelector("[data-table-search]");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        render();
        const nextInput = el.querySelector("[data-table-search]");
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }

    // Dropdown filters
    el.querySelectorAll("[data-filter-key]").forEach((select) => {
      select.addEventListener("change", (e) => {
        const key = e.target.dataset.filterKey;
        activeFilterValues[key] = e.target.value;
        currentPage = 1;
        render();
      });
    });

    // CSV export
    const exportBtn = el.querySelector("[data-export-csv]");
    if (exportBtn) {
      exportBtn.addEventListener("click", exportCsv);
    }

    // Column sorting
    el.querySelectorAll("th[data-sort-key]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sortKey;
        if (!key) return;
        if (sortKey === key) {
          sortAsc = !sortAsc;
        } else {
          sortKey = key;
          sortAsc = true;
        }
        render();
      });
    });

    // Pagination
    el.querySelector("[data-page-prev]")?.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        render();
      }
    });

    el.querySelector("[data-page-next]")?.addEventListener("click", () => {
      currentPage++;
      render();
    });

    // Row click
    if (onRowClick) {
      el.querySelectorAll("tbody tr[data-row-id]").forEach((tr) => {
        tr.addEventListener("click", (e) => {
          if (e.target.closest("button") || e.target.closest("a") || e.target.closest(".action-stop")) return;
          const id = tr.dataset.rowId;
          const row = data.find((r) => String(r.id) === String(id));
          if (row) onRowClick(row);
        });
      });
    }
  }

  render();
  return {
    element: el,
    updateData: (newData) => {
      data = newData;
      render();
    },
  };
}
