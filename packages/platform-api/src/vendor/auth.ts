import "server-only";

import { logAudit, nid } from "../db";
import { MockApiError, ok } from "../http";
import { vroute } from "../router";
import { normalizePhone } from "./engine";
import { resolveVendorActor, toVendorAccount } from "./scope";

export const vendorAuthRoutes = [
  vroute(
    "POST",
    "/vendor/auth/login",
    ({ db, body }) => {
      const phone = normalizePhone(String(body.phone ?? ""));
      const password = String(body.password ?? "");
      if (phone.length !== 10 || !password) {
        throw new MockApiError("رقم الموبايل وكلمة المرور مطلوبان", 422);
      }
      const staff = db.staff.find((s) => normalizePhone(s.phone) === phone);
      if (!staff || db.staffPasswords[staff.id] !== password) {
        throw new MockApiError("رقم الموبايل أو كلمة المرور غير صحيحة", 401);
      }
      if (staff.status !== "active") throw new MockApiError("هذا الحساب موقوف. تواصل مع مالك المغسلة.", 403);
      if (staff.role === "employee") {
        throw new MockApiError("بوابة الشركاء مخصصة للمالك ومديري الفروع. الموظفون يستخدمون تطبيق الموظف.", 403);
      }
      const business = db.businesses.find((b) => b.id === staff.businessId);
      if (!business || business.status === "rejected") {
        throw new MockApiError("لا توجد مغسلة معتمدة مرتبطة بهذا الحساب", 403);
      }

      const token = `vp_${nid("tok")}_${Math.random().toString(36).slice(2, 10)}`;
      db.vendorSessions[token] = staff.id;
      const actor = resolveVendorActor(db, token)!;
      logAudit(db, { actorType: "staff", actorId: staff.id, action: "vendor.login", entity: "staff", entityId: staff.id, branchId: staff.branchId });
      return ok({ access_token: token, token_type: "Bearer", account: toVendorAccount(db, actor) }, "تم تسجيل الدخول بنجاح");
    },
    true,
  ),

  vroute("GET", "/vendor/auth/me", ({ db, actor }) => ok(toVendorAccount(db, actor))),

  vroute("POST", "/vendor/auth/logout", ({ db, token }) => {
    if (token) delete db.vendorSessions[token];
    return ok(null, "تم تسجيل الخروج");
  }),
];
