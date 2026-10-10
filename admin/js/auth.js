import { get } from "../../shared/js/db.js";
import { can } from "../../shared/js/services/permissions.js";

const ADMIN_ID_KEY = "carzen_admin_id";
const LAST_ACTIVITY_KEY = "carzen_admin_last_activity";
const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

let timeoutTimer = null;
let warningModalOpen = false;

export function getCurrentAdminId() {
  return localStorage.getItem(ADMIN_ID_KEY) || "au_sara";
}

export function getCurrentAdmin() {
  const db = get();
  const id = getCurrentAdminId();
  return db.adminUsers?.find((u) => u.id === id) || {
    id: "au_sara",
    name: "Sara Nabil",
    email: "sara@carzen.demo",
    role: "super",
    status: "active",
  };
}

export function setCurrentAdmin(adminId) {
  localStorage.setItem(ADMIN_ID_KEY, adminId);
  touchActivity();
  window.dispatchEvent(new CustomEvent("carzen-admin-session", { detail: { adminId } }));
}

export function touchActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function login(email, password) {
  const db = get();
  const user = db.adminUsers?.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) throw new Error("Invalid email or password");
  if (user.password && user.password !== password) throw new Error("Invalid email or password");
  if (user.status === "suspended") throw new Error("This admin account is suspended. Contact a Super Admin.");

  setCurrentAdmin(user.id);
  return user;
}

export function logout() {
  localStorage.removeItem(ADMIN_ID_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  location.hash = "#/login";
  window.dispatchEvent(new CustomEvent("carzen-admin-session", { detail: { adminId: null } }));
}

export function checkPermission(action) {
  const admin = getCurrentAdmin();
  return can({ type: "admin", role: admin.role }, action);
}

export function initActivityWatcher(onTimeout) {
  const update = () => {
    if (!warningModalOpen) touchActivity();
  };

  ["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach((evt) => {
    window.addEventListener(evt, update, { passive: true });
  });

  if (timeoutTimer) clearInterval(timeoutTimer);
  timeoutTimer = setInterval(() => {
    const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
    if (Date.now() - last > TIMEOUT_MS && !warningModalOpen) {
      triggerTimeoutModal(onTimeout);
    }
  }, 10000);

  // Listen for demo bar test trigger
  window.addEventListener("carzen-admin-timeout", () => {
    triggerTimeoutModal(onTimeout);
  });
}

function triggerTimeoutModal(onTimeout) {
  if (warningModalOpen) return;
  warningModalOpen = true;
  if (typeof onTimeout === "function") {
    onTimeout(() => {
      warningModalOpen = false;
      touchActivity();
    });
  }
}
