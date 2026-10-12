import { t, getLang } from "../../../shared/js/i18n.js";
import { formatDateTime, formatDate } from "../../../shared/js/format.js";
import { getBranches, toggleBranchActive } from "../../../shared/js/services/admin.js";
import { createDataTable } from "../components/table.js";
import { openDrawer } from "../components/drawer.js";
import { promptReasonModal } from "../components/modal.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";
import { CDN } from "../../../shared/js/cdn.js";
import { loadGoogleMaps, createPinIcon, MAP_STYLES } from "../../../shared/js/maps.js";

async function ensureLeaflet() {
  if (window.L) return;
  if (!document.querySelector(`link[href="${CDN.leafletCss}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CDN.leafletCss;
    document.head.appendChild(link);
  }
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = CDN.leaflet;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

export async function renderBranches(params = {}) {
  const container = document.createElement("div");
  const admin = getCurrentAdmin();
  const canManage = checkPermission("activate_branch");

  const branches = await getBranches();

  // If params.id, render detail view
  if (params.id) {
    const branch = branches.find((b) => b.id === params.id);
    if (branch) return renderBranchDetailsView(branch);
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.branches")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "تغطية فروع المغاسل والقدرة الاستيعابية ومستوى التوزيع الجغرافي" : "Physical wash branches coverage, bay capacity and geographic distribution"}</div>
      </div>
      <div class="page-actions">
        <div class="tabs" id="view-mode-tabs" style="padding:2px">
          <button class="on" data-mode="list">
            <i data-lucide="list" style="inline-size:14px;block-size:14px"></i>
            <span>${getLang() === "ar" ? "قائمة" : "List"}</span>
          </button>
          <button data-mode="map">
            <i data-lucide="map" style="inline-size:14px;block-size:14px"></i>
            <span>${getLang() === "ar" ? "خريطة التغطية" : "Map View"}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Map Container (Hidden by default or toggled) -->
    <div id="branches-map-view" class="map-container" style="display:none;block-size:520px;margin-block-end:var(--s-6)"></div>

    <div id="branches-list-view">
      <div id="branches-table-mount"></div>
    </div>
  `;

  const table = createDataTable({
    data: branches,
    searchPlaceholder: getLang() === "ar" ? "ابحث باسم الفرع، المنطقة، أو المغسلة..." : "Search by branch, area or business...",
    columns: [
      {
        key: "name",
        title: getLang() === "ar" ? "الفرع" : "Branch",
        render: (b) => `
          <div style="font-weight:700;font-size:15px">${b.name[getLang()] || b.name.ar}</div>
          <div class="muted" style="font-size:12px">${b.id}</div>
        `,
      },
      {
        key: "businessName",
        title: getLang() === "ar" ? "المغسلة الأم" : "Business",
        render: (b) => `<a href="#/washes/${b.businessId}" style="font-weight:700;color:var(--c-primary-600)">${b.businessName ? (b.businessName[getLang()] || b.businessName.ar) : b.businessId}</a>`,
      },
      {
        key: "area",
        title: getLang() === "ar" ? "المنطقة" : "Area",
        render: (b) => `<span class="chip flat">${b.area}</span>`,
      },
      {
        key: "capacity",
        title: getLang() === "ar" ? "الطاقة" : "Capacity",
        render: (b) => `<strong>${b.capacity}</strong> ${getLang() === "ar" ? "مسارات" : "bays"}`,
      },
      {
        key: "active",
        title: getLang() === "ar" ? "الحالة" : "Status",
        render: (b) => `
          <span class="badge" style="background:${b.active ? "color-mix(in srgb,var(--c-success) 12%,transparent)" : "var(--c-bg)"};color:${b.active ? "var(--c-success)" : "var(--c-ink-500)"}">
            ${b.active ? (getLang() === "ar" ? "مفعّل" : "Active") : (getLang() === "ar" ? "معطل" : "Inactive")}
          </span>
        `,
      },
      {
        key: "todayOrdersCount",
        title: getLang() === "ar" ? "طلبات اليوم" : "Today Orders",
        render: (b) => `<strong>${b.todayOrdersCount}</strong>`,
      },
      {
        key: "rating",
        title: getLang() === "ar" ? "التقييم" : "Rating",
        render: (b) => `<span style="color:var(--c-warning);font-weight:700">★ ${b.rating}</span>`,
      },
    ],
    onRowClick: (branch) => {
      openDrawer({
        title: branch.name[getLang()] || branch.name.ar,
        subtitle: `${branch.area} · Capacity: ${branch.capacity} bays`,
        fullDetailsUrl: `#/branches/${branch.id}`,
        bodyHtml: `
          <div class="card pad" style="background:var(--c-bg)">
            <div style="display:flex;justify-content:space-between;margin-block-end:8px">
              <span class="muted">${getLang() === "ar" ? "المغسلة:" : "Business:"}</span>
              <strong>${branch.businessName ? (branch.businessName[getLang()] || branch.businessName.ar) : branch.businessId}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-block-end:8px">
              <span class="muted">${getLang() === "ar" ? "التقييم:" : "Rating:"}</span>
              <strong style="color:var(--c-warning)">★ ${branch.rating}</strong>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span class="muted">${getLang() === "ar" ? "طلبات اليوم:" : "Today Orders:"}</span>
              <strong>${branch.todayOrdersCount}</strong>
            </div>
          </div>
          <div style="margin-block-start:12px;font-size:13px">
            📍 ${branch.address?.[getLang()] || branch.address?.ar || branch.area}
          </div>
        `,
      });
    },
    actions: (b) => {
      if (!canManage) return "";
      return `
        <button type="button" class="btn sm ${b.active ? "ghost" : "secondary"}" data-toggle-branch="${b.id}">
          ${b.active ? (getLang() === "ar" ? "تعطيل" : "Deactivate") : (getLang() === "ar" ? "تفعيل" : "Activate")}
        </button>
      `;
    },
    exportFileName: "carzen_branches",
  });

  table.element.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-toggle-branch]");
    if (!btn) return;
    const branchId = btn.dataset.toggleBranch;
    const br = branches.find((b) => b.id === branchId);
    if (!br) return;

    const isDeactivating = br.active;
    const result = await promptReasonModal({
      title: isDeactivating ? (getLang() === "ar" ? "تعطيل الفرع" : "Deactivate Branch") : (getLang() === "ar" ? "إعادة تفعيل الفرع" : "Activate Branch"),
      message: `${br.name[getLang()] || br.name.ar} (${br.area})`,
      danger: isDeactivating,
    });

    if (result) {
      await toggleBranchActive(branchId, {
        adminId: admin.id,
        active: !isDeactivating,
        reason: result.reason,
      });
      location.reload();
    }
  });

  container.querySelector("#branches-table-mount").appendChild(table.element);

  // Map / List toggle logic (AD-23)
  const mapContainer = container.querySelector("#branches-map-view");
  const listContainer = container.querySelector("#branches-list-view");
  let mapInitialized = false;

  container.querySelectorAll("#view-mode-tabs button").forEach((tabBtn) => {
    tabBtn.addEventListener("click", async () => {
      container.querySelectorAll("#view-mode-tabs button").forEach((b) => b.classList.remove("on"));
      tabBtn.classList.add("on");

      const mode = tabBtn.dataset.mode;
      if (mode === "map") {
        listContainer.style.display = "none";
        mapContainer.style.display = "block";
        if (!mapInitialized) {
          mapInitialized = true;
          let isGoogleReady = false;
          try {
            await loadGoogleMaps();
            isGoogleReady = !!(window.google && window.google.maps);
          } catch {
            isGoogleReady = false;
          }

          if (isGoogleReady) {
            const isDark = document.documentElement.dataset.theme === "dark";
            const gmap = new window.google.maps.Map(mapContainer, {
              center: { lat: 30.0444, lng: 31.2357 },
              zoom: 11,
              mapTypeControl: false,
              streetViewControl: false,
              styles: isDark ? MAP_STYLES.dark : MAP_STYLES.light,
            });

            const infoWindow = new window.google.maps.InfoWindow();

            for (const b of branches) {
              const marker = new window.google.maps.Marker({
                position: { lat: b.lat, lng: b.lng },
                map: gmap,
                icon: createPinIcon({
                  color: b.active ? "#1C2459" : "#64748b",
                  dotColor: b.active ? "#F5FF67" : "#cbd5e1",
                  size: 36,
                }),
                title: b.name[getLang()] || b.name.ar,
              });

              marker.addListener("click", () => {
                infoWindow.setContent(`
                  <div style="font-family:inherit;padding:4px;color:#1C2459">
                    <div style="font-weight:bold;font-size:14px">${b.name[getLang()] || b.name.ar}</div>
                    <div style="font-size:12px;color:#666">${b.area} · ${getLang() === "ar" ? "الطاقة" : "Capacity"}: ${b.capacity}</div>
                    <div style="font-size:12px;margin-top:6px"><a href="#/branches/${b.id}" style="color:#1C2459;font-weight:bold">${getLang() === "ar" ? "عرض التفاصيل" : "View Details"}</a></div>
                  </div>
                `);
                infoWindow.open(gmap, marker);
              });
            }
          } else {
            await ensureLeaflet();
            if (window.L) {
              const map = window.L.map(mapContainer).setView([30.0444, 31.2357], 11);
              window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap",
              }).addTo(map);

              for (const b of branches) {
                const marker = window.L.marker([b.lat, b.lng]).addTo(map);
                const popup = `
                  <div style="font-family:sans-serif;padding:4px">
                    <div style="font-weight:bold;font-size:14px">${b.name[getLang()] || b.name.ar}</div>
                    <div style="font-size:12px;color:#666">${b.area} · Capacity: ${b.capacity}</div>
                    <div style="font-size:12px;margin-top:4px"><a href="#/branches/${b.id}">View Details</a></div>
                  </div>
                `;
                marker.bindPopup(popup);
              }
            }
          }
        }
      } else {
        mapContainer.style.display = "none";
        listContainer.style.display = "block";
      }
    });
  });

  return container;
}

function renderBranchDetailsView(branch) {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px">
        <a href="#/branches" class="icon-btn sm" title="Back">
          <i data-lucide="arrow-right" style="inline-size:18px;block-size:18px"></i>
        </a>
        <div>
          <h1 class="page-title">${branch.name[getLang()] || branch.name.ar}</h1>
          <div class="page-subtitle">${branch.area} · ${branch.capacity} ${getLang() === "ar" ? "مسارات" : "bays"}</div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s-5)">
      <div class="card pad">
        <h3 style="margin:0 0 16px;font-size:16px">${getLang() === "ar" ? "بيانات الفرع والتشغيل" : "Branch Operations"}</h3>
        <div style="display:flex;flex-direction:column;gap:12px;font-size:14px">
          <div><strong>${getLang() === "ar" ? "المغسلة الأم:" : "Business:"}</strong> ${branch.businessName?.[getLang()] || branch.businessId}</div>
          <div><strong>${getLang() === "ar" ? "المنطقة:" : "Area:"}</strong> ${branch.area}</div>
          <div><strong>${getLang() === "ar" ? "العنوان:" : "Address:"}</strong> ${branch.address?.[getLang()] || branch.address?.ar || branch.area}</div>
          <div><strong>${getLang() === "ar" ? "الطاقة الاستيعابية:" : "Capacity:"}</strong> ${branch.capacity} bays</div>
          <div><strong>${getLang() === "ar" ? "الحالة:" : "Status:"}</strong> ${branch.active ? "Active" : "Inactive"}</div>
        </div>
      </div>
      <div class="card pad">
        <h3 style="margin:0 0 16px;font-size:16px">${getLang() === "ar" ? "الموقع الجغرافي" : "Map Location"}</h3>
        <div id="branch-pin-map" class="map-container" style="block-size:260px"></div>
      </div>
    </div>
  `;

  if (window.lucide?.createIcons) window.lucide.createIcons({ root: container });

  setTimeout(async () => {
    const mapDiv = container.querySelector("#branch-pin-map");
    if (!mapDiv) return;

    let isGoogleReady = false;
    try {
      await loadGoogleMaps();
      isGoogleReady = !!(window.google && window.google.maps);
    } catch {
      isGoogleReady = false;
    }

    if (isGoogleReady) {
      const isDark = document.documentElement.dataset.theme === "dark";
      const gmap = new window.google.maps.Map(mapDiv, {
        center: { lat: branch.lat, lng: branch.lng },
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        styles: isDark ? MAP_STYLES.dark : MAP_STYLES.light,
      });

      const marker = new window.google.maps.Marker({
        position: { lat: branch.lat, lng: branch.lng },
        map: gmap,
        icon: createPinIcon({ color: "#1C2459", dotColor: "#F5FF67", size: 40 }),
        title: branch.name[getLang()] || branch.name.ar,
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="font-weight:bold;padding:4px;color:#1C2459">${branch.name[getLang()] || branch.name.ar}</div>`,
      });
      infoWindow.open(gmap, marker);
    } else {
      await ensureLeaflet();
      if (mapDiv && window.L) {
        const map = window.L.map(mapDiv).setView([branch.lat, branch.lng], 14);
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
        window.L.marker([branch.lat, branch.lng]).addTo(map).bindPopup(branch.name[getLang()] || branch.name.ar).openPopup();
      }
    }
  }, 100);

  return container;
}
