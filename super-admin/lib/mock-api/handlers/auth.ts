import "server-only";

import type { AdminUser } from "@/types/auth";
import { logAudit, nid } from "@/lib/mock-api/db";
import { MockApiError, ok } from "@/lib/mock-api/http";
import { route } from "@/lib/mock-api/router";
import type { StoredAdmin } from "@/lib/mock-api/schema";

export function toPublicAdmin(admin: StoredAdmin): AdminUser {
  const { password: _password, ...rest } = admin;
  void _password;
  return rest;
}

export const authRoutes = [
  route(
    "POST",
    "/admin/auth/login",
    ({ db, body }) => {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      if (!email || !password) {
        throw new MockApiError("البريد الإلكتروني وكلمة المرور مطلوبان", 422);
      }

      const admin = db.admins.find((a) => a.email.toLowerCase() === email);
      if (!admin || admin.password !== password) {
        throw new MockApiError("البريد الإلكتروني أو كلمة المرور غير صحيحة", 401);
      }
      if (admin.status !== "active") {
        throw new MockApiError("هذا الحساب موقوف. تواصل مع مدير النظام.", 403);
      }
      if (admin.role !== "super") {
        throw new MockApiError(
          "هذه اللوحة مخصصة لحسابات Super Admin فقط. استخدم لوحة الإدارة العامة لدورك.",
          403,
        );
      }

      const token = `sa_${nid("tok")}_${Math.random().toString(36).slice(2, 10)}`;
      db.sessions[token] = admin.id;
      admin.lastLoginAt = new Date().toISOString();
      logAudit(db, {
        actorId: admin.id,
        action: "admin.login",
        entity: "admins",
        entityId: admin.id,
      });

      return ok(
        { access_token: token, token_type: "Bearer", admin: toPublicAdmin(admin) },
        "تم تسجيل الدخول بنجاح",
      );
    },
    true,
  ),

  route("GET", "/admin/auth/me", ({ admin }) => ok(toPublicAdmin(admin))),

  route("POST", "/admin/auth/logout", ({ db, token }) => {
    if (token) delete db.sessions[token];
    return ok(null, "تم تسجيل الخروج");
  }),
];
