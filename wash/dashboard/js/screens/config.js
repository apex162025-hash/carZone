import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatDateTime, formatTime } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast, sheet } from "../../../../shared/js/ui.js";
import {
  saveService,
  toggleServiceActive,
  saveOffer,
  saveStaffMember,
} from "../../../../shared/js/services/wash.js";
import { currentStaff, isOwner, isManager, selectedBranchId, canEditServices } from "../state.js";

/* =========================================================================
   D8: SERVICES & PRICING
   ========================================================================= */

export function servicesScreen(root) {
  const db = get();
  const staff = currentStaff();
  const branchId = selectedBranchId() === "all" ? "br_nasr" : selectedBranchId();
  const editable = canEditServices();

  const services = db.services.filter((s) => s.branchId === branchId);

  root.innerHTML = `
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.services")}</h1>
        <p class="small muted">قائمة الخدمات والأسعار المعتمدة للفرع</p>
      </div>

      ${editable ? `
        <button class="btn sm" id="btn-add-service">＋ إضافة خدمة جديدة</button>
      ` : `
        <div class="badge" data-status="pending">عرض فقط (غير مسموح للمدير بتعديل الأسعار)</div>
      `}
    </div>

    ${!editable ? `
      <div class="banner" style="margin-block-end:16px">
        🔒 تعديل الخدمات والأسعار مقتصر على المالك، أو المدير في حال منحه صلاحية "تعديل الخدمات" من المالك.
      </div>
    ` : ""}

    <div class="card pad">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>اسم الخدمة</th>
              <th>النوع</th>
              <th>الفئة</th>
              <th>المدة التقديرية</th>
              <th>السعر</th>
              <th>الحالة</th>
              ${editable ? `<th>الإجراء</th>` : ""}
            </tr>
          </thead>
          <tbody>
            ${services.map((s) => `
              <tr>
                <td>
                  <b>${s.name.ar}</b>
                  <div class="small muted">${s.name.en}</div>
                </td>
                <td><span class="badge" data-status="${s.type === "primary" ? "confirmed" : "waiting"}">${s.type === "primary" ? "أساسية" : "إضافية"}</span></td>
                <td>${s.category}</td>
                <td class="num">${s.durationMin} دقيقة</td>
                <td class="num font-bold" style="color:var(--c-primary-600)">${money(s.price)}</td>
                <td><span class="badge" data-status="${s.active ? "completed" : "cancelled"}">${s.active ? "نشطة" : "معطلة"}</span></td>
                ${editable ? `
                  <td>
                    <button class="btn sm ghost" data-toggle-svc="${s.id}">${s.active ? "تعطيل" : "تفعيل"}</button>
                  </td>
                ` : ""}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  paintIcons(root);

  if (editable) {
    root.querySelectorAll("[data-toggle-svc]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.toggleSvc;
        await toggleServiceActive(id, staff.id);
        toast("تم تحديث حالة الخدمة فورًا ✓");
        servicesScreen(root);
      };
    });

    const addBtn = document.getElementById("btn-add-service");
    if (addBtn) {
      addBtn.onclick = () => openServiceFormModal(null, branchId, root);
    }
  }
}

async function openServiceFormModal(service, branchId, root) {
  const html = `
    <h3 style="font-size:var(--fs-22);margin-block-end:12px">${service ? "تعديل خدمة" : "إضافة خدمة جديدة"}</h3>

    <div class="grid-2" style="margin-block-end:12px">
      <div class="field">
        <span class="label">الاسم بالعربية *:</span>
        <input class="control" id="svc-name-ar" value="${service?.name?.ar || ""}" placeholder="مثال: غسيل بخار مكثف" />
      </div>
      <div class="field">
        <span class="label">الاسم بالإنجليزية *:</span>
        <input class="control" id="svc-name-en" value="${service?.name?.en || ""}" placeholder="Steam Intensive" />
      </div>
    </div>

    <div class="grid-2" style="margin-block-end:12px">
      <div class="field">
        <span class="label">السعر (ج.م) *:</span>
        <input class="control num" type="number" id="svc-price" value="${service?.price || 150}" />
      </div>
      <div class="field">
        <span class="label">المدة بالدقائق *:</span>
        <input class="control num" type="number" id="svc-dur" value="${service?.durationMin || 30}" />
      </div>
    </div>

    <button class="btn block" id="btn-save-svc" style="min-height:48px;margin-block-start:8px">حفظ الخدمة</button>
  `;

  await sheet(html);

  const sheetEl = document.querySelector(".sheet");
  if (!sheetEl) return;

  sheetEl.querySelector("#btn-save-svc").onclick = async () => {
    const ar = sheetEl.querySelector("#svc-name-ar").value.trim();
    const en = sheetEl.querySelector("#svc-name-en").value.trim();
    const price = Number(sheetEl.querySelector("#svc-price").value) || 100;
    const durationMin = Number(sheetEl.querySelector("#svc-dur").value) || 20;

    if (!ar) {
      toast("يرجى إدخال اسم الخدمة");
      return;
    }

    try {
      await saveService({
        id: service?.id || null,
        branchId,
        name: { ar, en: en || ar },
        price,
        durationMin,
        type: "primary",
        category: "full",
        active: true,
      }, currentStaff().id);

      document.querySelector(".overlay")?.remove();
      toast("تم حفظ الخدمة وتحديث المنظومة بنجاح ✓");
      servicesScreen(root);
    } catch (err) {
      toast(err.message || "حدث خطأ");
    }
  };
}

/* =========================================================================
   D9: OFFERS
   ========================================================================= */

export function offersScreen(root) {
  const db = get();
  const offers = db.offers.filter((o) => o.businessId === "biz_carzen" || o.scope === "wash");

  root.innerHTML = `
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.offers")}</h1>
        <p class="small muted">إدارة عروض وخصومات المغسلة التي تظهر للعملاء في التطبيق</p>
      </div>

      <button class="btn sm" id="btn-add-offer">＋ إنشاء عرض جديد</button>
    </div>

    <div class="card pad">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>عنوان العرض</th>
              <th>الخصم</th>
              <th>تاريخ البداية</th>
              <th>تاريخ الانتهاء</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${offers.map((of) => `
              <tr>
                <td>
                  <b>${of.title.ar}</b>
                  <div class="small muted">${of.description.ar || ""}</div>
                </td>
                <td><b class="chip on">${of.discountType === "percent" ? `${of.discountValue}%` : money(of.discountValue)}</b></td>
                <td class="num small">${formatDateTime(of.startAt)}</td>
                <td class="num small">${formatDateTime(of.endAt)}</td>
                <td><span class="badge" data-status="${of.status === "active" ? "completed" : "cancelled"}">${of.status}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  paintIcons(root);

  document.getElementById("btn-add-offer").onclick = async () => {
    toast("نموذج إنشاء العرض متاح للحفظ السريع ✓");
  };
}

/* =========================================================================
   D10: EMPLOYEES & PERMISSIONS
   ========================================================================= */

export function employeesScreen(root) {
  const db = get();
  const staffList = db.staff.filter((s) => s.businessId === "biz_carzen");

  root.innerHTML = `
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.employees")}</h1>
        <p class="small muted">إدارة حسابات فريق العمل وصلاحيات الخصم وإدارة المسارات</p>
      </div>

      <button class="btn sm" id="btn-add-emp">＋ إضافة موظف جديد</button>
    </div>

    <div class="card pad">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الدور (Role)</th>
              <th>رقم الهاتف</th>
              <th>الحد الأقصى للخصم</th>
              <th>صلاحية تأكيد الحجز</th>
              <th>صلاحية الإلغاء</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${staffList.map((st) => `
              <tr>
                <td><b>${st.name}</b></td>
                <td><span class="badge" data-status="${st.role === "owner" ? "confirmed" : st.role === "manager" ? "waiting" : "in_service"}">${st.role === "owner" ? "مالك" : st.role === "manager" ? "مدير فرع" : "موظف"}</span></td>
                <td class="num">${st.phone}</td>
                <td class="num font-bold">${st.maxDiscountPct || 10}%</td>
                <td>${st.permissions?.confirmBooking ? "✓ نعم" : "—"}</td>
                <td>${st.permissions?.cancelOrder ? "✓ نعم" : "—"}</td>
                <td><span class="badge" data-status="${st.status === "active" ? "completed" : "cancelled"}">${st.status === "active" ? "نشط" : "معطل"}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  paintIcons(root);

  document.getElementById("btn-add-emp").onclick = () => {
    toast("نموذج إضافة موظف جديد ✓");
  };
}

/* =========================================================================
   D16: BRANCHES & D19: SETTINGS
   ========================================================================= */

export function branchesScreen(root) {
  const db = get();
  const branches = db.branches.filter((b) => b.businessId === "biz_carzen");

  root.innerHTML = `
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.branches")}</h1>
        <p class="small muted">فروع المنشأة ومواقعها وساعات العمل والطاقة الاستيعابية</p>
      </div>
    </div>

    <div class="grid-2">
      ${branches.map((b) => `
        <div class="card pad">
          <div class="between" style="margin-block-end:8px">
            <b>${b.name.ar}</b>
            <span class="badge" data-status="${b.active ? "completed" : "cancelled"}">${b.active ? "نشط" : "معطل"}</span>
          </div>
          <div class="small muted">${b.address.ar}</div>
          <div class="row" style="margin-block:12px">
            <span class="chip flat">الطاقة: ${b.capacity} مسارات</span>
            <span class="chip flat">المواعيد: ٠٩:٠٠ - ٠٠:٠٠</span>
            <span class="chip flat">التقييم: ⭐ ${b.rating || 4.8}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  paintIcons(root);
}

export function settingsScreen(root) {
  const db = get();
  const branch = db.branches.find((b) => b.id === "br_nasr") || db.branches[0];

  root.innerHTML = `
    <div style="margin-block-end:20px">
      <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.settings")}</h1>
      <p class="small muted">قواعد الحجز وسياسات التشغيل وصلاحيات المنظومة</p>
    </div>

    <!-- Booking Rules (OW-12) -->
    <div class="card pad" style="max-width:700px;margin-block-end:24px">
      <h3 style="font-size:var(--fs-18);margin-block-end:16px">قواعد وسياسات الحجز (Booking Rules)</h3>

      <div class="stack" style="gap:14px">
        <div class="between">
          <div>
            <b>التأكيد التلقائي للحجوزات (Auto-Confirm)</b>
            <div class="small muted">تأكيد حجوزات التطبيق فورًا دون الحاجة لموافقة الموظف</div>
          </div>
          <input type="checkbox" ${branch.settings?.autoConfirm ? "checked" : ""} style="width:20px;height:20px" id="st-autoconfirm" />
        </div>

        <div class="between">
          <div>
            <b>الفاصل بين المواعيد (Slot Interval)</b>
            <div class="small muted">مدة شرائح الحجز الزمنية</div>
          </div>
          <span class="num font-bold">٣٠ دقيقة</span>
        </div>

        <div class="between">
          <div>
            <b>مهلة الإلغاء المجاني (Free Cancellation Window)</b>
            <div class="small muted">يمكن للعميل الإلغاء مجانًا حتى قبل الموعد بـ</div>
          </div>
          <span class="num font-bold">٦٠ دقيقة</span>
        </div>

        <div class="between">
          <div>
            <b>مهلة عدم الحضور (No-show Grace Period)</b>
            <div class="small muted">المهلة المسموحة للعميل بعد فوات الموعد قبل اعتباره لم يحضر</div>
          </div>
          <span class="num font-bold">١٥ دقيقة</span>
        </div>
      </div>
    </div>

    <!-- Permission Matrix (spec 02 §4) -->
    <div class="card pad" style="max-width:700px">
      <h3 style="font-size:var(--fs-18);margin-block-end:12px">مصفوفة الأدوار والصلاحيات (Permissions Matrix)</h3>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>الصلاحية</th>
              <th>المالك (Owner)</th>
              <th>مدير الفرع (Manager)</th>
              <th>الموظف (Employee)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>تأكيد الحجوزات</td><td>✓ نعم</td><td>✓ نعم</td><td>✓ إذا سمح له</td></tr>
            <tr><td>بدء وإنهاء الخدمة</td><td>✓ نعم</td><td>✓ نعم</td><td>✓ نعم</td></tr>
            <tr><td>تحصيل الدفع (POS/Cash)</td><td>✓ نعم</td><td>✓ نعم</td><td>✓ نعم</td></tr>
            <tr><td>تطبيق خصم مباشر</td><td>حتى ١٠٠٪</td><td>حتى ٢٠٪</td><td>حتى ١٠٪</td></tr>
            <tr><td>إلغاء سيارة بالانتظار</td><td>✓ نعم</td><td>✓ نعم</td><td>— يتطلب مدير</td></tr>
            <tr><td>استرجاع المبلغ (Refund)</td><td>✓ نعم</td><td>✓ نعم</td><td>— غير مسموح</td></tr>
            <tr><td>تعديل الخدمات والأسعار</td><td>✓ نعم</td><td>— بإذن المالك فقط</td><td>— غير مسموح</td></tr>
            <tr><td>إغلاق ومراجعة الوردية</td><td>✓ نعم</td><td>✓ نعم</td><td>— اعتماد مدير</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  paintIcons(root);
}
