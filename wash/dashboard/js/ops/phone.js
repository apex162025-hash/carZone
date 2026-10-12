import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatPlate, formatTime, formatDate } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast } from "../../../../shared/js/ui.js";
import { slotStarts } from "../../../../shared/js/services/availability.js";
import { findCustomerOrVehicle, createPhoneBooking } from "../../../../shared/js/services/wash.js";
import { currentStaff, currentBranch } from "../state.js";

export function phoneBookingScreen(root) {
  const db = get();
  const staff = currentStaff();
  const branch = currentBranch();

  const services = db.services.filter((s) => s.branchId === branch.id && s.type === "primary" && s.active);
  let selectedServiceId = services[0]?.id || "";

  // Available slots for today
  const svc = services.find((s) => s.id === selectedServiceId) || services[0];
  const slots = slotStarts(db, branch, now(), svc?.durationMin || 30, now()).slice(0, 10);
  let selectedSlot = slots[0]?.start || now().toISOString();

  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" onclick="history.back()"><i data-lucide="arrow-right" class="dir-icon"></i></button>
      <h1>حجز هاتفي جديد</h1>
      <div></div>
    </header>

    <div class="screen-body" style="padding:14px 16px 80px">
      <p class="muted small" style="margin-block-end:16px">تسجيل موعد لعميل متصل عبر الهاتف. يتم تأكيد الحجز فورًا.</p>

      <div class="field" style="margin-block-end:14px">
        <span class="label">رقم هاتف العميل *</span>
        <input class="control num" id="phone-cust-tel" placeholder="010... أو 011..." autofocus />
      </div>

      <div id="phone-recog-box"></div>

      <div class="grid-2" style="margin-block-end:14px">
        <div class="field">
          <span class="label">اسم العميل *</span>
          <input class="control" id="phone-cust-name" placeholder="اسم العميل" />
        </div>
        <div class="field">
          <span class="label">رقم اللوحة *</span>
          <input class="control num" id="phone-cust-plate" placeholder="مثال: ABC123" style="text-transform:uppercase" />
        </div>
      </div>

      <div class="field" style="margin-block-end:14px">
        <span class="label">الخدمة المطلوبة *</span>
        <select class="control" id="phone-svc-select">
          ${services.map((s) => `
            <option value="${s.id}" ${s.id === selectedServiceId ? "selected" : ""}>
              ${L(s.name)} — ${s.price} ج.م (${s.durationMin} دقيقة)
            </option>
          `).join("")}
        </select>
      </div>

      <div class="field" style="margin-block-end:14px">
        <span class="label">الوقت المتاح اليوم *</span>
        <div class="wrap" id="phone-slots-wrap">
          ${slots.map((sl, i) => `
            <button class="chip flat slot-chip ${i === 0 ? "on" : ""}" data-slot="${sl.start}">
              ${formatTime(sl.start)}
            </button>
          `).join("")}
        </div>
      </div>

      <div class="field" style="margin-block-end:20px">
        <span class="label">ملاحظات إضافية</span>
        <input class="control" id="phone-note" placeholder="ملاحظة عن الحجز أو طلب العميل..." />
      </div>

      <button class="btn block" id="btn-submit-phone-book" style="min-height:50px;background:var(--c-primary-600);color:#fff">
        ✓ تأكيد الحجز الهاتفي
      </button>
    </div>
  `;

  paintIcons(root);

  const telInp = document.getElementById("phone-cust-tel");
  const nameInp = document.getElementById("phone-cust-name");
  const plateInp = document.getElementById("phone-cust-plate");
  const recogBox = document.getElementById("phone-recog-box");

  telInp.oninput = () => {
    const q = telInp.value.trim();
    const rec = findCustomerOrVehicle(q, branch.id);
    if (rec && rec.customer) {
      recogBox.innerHTML = `
        <div class="emp-recognize-box" style="margin-block-end:14px">
          <b>🌟 عميل سابق: ${rec.customer.name}</b> (${rec.previousVisitsCount} زيارات)
          <div class="small muted">السيارة: ${rec.plate}</div>
          <button class="btn sm ghost" id="apply-phone-recog" style="margin-block-start:6px">استخدام البيانات</button>
        </div>
      `;
      paintIcons(recogBox);

      document.getElementById("apply-phone-recog").onclick = () => {
        nameInp.value = rec.customer.name;
        plateInp.value = rec.plate;
        toast("تم تطبيق بيانات العميل المسجل ✓");
      };
    } else {
      recogBox.innerHTML = "";
    }
  };

  plateInp.oninput = (e) => {
    e.target.value = formatPlate(e.target.value);
  };

  root.querySelectorAll(".slot-chip").forEach((btn) => {
    btn.onclick = () => {
      root.querySelectorAll(".slot-chip").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      selectedSlot = btn.dataset.slot;
    };
  });

  document.getElementById("btn-submit-phone-book").onclick = async () => {
    const phone = telInp.value.trim();
    const name = nameInp.value.trim();
    const plate = plateInp.value.trim();
    const note = document.getElementById("phone-note").value.trim();

    if (!phone || !plate) {
      toast("يرجى ملء رقم الهاتف ورقم اللوحة");
      return;
    }

    try {
      const order = await createPhoneBooking({
        branchId: branch.id,
        serviceId: selectedServiceId,
        plate,
        phone,
        name,
        scheduledAt: selectedSlot,
        note,
        staffId: staff.id,
      });

      toast(`تم إنشاء الحجز الهاتفي ${order.number} بنجاح ✓`);
      location.hash = "#/orders";
    } catch (err) {
      toast(err.message || "حدث خطأ أثناء حفظ الحجز");
    }
  };
}
