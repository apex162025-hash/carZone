import { getData, send } from "@/lib/api/request";
import type { VendorAccount, VendorLoginPayload, VendorLoginResponse } from "@carzen/contracts/vendor/auth";

export function login(payload: VendorLoginPayload) {
  return send<VendorLoginResponse>("post", "/vendor/auth/login", payload, "تعذر تسجيل الدخول");
}

export function fetchMe() {
  return getData<VendorAccount>("/vendor/auth/me", undefined, "تعذر تحميل بيانات الحساب");
}

export function logout() {
  return send<null>("post", "/vendor/auth/logout");
}
