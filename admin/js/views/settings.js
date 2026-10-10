import { t, getLang } from "../../../shared/js/i18n.js";
import { get, mutate } from "../../../shared/js/db.js";
import { getCurrentAdmin, checkPermission } from "../auth.js";
import { toast } from "../../../shared/js/ui.js";

export function renderSettings() {
  const container = document.createElement("div");
  const db = get();
  const admin = getCurrentAdmin();
  const canEdit = checkPermission("settings");

  const settings = db.settings || {};
  const catalogs = db.catalogs || {};

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t("admin.nav.settings")}</h1>
        <div class="page-subtitle">${getLang() === "ar" ? "إعدادات منصة كارزن، قواميس الخدمات والمناطق، والسياسات القانونية" : "Marketplace catalogs, operational booking defaults and legal policies"}</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="admin-tabs" id="settings-tabs">
      <button class="tab-btn active" data-tab="set-general">${getLang() === "ar" ? "عام والدعم" : "General"}</button>
      <button class="tab-btn" data-tab="set-catalogs">${getLang() === "ar" ? "القواميس والتصنيفات" : "Catalogs"}</button>
      <button class="tab-btn" data-tab="set-defaults">${getLang() === "ar" ? "افتراضيات الحجز" : "Booking Defaults"}</button>
      <button class="tab-btn" data-tab="set-legal">${getLang() === "ar" ? "الشروط والخصوصية" : "Legal & Privacy"}</button>
      <button class="tab-btn" data-tab="set-templates">${getLang() === "ar" ? "قوالب الإشعارات" : "Notification Templates"}</button>
    </div>

    <div id="settings-tab-panes">
      <!-- 1. General & Support -->
      <div id="set-general" class="tab-pane">
        <div class="card pad" style="max-inline-size:600px">
          <form id="form-settings-general" style="display:flex;flex-direction:column;gap:16px">
            <div class="field">
              <span class="label">${getLang() === "ar" ? "اسم المنصة" : "Platform Name"}</span>
              <input type="text" class="control" value="Carzen" disabled />
            </div>
            <div class="field">
              <span class="label">${getLang() === "ar" ? "العملة الرسمية" : "Currency"}</span>
              <input type="text" class="control" value="EGP (ج.م)" disabled />
            </div>
            <div class="field">
              <span class="label">${getLang() === "ar" ? "رقم هاتف الدعم الفني" : "Support Phone"}</span>
              <input type="text" class="control" id="set-support-phone" value="${settings.support?.phone || "+20 150 000 1111"}" ${!canEdit ? "disabled" : ""} />
            </div>
            <div class="field">
              <span class="label">${getLang() === "ar" ? "البريد الإلكتروني للدعم" : "Support Email"}</span>
              <input type="email" class="control" id="set-support-email" value="${settings.support?.email || "hello@carzen.demo"}" ${!canEdit ? "disabled" : ""} />
            </div>
            ${canEdit ? `
              <button type="submit" class="btn primary" style="align-self:flex-start">
                ${getLang() === "ar" ? "حفظ الإعدادات" : "Save Settings"}
              </button>
            ` : ""}
          </form>
        </div>
      </div>

      <!-- 2. Catalogs (Areas, Categories, Amenities) -->
      <div id="set-catalogs" class="tab-pane" style="display:none">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s-4)">
          <!-- Areas Catalog -->
          <div class="card pad">
            <h3 style="margin:0 0 12px;font-size:16px">${getLang() === "ar" ? "المناطق المدعومة (Areas)" : "Supported Areas"}</h3>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${(catalogs.areas || []).map((a) => `
                <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--c-bg);border-radius:var(--r-sm);font-size:13px">
                  <span><strong>${a.name[getLang()] || a.name.ar}</strong></span>
                  <span class="muted">${a.id}</span>
                </div>
              `).join("")}
            </div>
          </div>

          <!-- Service Categories Catalog -->
          <div class="card pad">
            <h3 style="margin:0 0 12px;font-size:16px">${getLang() === "ar" ? "تصنيفات الخدمات (Categories)" : "Service Categories"}</h3>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${(catalogs.serviceCategories || []).map((cat) => `
                <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--c-bg);border-radius:var(--r-sm);font-size:13px">
                  <span><strong>${cat.name[getLang()] || cat.name.ar}</strong></span>
                  <span class="muted">${cat.id}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Booking Defaults -->
      <div id="set-defaults" class="tab-pane" style="display:none">
        <div class="card pad" style="max-inline-size:600px">
          <form id="form-settings-defaults" style="display:flex;flex-direction:column;gap:16px">
            <div class="field">
              <span class="label">${getLang() === "ar" ? "المهلة المسبقة للحجز (Lead Time - دقيقة)" : "Lead Time (min)"}</span>
              <input type="number" class="control" id="def-lead-time" value="${settings.bookingDefaults?.leadTimeMin ?? 15}" min="0" ${!canEdit ? "disabled" : ""} />
            </div>
            <div class="field">
              <span class="label">${getLang() === "ar" ? "نافذة الإلغاء المجاني (Free Cancel - دقيقة)" : "Free Cancellation Window (min)"}</span>
              <input type="number" class="control" id="def-cancel-min" value="${settings.bookingDefaults?.freeCancelMin ?? 60}" min="0" ${!canEdit ? "disabled" : ""} />
            </div>
            <div class="field">
              <span class="label">${getLang() === "ar" ? "فترة سماح عدم الحضور (No-Show Grace - دقيقة)" : "No-Show Grace Period (min)"}</span>
              <input type="number" class="control" id="def-grace-min" value="${settings.bookingDefaults?.noShowGraceMin ?? 15}" min="0" ${!canEdit ? "disabled" : ""} />
            </div>
            <div class="field">
              <span class="label">${getLang() === "ar" ? "توقيت التذكير بالموعد (Reminder - دقيقة)" : "Reminder Lead Time (min)"}</span>
              <input type="number" class="control" id="def-reminder-min" value="${settings.bookingDefaults?.reminderMin ?? 45}" min="0" ${!canEdit ? "disabled" : ""} />
            </div>
            ${canEdit ? `
              <button type="submit" class="btn primary" style="align-self:flex-start">
                ${getLang() === "ar" ? "تحديث افتراضيات الحجز" : "Save Defaults"}
              </button>
            ` : ""}
          </form>
        </div>
      </div>

      <!-- 4. Legal Texts (Terms & Privacy) -->
      <div id="set-legal" class="tab-pane" style="display:none">
        <div class="card pad" style="max-inline-size:740px">
          <form id="form-settings-legal" style="display:flex;flex-direction:column;gap:16px">
            <div class="field">
              <span class="label">${getLang() === "ar" ? "شروط الخدمة (عربي)" : "Terms of Service (Arabic)"}</span>
              <textarea class="textarea" id="leg-terms-ar" style="min-block-size:120px" ${!canEdit ? "disabled" : ""}>${settings.legal?.terms?.ar || ""}</textarea>
            </div>
            <div class="field">
              <span class="label">${getLang() === "ar" ? "شروط الخدمة (إنجليزي)" : "Terms of Service (English)"}</span>
              <textarea class="textarea" id="leg-terms-en" style="min-block-size:120px" ${!canEdit ? "disabled" : ""}>${settings.legal?.terms?.en || ""}</textarea>
            </div>
            <div class="field">
              <span class="label">${getLang() === "ar" ? "سياسة الخصوصية (عربي)" : "Privacy Policy (Arabic)"}</span>
              <textarea class="textarea" id="leg-priv-ar" style="min-block-size:120px" ${!canEdit ? "disabled" : ""}>${settings.legal?.privacy?.ar || ""}</textarea>
            </div>
            <div class="field">
              <span class="label">${getLang() === "ar" ? "سياسة الخصوصية (إنجليزي)" : "Privacy Policy (English)"}</span>
              <textarea class="textarea" id="leg-priv-en" style="min-block-size:120px" ${!canEdit ? "disabled" : ""}>${settings.legal?.privacy?.en || ""}</textarea>
            </div>
            ${canEdit ? `
              <button type="submit" class="btn primary" style="align-self:flex-start">
                ${getLang() === "ar" ? "حفظ السياسات القانونية" : "Save Legal Policies"}
              </button>
            ` : ""}
          </form>
        </div>
      </div>

      <!-- 5. Notification Templates Preview -->
      <div id="set-templates" class="tab-pane" style="display:none">
        <div style="display:flex;flex-direction:column;gap:12px;max-inline-size:700px">
          <div class="card pad">
            <div style="font-weight:700;font-size:14px;margin-block-end:6px">📩 Booking Confirmed (تأكيد الحجز)</div>
            <div style="font-size:13px;color:var(--c-ink-700)">AR: تم تأكيد حجزك رقم {number}. أظهر رمز الوصول عند الوصول للمغسلة.</div>
            <div style="font-size:13px;color:var(--c-ink-700)">EN: Your booking {number} is confirmed. Show your QR on arrival.</div>
          </div>
          <div class="card pad">
            <div style="font-weight:700;font-size:14px;margin-block-end:6px">⏰ Wash Reminder (تذكير بالموعد)</div>
            <div style="font-size:13px;color:var(--c-ink-700)">AR: تذكير بموعد الغسيل: موعدك في {wash} يبدأ خلال {mins} دقيقة.</div>
            <div style="font-size:13px;color:var(--c-ink-700)">EN: Reminder: your car wash slot at {wash} starts in {mins} mins.</div>
          </div>
          <div class="card pad">
            <div style="font-weight:700;font-size:14px;margin-block-end:6px">⭐ Rate Your Visit (تقييم الزيارة)</div>
            <div style="font-size:13px;color:var(--c-ink-700)">AR: اكتملت خدمة الغسيل! شاركنا تقييمك لزيارتك في {wash}.</div>
            <div style="font-size:13px;color:var(--c-ink-700)">EN: Service completed! Please rate your visit at {wash}.</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  container.querySelectorAll("#settings-tabs .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll("#settings-tabs .tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const targetId = btn.dataset.tab;
      container.querySelectorAll(".tab-pane").forEach((p) => (p.style.display = "none"));
      container.querySelector(`#${targetId}`).style.display = "block";
    });
  });

  // Save General
  container.querySelector("#form-settings-general")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const phone = container.querySelector("#set-support-phone").value.trim();
    const email = container.querySelector("#set-support-email").value.trim();
    mutate((draft) => {
      draft.settings.support = draft.settings.support || {};
      draft.settings.support.phone = phone;
      draft.settings.support.email = email;
    });
    toast(getLang() === "ar" ? "تم حفظ إعدادات الدعم" : "Saved support settings");
  });

  // Save Defaults
  container.querySelector("#form-settings-defaults")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const leadTime = Number(container.querySelector("#def-lead-time").value);
    const cancelMin = Number(container.querySelector("#def-cancel-min").value);
    const graceMin = Number(container.querySelector("#def-grace-min").value);
    const reminderMin = Number(container.querySelector("#def-reminder-min").value);

    mutate((draft) => {
      draft.settings.bookingDefaults = {
        leadTimeMin: leadTime,
        freeCancelMin: cancelMin,
        noShowGraceMin: graceMin,
        reminderMin: reminderMin,
      };
    });
    toast(getLang() === "ar" ? "تم حفظ افتراضيات الحجز" : "Saved booking defaults");
  });

  // Save Legal
  container.querySelector("#form-settings-legal")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const termsAr = container.querySelector("#leg-terms-ar").value.trim();
    const termsEn = container.querySelector("#leg-terms-en").value.trim();
    const privAr = container.querySelector("#leg-priv-ar").value.trim();
    const privEn = container.querySelector("#leg-priv-en").value.trim();

    mutate((draft) => {
      draft.settings.legal = {
        terms: { ar: termsAr, en: termsEn },
        privacy: { ar: privAr, en: privEn },
      };
    });
    toast(getLang() === "ar" ? "تم حفظ السياسات القانونية" : "Saved legal policies");
  });

  return container;
}
