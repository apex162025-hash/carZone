import "server-only";

import type { PermissionKey, PermissionLevel, RolesMatrix } from "@/types/admins";
import type { AdminRole } from "@/types/auth";
import { logAudit, nid } from "@/lib/mock-api/db";
import { MockApiError, ok, requireText } from "@/lib/mock-api/http";
import { findOrThrow } from "@/lib/mock-api/lookups";
import { route } from "@/lib/mock-api/router";
import { toPublicAdmin } from "@/lib/mock-api/handlers/auth";
import type { MockDatabase } from "@/lib/mock-api/schema";

const ROLES: AdminRole[] = ["super", "operations", "finance", "support"];
const LEVELS: PermissionLevel[] = ["none", "view", "manage"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function activeSupers(db: MockDatabase) {
  return db.admins.filter((a) => a.role === "super" && a.status === "active");
}

export const adminRoutes = [
  route("GET", "/admin/admins", ({ db }) => {
    const list = db.admins.map(toPublicAdmin).sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));
    return ok(list);
  }),

  route("POST", "/admin/admins", ({ db, body, admin }) => {
    const name = requireText(body.name, "name", "الاسم", 3);
    const email = requireText(body.email, "email", "البريد الإلكتروني", 5).toLowerCase();
    if (!EMAIL_RE.test(email)) throw new MockApiError("صيغة البريد الإلكتروني غير صحيحة", 422, { email: ["صيغة البريد غير صحيحة"] });
    if (db.admins.some((a) => a.email.toLowerCase() === email)) {
      throw new MockApiError("هذا البريد مستخدم بالفعل", 409, { email: ["هذا البريد مستخدم بالفعل"] });
    }
    const role = String(body.role) as AdminRole;
    if (!ROLES.includes(role)) throw new MockApiError("اختر دورًا صالحًا", 422);
    const record = {
      id: nid("au"),
      name,
      email,
      role,
      status: "active" as const,
      password: "demo1234",
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
    };
    db.admins.push(record);
    logAudit(db, { actorId: admin.id, action: "create_admin_user", entity: "admins", entityId: record.id, newValue: { email, role } });
    return ok(toPublicAdmin(record), `تمت دعوة ${name} — كلمة المرور المؤقتة demo1234`);
  }),

  route("PATCH", "/admin/admins/:id", ({ db, params, body, admin }) => {
    const target = findOrThrow(db.admins, params.id, "المسؤول");
    if (body.role !== undefined) {
      const role = String(body.role) as AdminRole;
      if (!ROLES.includes(role)) throw new MockApiError("اختر دورًا صالحًا", 422);
      if (target.id === admin.id && role !== "super") throw new MockApiError("لا يمكنك تغيير دورك بنفسك", 409);
      if (target.role === "super" && role !== "super" && activeSupers(db).length <= 1) {
        throw new MockApiError("لا يمكن إزالة آخر Super Admin", 409);
      }
      logAudit(db, { actorId: admin.id, action: "change_admin_role", entity: "admins", entityId: target.id, oldValue: target.role, newValue: role });
      target.role = role;
    }
    if (typeof body.name === "string" && body.name.trim()) target.name = body.name.trim();
    return ok(toPublicAdmin(target), "تم تحديث المسؤول");
  }),

  route("POST", "/admin/admins/:id/status", ({ db, params, body, admin }) => {
    const target = findOrThrow(db.admins, params.id, "المسؤول");
    const status = body.status === "inactive" ? "inactive" : "active";
    const reason = requireText(body.reason, "reason", "السبب");
    if (target.id === admin.id) throw new MockApiError("لا يمكنك إيقاف حسابك", 409);
    if (status === "inactive" && target.role === "super" && activeSupers(db).length <= 1) {
      throw new MockApiError("لا يمكن إيقاف آخر Super Admin", 409);
    }
    const old = target.status;
    target.status = status;
    if (status === "inactive") {
      for (const [tok, id] of Object.entries(db.sessions)) if (id === target.id) delete db.sessions[tok];
    }
    logAudit(db, { actorId: admin.id, action: status === "inactive" ? "deactivate_admin" : "activate_admin", entity: "admins", entityId: target.id, oldValue: old, newValue: status, reason });
    return ok(toPublicAdmin(target), status === "inactive" ? "تم إيقاف الحساب وإنهاء جلساته" : "تم تفعيل الحساب");
  }),

  route("GET", "/admin/roles", ({ db }) => ok(db.roles)),

  route("PUT", "/admin/roles", ({ db, body, admin }) => {
    const reason = requireText(body.reason, "reason", "سبب التعديل", 5);
    const matrix = body.matrix as RolesMatrix | undefined;
    if (!matrix) throw new MockApiError("المصفوفة مطلوبة", 422);
    const changes: string[] = [];
    for (const role of ROLES) {
      if (role === "super") continue; // Super admin always keeps full access.
      for (const key of Object.keys(db.roles[role]) as PermissionKey[]) {
        const next = matrix[role]?.[key];
        if (!next || !LEVELS.includes(next)) continue;
        if (db.roles[role][key] !== next) {
          changes.push(`${role}.${key}: ${db.roles[role][key]} → ${next}`);
          db.roles[role][key] = next;
        }
      }
    }
    if (!changes.length) throw new MockApiError("لا توجد تغييرات للحفظ", 422);
    logAudit(db, { actorId: admin.id, action: "update_roles_matrix", entity: "roles", entityId: "matrix", newValue: changes.join(" · "), reason });
    return ok(db.roles, `تم حفظ ${changes.length} تعديل — يسري فورًا على المستخدمين`);
  }),
];
