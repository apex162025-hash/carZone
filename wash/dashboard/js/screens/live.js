import { get, mutate, now } from "../../../../shared/js/db.js";
import { t, L } from "../../../../shared/js/i18n.js";
import { money, formatTime, minutesLabel } from "../../../../shared/js/format.js";
import { paintIcons } from "../../../../shared/js/dom.js";
import { toast } from "../../../../shared/js/ui.js";
import {
  startService,
  completeService,
  collectPayment,
  checkInOrder,
} from "../../../../shared/js/services/wash.js";
import { currentStaff, selectedBranchId } from "../state.js";

export function liveOperationsScreen(root) {
  const db = get();
  const staff = currentStaff();
  const branchId = selectedBranchId() === "all" ? "br_nasr" : selectedBranchId();
  const branch = db.branches.find((b) => b.id === branchId) || db.branches[0];

  const orders = db.orders.filter((o) => o.branchId === branch.id);

  // Group orders into the 5 Kanban columns
  const upcoming = orders.filter((o) => o.status === "confirmed");
  const waiting = orders.filter((o) => o.status === "waiting");
  const inService = orders.filter((o) => o.status === "in_service");
  const paymentPending = orders.filter((o) => o.status === "completed" && o.paymentStatus === "pending");
  const doneToday = orders.filter((o) => o.status === "completed" && o.paymentStatus === "paid").slice(0, 15);

  const busyBays = inService.length;
  const capacity = branch.capacity || 6;
  const utilPct = Math.round((busyBays / capacity) * 100);

  root.innerHTML = `
    <!-- Top Header & Bay Utilization Indicator -->
    <div class="between" style="margin-block-end:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:var(--fs-28);font-weight:800">${t("dash.nav.live")}</h1>
        <p class="small muted">لوحة تحكم المسارات المباشرة · ${branch.name.ar}</p>
      </div>

      <!-- Bay Utilization Bar (MG-02) -->
      <div class="card pad" style="min-width:280px;background:var(--c-surface)">
        <div class="between" style="margin-block-end:6px">
          <span class="small strong">${t("dash.bays_util", { busy: busyBays, cap: capacity })}</span>
          <b class="num" style="color:var(--c-primary-600)">${utilPct}%</b>
        </div>
        <div style="height:8px;border-radius:var(--r-pill);background:var(--c-line);overflow:hidden">
          <div style="height:100%;width:${Math.min(100, utilPct)}%;background:${utilPct >= 100 ? "var(--c-danger)" : "var(--c-primary-600)"}"></div>
        </div>
      </div>
    </div>

    <!-- 5-Column Kanban Board -->
    <div class="kanban-board">
      <!-- 1. Upcoming -->
      <div class="kanban-col">
        <div class="kanban-col-head">
          <b>${t("dash.live.upcoming")}</b>
          <span class="badge" data-status="confirmed">${upcoming.length}</span>
        </div>
        <div class="kanban-cards-stack">
          ${upcoming.map((o) => renderKanbanCard(o, "upcoming")).join("")}
        </div>
      </div>

      <!-- 2. Waiting -->
      <div class="kanban-col">
        <div class="kanban-col-head">
          <b>${t("dash.live.waiting")}</b>
          <span class="badge" data-status="waiting">${waiting.length}</span>
        </div>
        <div class="kanban-cards-stack">
          ${waiting.map((o) => renderKanbanCard(o, "waiting")).join("")}
        </div>
      </div>

      <!-- 3. In Service -->
      <div class="kanban-col">
        <div class="kanban-col-head">
          <b>${t("dash.live.in_service")}</b>
          <span class="badge" data-status="in_service">${inService.length}</span>
        </div>
        <div class="kanban-cards-stack">
          ${inService.map((o) => renderKanbanCard(o, "in_service")).join("")}
        </div>
      </div>

      <!-- 4. Payment Pending -->
      <div class="kanban-col">
        <div class="kanban-col-head">
          <b style="color:var(--c-warning)">${t("dash.live.payment")}</b>
          <span class="badge" data-status="pending">${paymentPending.length}</span>
        </div>
        <div class="kanban-cards-stack">
          ${paymentPending.map((o) => renderKanbanCard(o, "payment")).join("")}
        </div>
      </div>

      <!-- 5. Done Today -->
      <div class="kanban-col">
        <div class="kanban-col-head">
          <b>${t("dash.live.completed")}</b>
          <span class="badge" data-status="completed">${doneToday.length}</span>
        </div>
        <div class="kanban-cards-stack">
          ${doneToday.map((o) => renderKanbanCard(o, "done")).join("")}
        </div>
      </div>
    </div>
  `;

  paintIcons(root);

  // Kanban advance buttons
  root.querySelectorAll("[data-advance-action]").forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const action = btn.dataset.advanceAction;
      const id = btn.dataset.orderId;

      try {
        if (action === "checkin") {
          await checkInOrder({ orderId: id, staffId: staff.id, branchId: branch.id });
          toast("تم تسجيل وصول السيارة ✓");
        } else if (action === "start") {
          await startService(id, staff.id);
          toast("بدأ تنفيذ الخدمة بالمسار 🚿");
        } else if (action === "complete") {
          await completeService(id, staff.id);
          toast("اكتملت الخدمة ونقلت لقائمة الدفع ✓");
        } else if (action === "pay") {
          await collectPayment({ orderId: id, method: "cash", staffId: staff.id });
          toast("تم تحصيل المبلغ وإغلاق الطلب 💰");
        }
        liveOperationsScreen(root);
      } catch (err) {
        toast(err.message || "حدث خطأ");
      }
    };
  });

  // Click card to open drawer
  root.querySelectorAll(".kanban-card").forEach((card) => {
    card.onclick = () => {
      const id = card.dataset.orderId;
      location.hash = `#/orders?id=${id}`;
    };
  });
}

function renderKanbanCard(o, column) {
  const staffName = o.assignedStaffId === "st_samir" ? "أحمد سمير" : o.assignedStaffId === "st_youssef" ? "يوسف نبيل" : "فريق المغسلة";

  // Check if service is overdue (e.g. in_service longer than durationMin)
  let isOverdue = false;
  if (o.status === "in_service" && o.startedAt) {
    const elapsed = (now().getTime() - new Date(o.startedAt).getTime()) / 60000;
    if (elapsed > o.durationMin) isOverdue = true;
  }

  return `
    <div class="kanban-card ${isOverdue ? "overdue" : ""}" data-order-id="${o.id}">
      <div class="between" style="margin-block-end:6px">
        <b class="chip on" style="letter-spacing:1px">${o.plate}</b>
        <span class="num small muted">${o.number}</span>
      </div>

      <div class="small strong">${L(o.items[0]?.name)}</div>
      <div class="small muted" style="margin-block:2px">الموظف: ${staffName}</div>

      <div class="between" style="margin-block-start:8px">
        <b class="num" style="color:var(--c-primary-600)">${money(o.total)}</b>
        <span class="small muted num">${formatTime(o.scheduledAt)}</span>
      </div>

      ${isOverdue ? `
        <div class="small" style="color:var(--c-danger);font-weight:700;margin-block-start:4px">
          ⚠️ تجاوزت الوقت المتوقع!
        </div>
      ` : ""}

      <!-- Advance Action Button -->
      <div style="margin-block-start:10px;padding-block-start:8px;border-block-start:1px dashed var(--c-line)">
        ${column === "upcoming" ? `
          <button class="btn sm block" data-advance-action="checkin" data-order-id="${o.id}">تسجيل الوصول</button>
        ` : column === "waiting" ? `
          <button class="btn sm block" data-advance-action="start" data-order-id="${o.id}" style="background:var(--st-in_service);color:#fff">بدء الخدمة</button>
        ` : column === "in_service" ? `
          <button class="btn sm block" data-advance-action="complete" data-order-id="${o.id}">إنهاء الخدمة</button>
        ` : column === "payment" ? `
          <button class="btn sm block" data-advance-action="pay" data-order-id="${o.id}" style="background:var(--c-success);color:#fff">تحصيل (كاش)</button>
        ` : `
          <span class="small muted">اكتمل وسدد بالكامل ✓</span>
        `}
      </div>
    </div>
  `;
}
