import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatPlate, normalizePlate } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast, sheet } from "../../../../shared/js/ui.js";
import { findCustomerOrVehicle, createWalkInOrder, startService } from "../../../../shared/js/services/wash.js";
import { currentStaff, currentBranch } from "../state.js";

export function walkinScreen(root) {
  const db = get();
  const staff = currentStaff();
  const branch = currentBranch();

  // Primary services and add-ons for this branch
  const primaryServices = db.services.filter((s) => s.branchId === branch.id && s.type === "primary" && s.active);
  const addonServices = db.services.filter((s) => s.branchId === branch.id && s.type === "addon" && s.active);

  // Check bay occupancy
  const busyCount = db.orders.filter((o) => o.branchId === branch.id && o.status === "in_service").length;
  const isBaysFull = busyCount >= (branch.capacity || 6);

  let selectedServiceId = primaryServices[0]?.id || "";
  let selectedAddonIds = new Set();
  let recognizedCust = null;

  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" onclick="history.back()"><i data-lucide="arrow-right" class="dir-icon"></i></button>
      <h1>${t("emp.walkin.title")}</h1>
      <div></div>
    </header>

    <div class="screen-body" style="padding:14px 16px 80px">
      <!-- Full bays capacity warning -->
      ${isBaysFull ? `
        <div class="banner" style="margin-block-end:14px">
          ⚠️ ${t("emp.walkin.full_warn")}
        </div>
      ` : ""}

      <!-- Plate input (Large auto-uppercase) -->
      <div class="field" style="margin-block-end:14px">
        <span class="label">${t("emp.walkin.plate")} *</span>
        <input class="control num" id="walkin-plate" placeholder="${t("emp.walkin.plate_ph")}" style="font-size:22px;font-weight:800;letter-spacing:2px;text-transform:uppercase;height:54px" autofocus />
      </div>

      <!-- Customer Recognition Placeholder Container -->
      <div id="recognition-container"></div>

      <!-- Optional Phone & Name Accordion/Fields -->
      <div class="grid-2" style="margin-block-end:14px">
        <div class="field">
          <span class="label">${t("emp.walkin.phone")}</span>
          <input class="control num" id="walkin-phone" placeholder="010..." />
        </div>
        <div class="field">
          <span class="label">${t("emp.walkin.name")}</span>
          <input class="control" id="walkin-name" placeholder="اسم العميل" />
        </div>
      </div>

      <!-- Service Picker Tiles -->
      <div class="field" style="margin-block-end:14px">
        <span class="label">${t("emp.walkin.service")} *</span>
        <div class="stack" id="primary-services-list" style="gap:8px">
          ${primaryServices.map((svc) => `
            <div class="card pad between svc-tile ${svc.id === selectedServiceId ? "selected" : ""}" data-svcid="${svc.id}" style="cursor:pointer;border:2px solid ${svc.id === selectedServiceId ? "var(--c-primary-600)" : "var(--c-line)"}">
              <div>
                <b>${L(svc.name)}</b>
                <div class="small muted num">${svc.durationMin} دقيقة</div>
              </div>
              <b class="num" style="font-size:18px;color:var(--c-primary-600)">${money(svc.price)}</b>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Add-ons Chips -->
      ${addonServices.length > 0 ? `
        <div class="field" style="margin-block-end:16px">
          <span class="label">إضافات اختيارية:</span>
          <div class="wrap" id="addons-wrap">
            ${addonServices.map((ad) => `
              <button class="chip flat addon-chip" data-adid="${ad.id}">
                ＋ ${L(ad.name)} (+${money(ad.price)})
              </button>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <!-- Summary Footer & Create Order Button -->
      <div class="card pad" style="background:var(--c-surface);box-shadow:var(--sh-2);position:sticky;bottom:10px;z-index:5">
        <div class="between" style="margin-block-end:10px">
          <div>
            <div class="small muted">الوقت التقديري:</div>
            <b class="num" id="total-duration">٢٠ دقيقة</b>
          </div>
          <div style="text-align:end">
            <div class="small muted">السعر الإجمالي:</div>
            <b class="num" id="total-price" style="font-size:24px;color:var(--c-primary-600)">١٠٠ ج.م</b>
          </div>
        </div>

        <button class="emp-action-btn" id="create-order-btn" style="background:linear-gradient(135deg, var(--c-primary-600), #12c8b6);color:#fff">
          🚀 ${t("emp.walkin.create")}
        </button>
      </div>
    </div>
  `;

  paintIcons(root);

  const plateInp = document.getElementById("walkin-plate");
  const phoneInp = document.getElementById("walkin-phone");
  const nameInp = document.getElementById("walkin-name");
  const recogBox = document.getElementById("recognition-container");
  const durLabel = document.getElementById("total-duration");
  const priceLabel = document.getElementById("total-price");

  const updateTotals = () => {
    let tot = 0;
    let dur = 0;
    const prim = primaryServices.find((s) => s.id === selectedServiceId);
    if (prim) {
      tot += prim.price;
      dur += prim.durationMin;
    }
    selectedAddonIds.forEach((id) => {
      const ad = addonServices.find((s) => s.id === id);
      if (ad) {
        tot += ad.price;
        dur += ad.durationMin;
      }
    });

    priceLabel.textContent = money(tot);
    durLabel.textContent = `${dur} دقيقة`;
  };

  updateTotals();

  // Recognition trigger on plate or phone input
  const checkRecognition = () => {
    const qPlate = plateInp.value.trim();
    const qPhone = phoneInp.value.trim();
    const rec = findCustomerOrVehicle(qPlate || qPhone, branch.id);

    if (rec && (rec.customer || rec.vehicle)) {
      recognizedCust = rec;
      recogBox.innerHTML = `
        <div class="emp-recognize-box">
          <div class="between">
            <b style="color:var(--c-primary-700)">🌟 ${t("emp.recognize.title")}</b>
            <span class="badge" data-status="confirmed">${rec.previousVisitsCount} زيارات سابقة</span>
          </div>
          <div class="small" style="margin-block:6px">
            <b>${rec.customer?.name || "عميل دائم"}</b> · ${rec.vehicle?.make || "سيارة"} ${rec.vehicle?.model || ""} (${rec.plate})
          </div>
          <div class="small muted">
            آخر زيارة: منذ ١٤ يومًا · المعتاد: <b>${L(rec.usualService?.name) || "غسيل داخلي وخارجي"}</b>
          </div>
          <button class="btn sm block" id="btn-apply-recog" style="margin-block-start:8px;background:var(--c-primary-600);color:#fff">
            ✓ ${t("emp.recognize.apply")}
          </button>
        </div>
      `;

      paintIcons(recogBox);

      const applyBtn = document.getElementById("btn-apply-recog");
      if (applyBtn) {
        applyBtn.onclick = () => {
          if (rec.customer) {
            nameInp.value = rec.customer.name;
            phoneInp.value = rec.customer.phone;
          }
          if (rec.plate) plateInp.value = rec.plate;
          if (rec.usualServiceId) {
            selectedServiceId = rec.usualServiceId;
            root.querySelectorAll(".svc-tile").forEach((tile) => {
              tile.classList.toggle("selected", tile.dataset.svcid === selectedServiceId);
            });
            updateTotals();
          }
          toast("تم تطبيق بيانات العميل والخدمة المعتادة ✓");
        };
      }
    } else {
      recogBox.innerHTML = "";
    }
  };

  plateInp.oninput = (e) => {
    e.target.value = formatPlate(e.target.value);
    checkRecognition();
  };

  phoneInp.oninput = () => checkRecognition();

  // Service selection
  root.querySelectorAll(".svc-tile").forEach((tile) => {
    tile.onclick = () => {
      selectedServiceId = tile.dataset.svcid;
      root.querySelectorAll(".svc-tile").forEach((t) => t.classList.remove("selected"));
      tile.classList.add("selected");
      updateTotals();
    };
  });

  // Addon chips toggle
  root.querySelectorAll(".addon-chip").forEach((chip) => {
    chip.onclick = () => {
      const id = chip.dataset.adid;
      if (selectedAddonIds.has(id)) {
        selectedAddonIds.delete(id);
        chip.classList.remove("on");
      } else {
        selectedAddonIds.add(id);
        chip.classList.add("on");
      }
      updateTotals();
    };
  });

  // Create Order Submit
  document.getElementById("create-order-btn").onclick = async () => {
    const plate = plateInp.value.trim();
    if (!plate) {
      toast("يرجى إدخال رقم اللوحة");
      plateInp.focus();
      return;
    }

    try {
      const order = await createWalkInOrder({
        branchId: branch.id,
        serviceId: selectedServiceId,
        addonIds: Array.from(selectedAddonIds),
        plate,
        phone: phoneInp.value.trim(),
        name: nameInp.value.trim(),
        customerId: recognizedCust?.customer?.id || null,
        vehicleId: recognizedCust?.vehicle?.id || null,
        staffId: staff.id,
      });

      // Show success sheet offering Start Service Now / Back to Today
      showSuccessSheet(order, root);
    } catch (err) {
      toast(err.message || "حدث خطأ أثناء إنشاء الطلب");
    }
  };
}

async function showSuccessSheet(order, root) {
  const html = `
    <div style="text-align:center;padding:12px 4px">
      <div style="font-size:48px;margin-block-end:8px">🎉</div>
      <h3 style="font-size:var(--fs-22)">تم إنشاء الطلب بنجاح!</h3>
      <div class="badge" data-status="waiting" style="font-size:16px;margin-block:8px">${order.number}</div>
      <p class="muted small" style="margin-block-end:20px">
        السيارة <b>${order.plate}</b> مسجلة الآن في قائمة الانتظار.
      </p>

      <div class="stack" style="gap:10px">
        <button class="btn block" id="btn-success-start" style="background:var(--st-in_service);min-height:48px">
          🚿 بدء الخدمة الآن (Start Service)
        </button>
        <button class="btn ghost block" id="btn-success-today">
          العودة لشاشة اليوم (Today)
        </button>
      </div>
    </div>
  `;

  await sheet(html);

  const sheetEl = document.querySelector(".sheet");
  if (!sheetEl) return;

  sheetEl.querySelector("#btn-success-start").onclick = async () => {
    try {
      await startService(order.id, currentStaff().id);
      document.querySelector(".overlay")?.remove();
      toast("بدأ تنفيذ الخدمة بنجاح 🚿");
      location.hash = "#/home";
    } catch (err) {
      toast(err.message || "المسارات مشغولة حاليًا");
      document.querySelector(".overlay")?.remove();
      location.hash = "#/home";
    }
  };

  sheetEl.querySelector("#btn-success-today").onclick = () => {
    document.querySelector(".overlay")?.remove();
    location.hash = "#/home";
  };
}
