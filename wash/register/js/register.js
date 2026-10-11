import { get, subscribe, now } from "../../../shared/js/db.js";
import { t, L, getLang, setLang, applyLang } from "../../../shared/js/i18n.js";
import { paintIcons } from "../../../shared/js/dom.js";
import { toast } from "../../../shared/js/ui.js";
import { submitWashApplication, updateWashApplication } from "../../../shared/js/services/wash.js";

let currentStep = 1;
let mapInstance = null;
let mapMarker = null;
let activeAppId = localStorage.getItem("carzen_active_app_id") || null;

const formData = {
  businessName: "مغسلة النور الحديثة",
  ownerName: "كريم طارق",
  phone: "+20 100 888 7766",
  email: "kareem@alnourwash.com",
  branchName: "فرع النزهة الجديدة",
  area: "Heliopolis",
  address: "١٤ شارع النزهة، مصر الجديدة، القاهرة",
  lat: 30.112,
  lng: 31.345,
  capacity: 4,
  workingHours: [
    { day: "السبت - الخميس", open: "09:00", close: "23:00", closed: false },
    { day: "الجمعة", open: "13:00", close: "23:00", closed: false },
  ],
  services: [
    { name: { ar: "غسيل خارجي", en: "Exterior Wash" }, price: 100, durationMin: 20, selected: true },
    { name: { ar: "غسيل داخلي", en: "Interior Wash" }, price: 100, durationMin: 25, selected: true },
    { name: { ar: "غسيل داخلي وخارجي", en: "Interior + Exterior" }, price: 180, durationMin: 40, selected: true },
    { name: { ar: "تنظيف عميق (بخار)", en: "Deep Cleaning (Steam)" }, price: 300, durationMin: 60, selected: false },
  ],
  documents: ["commercial_register_2026.pdf", "tax_card.pdf"],
  photos: ["storefront_front.jpg"],
};

export function initRegister() {
  applyLang();

  // Check URL hash or stored active application
  const hash = location.hash;
  if (hash.startsWith("#/status")) {
    const id = new URLSearchParams(hash.split("?")[1] || "").get("id") || activeAppId;
    if (id) {
      activeAppId = id;
      renderStatus(id);
      return;
    }
  }

  renderStep(currentStep);

  subscribe(() => {
    if (location.hash.startsWith("#/status") && activeAppId) {
      renderStatus(activeAppId);
    }
  });
}

function renderStep(step) {
  currentStep = step;
  const container = document.getElementById("wizard-content");
  if (!container) return;

  renderStepsBar();

  if (step === 1) renderStep1(container);
  else if (step === 2) renderStep2(container);
  else if (step === 3) renderStep3(container);
  else if (step === 4) renderStep4(container);
  else if (step === 5) renderStep5(container);
  else if (step === 6) renderStep6(container);

  paintIcons(container);
}

function renderStepsBar() {
  const bar = document.getElementById("steps-bar");
  if (!bar) return;

  const steps = [
    { num: 1, label: t("reg.wizard.step1") },
    { num: 2, label: t("reg.wizard.step2") },
    { num: 3, label: t("reg.wizard.step3") },
    { num: 4, label: t("reg.wizard.step4") },
    { num: 5, label: t("reg.wizard.step5") },
    { num: 6, label: t("reg.wizard.step6") },
  ];

  bar.innerHTML = steps.map((s, idx) => {
    const isDone = s.num < currentStep;
    const isActive = s.num === currentStep;
    const cls = isDone ? "done" : isActive ? "active" : "";
    return `
      <div class="step-item ${cls}">
        <span class="step-num">${isDone ? "✓" : s.num}</span>
        <span class="step-text">${s.label}</span>
      </div>
      ${idx < steps.length - 1 ? `<div class="step-line ${isDone ? "done" : ""}"></div>` : ""}
    `;
  }).join("");
}

function renderStep1(root) {
  root.innerHTML = `
    <div class="reg-card">
      <h2>${t("reg.wizard.step1")}</h2>
      <p class="sub">أدخل البيانات الأساسية للمنشأة والمالك المسؤول لتسجيل الحساب.</p>

      <div class="reg-grid">
        <div class="field">
          <span class="label">اسم المغسلة / المنشأة *</span>
          <input class="control" id="f-bizName" value="${formData.businessName}" required />
        </div>
        <div class="field">
          <span class="label">اسم المالك المسؤول *</span>
          <input class="control" id="f-ownerName" value="${formData.ownerName}" required />
        </div>
        <div class="field">
          <span class="label">رقم الموبايل للتواصل *</span>
          <input class="control num" id="f-phone" value="${formData.phone}" required />
        </div>
        <div class="field">
          <span class="label">البريد الإلكتروني *</span>
          <input class="control" type="email" id="f-email" value="${formData.email}" required />
        </div>
      </div>

      <div class="reg-footer">
        <a class="btn ghost" href="../../index.html">${t("common.cancel")}</a>
        <button class="btn" id="next-btn">${t("onb.next")} <i data-lucide="arrow-left" class="dir-icon"></i></button>
      </div>
    </div>
  `;

  document.getElementById("next-btn").onclick = () => {
    formData.businessName = document.getElementById("f-bizName").value.trim() || formData.businessName;
    formData.ownerName = document.getElementById("f-ownerName").value.trim() || formData.ownerName;
    formData.phone = document.getElementById("f-phone").value.trim() || formData.phone;
    formData.email = document.getElementById("f-email").value.trim() || formData.email;
    renderStep(2);
  };
}

function renderStep2(root) {
  root.innerHTML = `
    <div class="reg-card">
      <h2>${t("reg.wizard.step2")}</h2>
      <p class="sub">حدد موقع الفرع بدقة لتوجيه العملاء القريبين إليك.</p>

      <div class="reg-grid">
        <div class="field">
          <span class="label">اسم الفرع *</span>
          <input class="control" id="f-branchName" value="${formData.branchName}" required />
        </div>
        <div class="field">
          <span class="label">المنطقة *</span>
          <select class="control" id="f-area">
            <option value="Heliopolis" ${formData.area === "Heliopolis" ? "selected" : ""}>مصر الجديدة</option>
            <option value="Nasr City" ${formData.area === "Nasr City" ? "selected" : ""}>مدينة نصر</option>
            <option value="New Cairo" ${formData.area === "New Cairo" ? "selected" : ""}>القاهرة الجديدة</option>
            <option value="Maadi" ${formData.area === "Maadi" ? "selected" : ""}>المعادي</option>
            <option value="Zamalek" ${formData.area === "Zamalek" ? "selected" : ""}>الزمالك</option>
          </select>
        </div>
      </div>

      <div class="field" style="margin-block-start:14px">
        <span class="label">العنوان التفصيلي *</span>
        <input class="control" id="f-address" value="${formData.address}" required />
      </div>

      <div class="field" style="margin-block-start:14px">
        <span class="label">حدد موقع المغسلة على الخريطة (انقر لتثبيت العلامة):</span>
        <div id="reg-map" class="map-container"></div>
        <span class="hint">إحداثيات الموقع: <span id="coords-text" class="num">${formData.lat.toFixed(4)}, ${formData.lng.toFixed(4)}</span></span>
      </div>

      <div class="reg-footer">
        <button class="btn ghost" id="prev-btn">${t("common.back")}</button>
        <button class="btn" id="next-btn">${t("onb.next")} <i data-lucide="arrow-left" class="dir-icon"></i></button>
      </div>
    </div>
  `;

  document.getElementById("prev-btn").onclick = () => renderStep(1);
  document.getElementById("next-btn").onclick = () => {
    formData.branchName = document.getElementById("f-branchName").value.trim() || formData.branchName;
    formData.area = document.getElementById("f-area").value;
    formData.address = document.getElementById("f-address").value.trim() || formData.address;
    renderStep(3);
  };

  // Initialize Leaflet Map
  setTimeout(() => {
    if (window.L && document.getElementById("reg-map")) {
      mapInstance = window.L.map("reg-map").setView([formData.lat, formData.lng], 14);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(mapInstance);

      mapMarker = window.L.marker([formData.lat, formData.lng], { draggable: true }).addTo(mapInstance);

      const updateCoords = (lat, lng) => {
        formData.lat = lat;
        formData.lng = lng;
        const span = document.getElementById("coords-text");
        if (span) span.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      };

      mapMarker.on("dragend", (e) => {
        const pos = e.target.getLatLng();
        updateCoords(pos.lat, pos.lng);
      });

      mapInstance.on("click", (e) => {
        mapMarker.setLatLng(e.latlng);
        updateCoords(e.latlng.lat, e.latlng.lng);
      });
    }
  }, 100);
}

function renderStep3(root) {
  root.innerHTML = `
    <div class="reg-card">
      <h2>${t("reg.wizard.step3")}</h2>
      <p class="sub">اختر الخدمات التي تقدمها المغسلة مع تحديد السعر والمدة التقديرية بالدقائق.</p>

      <div id="services-list">
        ${formData.services.map((svc, i) => `
          <div class="service-template-item ${svc.selected ? "selected" : ""}" data-idx="${i}">
            <label class="row" style="cursor:pointer;flex:1">
              <input type="checkbox" ${svc.selected ? "checked" : ""} data-check="${i}" style="width:18px;height:18px;accent-color:var(--c-primary-600)" />
              <div style="margin-inline-start:8px">
                <b>${L(svc.name)}</b>
                <div class="small muted">${svc.durationMin} دقيقة</div>
              </div>
            </label>
            <div class="row">
              <input class="control num" type="number" value="${svc.price}" data-price="${i}" style="width:90px;height:38px" />
              <span class="small muted">ج.م</span>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="reg-footer">
        <button class="btn ghost" id="prev-btn">${t("common.back")}</button>
        <button class="btn" id="next-btn">${t("onb.next")} <i data-lucide="arrow-left" class="dir-icon"></i></button>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-check]").forEach((ck) => {
    ck.onchange = (e) => {
      const idx = Number(e.target.dataset.check);
      formData.services[idx].selected = e.target.checked;
      renderStep3(root);
    };
  });

  root.querySelectorAll("[data-price]").forEach((inp) => {
    inp.oninput = (e) => {
      const idx = Number(e.target.dataset.price);
      formData.services[idx].price = Number(e.target.value) || 0;
    };
  });

  document.getElementById("prev-btn").onclick = () => renderStep(2);
  document.getElementById("next-btn").onclick = () => renderStep(4);
}

function renderStep4(root) {
  root.innerHTML = `
    <div class="reg-card">
      <h2>${t("reg.wizard.step4")}</h2>
      <p class="sub">حدد الطاقة الاستيعابية لمسارات الغسيل ومواعيد العمل الأسبوعية.</p>

      <div class="field" style="margin-block-end:20px">
        <span class="label">عدد مسارات الغسيل المتزامنة (Bays Capacity) *</span>
        <div class="row">
          <input class="control num" type="number" min="1" max="20" id="f-cap" value="${formData.capacity}" style="max-width:140px" />
          <span class="muted small">سيارات في وقت واحد</span>
        </div>
      </div>

      <h3 style="font-size:var(--fs-16);margin-block:16px 8px">ساعات العمل:</h3>
      <div class="stack">
        <div class="hours-row">
          <span>السبت - الخميس</span>
          <div class="row">
            <input class="control" type="time" value="09:00" style="width:110px" />
            <span>إلى</span>
            <input class="control" type="time" value="23:00" style="width:110px" />
          </div>
        </div>
        <div class="hours-row">
          <span>الجمعة</span>
          <div class="row">
            <input class="control" type="time" value="13:00" style="width:110px" />
            <span>إلى</span>
            <input class="control" type="time" value="23:00" style="width:110px" />
          </div>
        </div>
      </div>

      <div class="reg-footer">
        <button class="btn ghost" id="prev-btn">${t("common.back")}</button>
        <button class="btn" id="next-btn">${t("onb.next")} <i data-lucide="arrow-left" class="dir-icon"></i></button>
      </div>
    </div>
  `;

  document.getElementById("prev-btn").onclick = () => renderStep(3);
  document.getElementById("next-btn").onclick = () => {
    formData.capacity = Number(document.getElementById("f-cap").value) || 4;
    renderStep(5);
  };
}

function renderStep5(root) {
  root.innerHTML = `
    <div class="reg-card">
      <h2>${t("reg.wizard.step5")}</h2>
      <p class="sub">ارفع صورة واجهة المغسلة والسجل التجاري / البطاقة الضريبية (محاكاة رفع ملفات).</p>

      <div class="field" style="margin-block-end:20px">
        <span class="label">صور المغسلة والواجهة:</span>
        <div class="file-dropzone" id="photo-drop">
          <i data-lucide="camera" style="margin-inline:auto;margin-block-end:8px;width:32px;height:32px;color:var(--c-primary-600)"></i>
          <b>انقر لإضافة صور المغسلة</b>
          <div class="small muted">JPG, PNG بحد أقصى ٥ ميجابايت</div>
        </div>
        <div class="file-preview">
          <span class="small">🖼️ storefront_front.jpg</span>
          <span class="badge" data-status="confirmed">تم الفحص</span>
        </div>
      </div>

      <div class="field">
        <span class="label">المستندات القانونية (سجل تجاري / رخصة):</span>
        <div class="file-dropzone" id="doc-drop">
          <i data-lucide="file-text" style="margin-inline:auto;margin-block-end:8px;width:32px;height:32px;color:var(--c-accent-500)"></i>
          <b>انقر لرفع المستندات الرسمية</b>
          <div class="small muted">PDF أو صور ممسوحة ضوئيًا</div>
        </div>
        <div class="file-preview">
          <span class="small">📄 commercial_register_2026.pdf</span>
          <span class="badge" data-status="confirmed">جاهز</span>
        </div>
      </div>

      <div class="reg-footer">
        <button class="btn ghost" id="prev-btn">${t("common.back")}</button>
        <button class="btn" id="next-btn">${t("onb.next")} <i data-lucide="arrow-left" class="dir-icon"></i></button>
      </div>
    </div>
  `;

  document.getElementById("photo-drop").onclick = () => toast("تمت محاكاة تحديد صورة إضافية بنجاح ✓");
  document.getElementById("doc-drop").onclick = () => toast("تمت محاكاة إضافة مستند تجاري بنجاح ✓");
  document.getElementById("prev-btn").onclick = () => renderStep(4);
  document.getElementById("next-btn").onclick = () => renderStep(6);
}

function renderStep6(root) {
  const selectedSvcs = formData.services.filter((s) => s.selected);

  root.innerHTML = `
    <div class="reg-card">
      <h2>${t("reg.wizard.step6")}</h2>
      <p class="sub">راجع بيانات طلب الانضمام قبل الإرسال لفريق عمليات كارزن.</p>

      <div class="stack" style="gap:16px">
        <div class="card pad" style="background:var(--c-bg)">
          <div class="between" style="margin-block-end:8px">
            <b>${formData.businessName}</b>
            <span class="badge" data-status="pending">مسودة جاهزة للإرسال</span>
          </div>
          <div class="small muted">المالك: ${formData.ownerName} · ${formData.phone}</div>
          <div class="small muted">الفرع: ${formData.branchName} (${formData.area})</div>
          <div class="small muted">العنوان: ${formData.address}</div>
          <div class="small muted">الطاقة: ${formData.capacity} مسارات غسيل متزامنة</div>
        </div>

        <div class="card pad" style="background:var(--c-bg)">
          <b>الخدمات المختارة (${selectedSvcs.length}):</b>
          <ul style="margin-block-start:8px;padding-inline-start:20px;list-style:disc">
            ${selectedSvcs.map((s) => `
              <li class="small">${L(s.name)} — <b class="num">${s.price} ج.م</b> (${s.durationMin} دقيقة)</li>
            `).join("")}
          </ul>
        </div>
      </div>

      <div class="reg-footer">
        <button class="btn ghost" id="prev-btn">${t("common.back")}</button>
        <button class="btn" id="submit-btn" style="background:var(--c-success)">
          <i data-lucide="check-circle"></i> إرسال طلب الانضمام
        </button>
      </div>
    </div>
  `;

  document.getElementById("prev-btn").onclick = () => renderStep(5);
  document.getElementById("submit-btn").onclick = async () => {
    try {
      const app = await submitWashApplication({
        businessName: formData.businessName,
        ownerName: formData.ownerName,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        lat: formData.lat,
        lng: formData.lng,
        capacity: formData.capacity,
        services: selectedSvcs.map((s) => L(s.name)),
        photos: formData.photos,
        documents: formData.documents,
      });

      activeAppId = app.id;
      localStorage.setItem("carzen_active_app_id", app.id);
      location.hash = `#/status?id=${app.id}`;
      renderStatus(app.id);
      toast("تم إرسال طلب الانضمام بنجاح!");
    } catch (err) {
      toast("حدث خطأ أثناء إرسال الطلب");
    }
  };
}

function renderStatus(appId) {
  const container = document.getElementById("wizard-content");
  if (!container) return;

  const bar = document.getElementById("steps-bar");
  if (bar) bar.style.display = "none";

  const db = get();
  const app = (db.washApplications || []).find((a) => a.id === appId) || {
    id: appId,
    businessName: formData.businessName,
    status: "pending",
  };

  let badgeColor = "pending";
  let statusTitle = t("reg.status.pending");
  let statusDesc = "يقوم فريق العمليات بمراجعة المستندات ومطابقة المعايير الجغرافية. سيتم التواصل معك هاتفيًا خلال ٢٤ ساعة.";

  if (app.status === "approved") {
    badgeColor = "completed";
    statusTitle = t("reg.status.approved");
    statusDesc = "تم تفعيل حسابك كشريك رسمي على منصة كارزن! يمكنك الآن فتح لوحة التحكم وبدء إدارة الحجوزات والعمليات.";
  } else if (app.status === "needs_changes") {
    badgeColor = "pending";
    statusTitle = t("reg.status.changes");
    statusDesc = app.reviewNote || "يرجى تحديث السجل التجاري أو إضافة صور أوضح لمسارات الغسيل.";
  } else if (app.status === "rejected") {
    badgeColor = "cancelled";
    statusTitle = t("reg.status.rejected");
    statusDesc = app.reviewNote || "نعتذر عن عدم قبول الطلب في الوقت الحالي لعدم استيفاء شروط التغطية الجغرافية.";
  }

  container.innerHTML = `
    <div class="reg-card status-hero">
      <div class="status-icon-lg" style="background:color-mix(in srgb, var(--st-${badgeColor}) 16%, transparent);color:var(--st-${badgeColor})">
        ${app.status === "approved" ? "🎉" : app.status === "rejected" ? "❌" : "⏳"}
      </div>

      <h2>${statusTitle}</h2>
      <p class="sub" style="max-width:520px;margin-inline:auto">${statusDesc}</p>

      <div class="card pad" style="max-width:440px;margin:20px auto;text-align:start;background:var(--c-bg)">
        <div class="between">
          <span class="small muted">رقم الطلب:</span>
          <b class="num">${app.id}</b>
        </div>
        <div class="between" style="margin-block-start:8px">
          <span class="small muted">المنشأة:</span>
          <b>${app.businessName}</b>
        </div>
        <div class="between" style="margin-block-start:8px">
          <span class="small muted">الحالة الحالية:</span>
          <span class="badge" data-status="${badgeColor}">${app.status}</span>
        </div>
      </div>

      <div class="row center" style="margin-block-start:24px;gap:12px">
        ${app.status === "approved" ? `
          <a class="btn" href="../dashboard/index.html">الدخول إلى لوحة المغسلة</a>
        ` : app.status === "needs_changes" ? `
          <button class="btn" id="edit-resubmit-btn">تعديل البيانات وإعادة الإرسال</button>
        ` : `
          <button class="btn secondary" id="simulate-approve-btn">محاكاة موافقة الإدارة (Demo)</button>
        `}
        <a class="btn ghost" href="../../index.html">العودة للرئيسية</a>
      </div>
    </div>
  `;

  paintIcons(container);

  const editBtn = document.getElementById("edit-resubmit-btn");
  if (editBtn) {
    editBtn.onclick = () => {
      if (bar) bar.style.display = "flex";
      renderStep(1);
    };
  }

  const simBtn = document.getElementById("simulate-approve-btn");
  if (simBtn) {
    simBtn.onclick = () => {
      app.status = "approved";
      renderStatus(appId);
      toast("تمت محاكاة اعتماد الطلب بنجاح ✓");
    };
  }
}
