import { t, getLang } from "../../../shared/js/i18n.js";
import { formatDate, formatDateTime } from "../../../shared/js/format.js";
import { getApplications, getApplicationById, approveApplication, rejectApplication, requestChangesApplication } from "../../../shared/js/services/admin.js";
import { createDataTable } from "../components/table.js";
import { promptReasonModal, confirmModal } from "../components/modal.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";
import { CDN } from "../../../shared/js/cdn.js";

let leafletLoaded = false;
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

export async function renderApplications(params = {}) {
  if (params.id) {
    return renderApplicationReviewView(params.id);
  }

  const container = document.createElement("div");
  const apps = await getApplications("all");

  const pendingCount = apps.filter((a) => a.status === "pending").length;
  const approvedCount = apps.filter((a) => a.status === "approved").length;
  const changesCount = apps.filter((a) => a.status === "needs_changes").length;
  const rejectedCount = apps.filter((a) => a.status === "rejected").length;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.applications")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "طلبات انضمام المغاسل الجديدة وفحص المستندات والاعتماد" : "New car wash partner onboarding and verification pipeline"}</div>
      </div>
    </div>

    <!-- Onboarding Pipeline Summary (AD-18) -->
    <div class="card pad" style="margin-block-end:var(--s-6);background:var(--c-surface)">
      <div style="font-weight:700;font-size:14px;margin-block-end:12px;color:var(--c-ink-700)">
        ${getLang() === "ar" ? "مراحل مسار انضمام الشركاء" : "Partner Onboarding Pipeline"}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--s-3)">
        <div style="padding:12px;background:var(--c-bg);border-radius:var(--r-sm);border-inline-start:4px solid var(--c-warning)">
          <div style="font-size:12px;color:var(--c-ink-500)">${getLang() === "ar" ? "قيد المراجعة" : "Pending Review"}</div>
          <div style="font-size:22px;font-weight:800;color:var(--c-warning)">${pendingCount}</div>
        </div>
        <div style="padding:12px;background:var(--c-bg);border-radius:var(--r-sm);border-inline-start:4px solid var(--c-info)">
          <div style="font-size:12px;color:var(--c-ink-500)">${getLang() === "ar" ? "مطلوب تعديلات" : "Needs Changes"}</div>
          <div style="font-size:22px;font-weight:800;color:var(--c-info)">${changesCount}</div>
        </div>
        <div style="padding:12px;background:var(--c-bg);border-radius:var(--r-sm);border-inline-start:4px solid var(--c-success)">
          <div style="font-size:12px;color:var(--c-ink-500)">${getLang() === "ar" ? "تمت الموافقة" : "Approved"}</div>
          <div style="font-size:22px;font-weight:800;color:var(--c-success)">${approvedCount}</div>
        </div>
        <div style="padding:12px;background:var(--c-bg);border-radius:var(--r-sm);border-inline-start:4px solid var(--c-ink-300)">
          <div style="font-size:12px;color:var(--c-ink-500)">${getLang() === "ar" ? "مرفوضة" : "Rejected"}</div>
          <div style="font-size:22px;font-weight:800;color:var(--c-ink-500)">${rejectedCount}</div>
        </div>
      </div>
    </div>

    <div id="applications-table-mount"></div>
  `;

  const table = createDataTable({
    data: apps,
    quickChips: [
      { id: "pending", label: `${getLang() === "ar" ? "قيد المراجعة" : "Pending"} (${pendingCount})`, active: true, predicate: (a) => a.status === "pending" },
      { id: "all", label: getLang() === "ar" ? "الكل" : "All", predicate: () => true },
      { id: "changes", label: `${getLang() === "ar" ? "تعديلات" : "Changes"} (${changesCount})`, predicate: (a) => a.status === "needs_changes" },
      { id: "approved", label: `${getLang() === "ar" ? "معتمدة" : "Approved"} (${approvedCount})`, predicate: (a) => a.status === "approved" },
      { id: "rejected", label: `${getLang() === "ar" ? "مرفوضة" : "Rejected"} (${rejectedCount})`, predicate: (a) => a.status === "rejected" },
    ],
    columns: [
      {
        key: "businessName",
        title: getLang() === "ar" ? "اسم المغسلة" : "Business Name",
        render: (a) => `
          <div style="font-weight:700;font-size:15px">${a.businessName}</div>
          <div class="muted" style="font-size:12px">${a.id}</div>
        `,
      },
      {
        key: "ownerName",
        title: getLang() === "ar" ? "صاحب الطلب" : "Applicant",
        render: (a) => `
          <div>${a.ownerName}</div>
          <div class="muted" style="font-size:12px">${a.phone}</div>
        `,
      },
      {
        key: "capacity",
        title: getLang() === "ar" ? "الطاقة" : "Capacity",
        render: (a) => `${a.capacity} ${getLang() === "ar" ? "مسارات" : "bays"}`,
      },
      {
        key: "status",
        title: getLang() === "ar" ? "الحالة" : "Status",
        render: (a) => {
          const colors = {
            pending: "var(--c-warning)",
            needs_changes: "var(--c-info)",
            approved: "var(--c-success)",
            rejected: "var(--c-danger)",
          };
          const color = colors[a.status] || "var(--c-ink-500)";
          return `
            <span class="badge" style="background:color-mix(in srgb,${color} 12%,transparent);color:${color}">
              <span class="dot"></span>
              ${a.status}
            </span>
          `;
        },
      },
      {
        key: "submittedAt",
        title: getLang() === "ar" ? "تاريخ التقديم" : "Submitted",
        render: (a) => {
          const diffDays = Math.max(0, Math.round((Date.now() - new Date(a.submittedAt).getTime()) / 86400000));
          return `
            <div>${formatDate(a.submittedAt)}</div>
            <div class="muted" style="font-size:11px">${diffDays === 0 ? (getLang() === "ar" ? "اليوم" : "Today") : (getLang() === "ar" ? `انتظار ${diffDays} يوم` : `waiting ${diffDays}d`)}</div>
          `;
        },
      },
    ],
    actions: (a) => `
      <a href="#/applications/${a.id}" class="btn sm primary">
        ${getLang() === "ar" ? "فحص الطلب" : "Review"}
      </a>
    `,
    exportFileName: "carzen_applications",
  });

  container.querySelector("#applications-table-mount").appendChild(table.element);
  return container;
}

async function renderApplicationReviewView(id) {
  const container = document.createElement("div");
  const app = await getApplicationById(id);

  if (!app) {
    container.innerHTML = `
      <div class="empty">
        <h3>${getLang() === "ar" ? "الطلب غير موجود" : "Application not found"}</h3>
        <a href="#/applications" class="btn">${getLang() === "ar" ? "العودة للطلبات" : "Back"}</a>
      </div>
    `;
    return container;
  }

  const admin = getCurrentAdmin();
  const canReview = checkPermission("approve_application");

  container.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px">
        <a href="#/applications" class="icon-btn sm" title="Back">
          <i data-lucide="arrow-right" style="inline-size:18px;block-size:18px"></i>
        </a>
        <div>
          <h1 class="page-title">${app.businessName}</h1>
          <div class="page-subtitle">${app.ownerName} · ${app.phone} · ${formatDateTime(app.submittedAt)}</div>
        </div>
      </div>
      <div class="page-actions">
        ${canReview && app.status === "pending" ? `
          <button type="button" class="btn ghost danger" id="btn-reject-app">
            ${t("admin.action.reject")}
          </button>
          <button type="button" class="btn ghost" id="btn-request-changes-app">
            ${t("admin.action.requestChanges")}
          </button>
          <button type="button" class="btn primary" id="btn-approve-app">
            ${t("admin.action.approve")}
          </button>
        ` : `
          <span class="badge" style="font-size:14px;padding:6px 12px">${app.status}</span>
        `}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--s-6)">
      <!-- Main Review Details -->
      <div style="display:flex;flex-direction:column;gap:var(--s-5)">
        <!-- Business & Location -->
        <div class="card pad">
          <h3 style="margin:0 0 var(--s-3);font-size:16px">${getLang() === "ar" ? "بيانات المنشأة والموقع" : "Business & Location"}</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;margin-block-end:var(--s-4)">
            <div><strong>${getLang() === "ar" ? "اسم المغسلة:" : "Business:"}</strong> ${app.businessName}</div>
            <div><strong>${getLang() === "ar" ? "صاحب المنشأة:" : "Owner:"}</strong> ${app.ownerName}</div>
            <div><strong>${getLang() === "ar" ? "رقم الموبايل:" : "Phone:"}</strong> ${app.phone}</div>
            <div><strong>${getLang() === "ar" ? "البريد الإلكتروني:" : "Email:"}</strong> ${app.email || "—"}</div>
            <div><strong>${getLang() === "ar" ? "العنوان:" : "Address:"}</strong> ${app.address}</div>
            <div><strong>${getLang() === "ar" ? "الطاقة الاستيعابية:" : "Capacity:"}</strong> ${app.capacity} ${getLang() === "ar" ? "مسارات متزامنة" : "simultaneous bays"}</div>
          </div>

          <div style="font-weight:700;font-size:13px;margin-block-end:6px">${getLang() === "ar" ? "تحديد الموقع الجغرافي على الخريطة:" : "Location Verification on Map:"}</div>
          <div id="app-map-container" class="map-container" style="block-size:260px"></div>
        </div>

        <!-- Services & Working Hours -->
        <div class="card pad">
          <h3 style="margin:0 0 var(--s-3);font-size:16px">${getLang() === "ar" ? "قائمة الخدمات المعروضة وساعات التشغيل" : "Services & Working Hours"}</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-block-end:var(--s-4)">
            ${(app.services || []).map((s) => `<span class="chip on">${s}</span>`).join("")}
          </div>
          <div style="font-weight:700;font-size:13px;margin-block-end:6px">${getLang() === "ar" ? "ساعات العمل المقترحة:" : "Working Hours:"}</div>
          <div style="font-size:13px;color:var(--c-ink-700)">
            ${getLang() === "ar" ? "يومياً من الساعة ٠٩:٠٠ ص حتى ٠٩:٠٠ م" : "Daily from 09:00 AM to 09:00 PM"}
          </div>
        </div>

        <!-- Documents & Attachments -->
        <div class="card pad">
          <h3 style="margin:0 0 var(--s-3);font-size:16px">${getLang() === "ar" ? "المستندات والوثائق المرفقة" : "Attached Documents"}</h3>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            ${(app.documents || ["commercial-register.pdf"]).map((doc) => `
              <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--c-bg);border:1px solid var(--c-line);border-radius:var(--r-sm)">
                <i data-lucide="file-text" style="inline-size:18px;block-size:18px;color:var(--c-primary-600)"></i>
                <span style="font-size:13px;font-weight:600">${doc}</span>
                <span class="badge" style="font-size:10px;background:var(--c-accent-100);color:var(--c-primary-700)">Verified</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Right Column: Verification Checklist & Admin Notes -->
      <div style="display:flex;flex-direction:column;gap:var(--s-4)">
        <div class="card pad" style="background:var(--c-surface)">
          <h3 style="margin:0 0 12px;font-size:16px">${getLang() === "ar" ? "قائمة تدقيق مراجعة الطلب" : "Verification Checklist"}</h3>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:13px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="chk-reg" checked />
              <span>${getLang() === "ar" ? "السجل التجاري والبطاقة الضريبية سارية" : "Commercial register verified"}</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="chk-loc" checked />
              <span>${getLang() === "ar" ? "التحقق من صحة الموقع على الخريطة" : "Location physically verified"}</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="chk-cap" checked />
              <span>${getLang() === "ar" ? "الطاقة الاستيعابية واقعية ومناسبة" : "Realistic bay capacity"}</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="chk-svc" checked />
              <span>${getLang() === "ar" ? "الأسعار متوافقة مع متوسط السوق" : "Priced reasonably"}</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="chk-photos" checked />
              <span>${getLang() === "ar" ? "الصور المرفقة مقبولة وواضحة" : "Photos appropriate"}</span>
            </label>
          </div>

          <div style="margin-block-start:var(--s-4);border-block-start:1px solid var(--c-line);padding-block-start:var(--s-4)">
            <label style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;color:var(--c-primary-700)">
              <input type="checkbox" id="chk-immediate" checked />
              <span>${getLang() === "ar" ? "تفعيل المغسلة فوراً في التطبيق" : "Activate immediately on approval"}</span>
            </label>
          </div>

          <div class="field" style="margin-block-start:var(--s-4)">
            <span class="label">${getLang() === "ar" ? "ملاحظات الفحص الداخلية:" : "Internal Review Notes:"}</span>
            <textarea class="textarea" id="app-internal-notes" placeholder="${getLang() === "ar" ? "سجل أي ملاحظات خاصة بالفرع أو التجهيزات..." : "Enter internal review notes..."}"></textarea>
          </div>
        </div>
      </div>
    </div>
  `;

  if (window.lucide?.createIcons) window.lucide.createIcons({ root: container });

  // Init Leaflet Map Pin (AD-15)
  setTimeout(async () => {
    await ensureLeaflet();
    const mapDiv = container.querySelector("#app-map-container");
    if (mapDiv && window.L) {
      const lat = app.lat || 30.06;
      const lng = app.lng || 31.33;
      const map = window.L.map(mapDiv).setView([lat, lng], 14);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      window.L.marker([lat, lng]).addTo(map).bindPopup(app.businessName).openPopup();
    }
  }, 100);

  // Approve action (Scenario 1)
  const approveBtn = container.querySelector("#btn-approve-app");
  if (approveBtn) {
    approveBtn.addEventListener("click", async () => {
      const activateImmediately = container.querySelector("#chk-immediate")?.checked ?? true;
      const note = container.querySelector("#app-internal-notes")?.value.trim() || "";

      const ok = await confirmModal({
        title: getLang() === "ar" ? "الموافقة على طلب انضمام المغسلة" : "Approve Wash Application",
        message: getLang() === "ar"
          ? `هل أنت متأكد من اعتماد "${app.businessName}"؟ سيتم إنشاء المنشأة والفرع وحساب المالك فوراً${activateImmediately ? " وتفعيلها في تطبيق العملاء." : "."}`
          : `Approve "${app.businessName}"? This will provision the business, branch, and owner account.`,
        confirmText: t("admin.action.approve"),
      });

      if (ok) {
        await approveApplication(app.id, {
          adminId: admin.id,
          activateImmediately,
          note,
        });
        location.hash = "#/washes";
      }
    });
  }

  // Reject action
  const rejectBtn = container.querySelector("#btn-reject-app");
  if (rejectBtn) {
    rejectBtn.addEventListener("click", async () => {
      const res = await promptReasonModal({
        title: getLang() === "ar" ? "رفض طلب الانضمام" : "Reject Application",
        message: getLang() === "ar" ? "سيتم إرسال سبب الرفض إلى مقدم الطلب للتوثيق." : "Reason will be documented and shared with applicant.",
        danger: true,
        placeholder: getLang() === "ar" ? "اكتب سبب رفض الطلب..." : "Explain reason for rejection...",
      });

      if (res) {
        await rejectApplication(app.id, {
          adminId: admin.id,
          reason: res.reason,
        });
        location.hash = "#/applications";
      }
    });
  }

  // Request changes action
  const changesBtn = container.querySelector("#btn-request-changes-app");
  if (changesBtn) {
    changesBtn.addEventListener("click", async () => {
      const res = await promptReasonModal({
        title: getLang() === "ar" ? "طلب تعديلات على البيانات" : "Request Changes",
        message: getLang() === "ar" ? "وضح البيانات أو المستندات المطلوب تعديلها من المالك:" : "Specify required corrections from the applicant:",
        placeholder: getLang() === "ar" ? "مثال: يرجى تحديث صور المغسلة وقائمة الأسعار..." : "e.g. Please update photos and pricing...",
      });

      if (res) {
        await requestChangesApplication(app.id, {
          adminId: admin.id,
          note: res.reason,
        });
        location.hash = "#/applications";
      }
    });
  }

  return container;
}
