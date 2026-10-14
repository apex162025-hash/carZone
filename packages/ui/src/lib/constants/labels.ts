import type { PermissionKey, PermissionLevel } from "@carzen/contracts/admins";
import type { ApplicationStatus } from "@carzen/contracts/applications";
import type { AdminRole } from "@carzen/contracts/auth";
import type { ComplaintCategory, ComplaintStatus } from "@carzen/contracts/complaints";
import type { CustomerStatus } from "@carzen/contracts/customers";
import type { PayoutStatus, TransactionStatus } from "@carzen/contracts/finance";
import type { AdminNotificationType } from "@carzen/contracts/notifications";
import type { OfferStatus } from "@carzen/contracts/offers";
import type { OrderSource, OrderStatus, PaymentMethod, PaymentStatus } from "@carzen/contracts/orders";
import type { HideReviewReason } from "@carzen/contracts/reviews";
import type { BusinessStatus, StaffRole, StaffStatus, SuspendReason } from "@carzen/contracts/washes";
import type { VendorNotificationType } from "@carzen/contracts/vendor/catalog";
import type { CustomerSegment } from "@carzen/contracts/vendor/insights";
import type { OrderAction } from "@carzen/contracts/vendor/operations";
import type { ShiftClosingStatus } from "@carzen/contracts/vendor/team";
import type { AdminStatus } from "@carzen/contracts/auth";

/**
 * A tone is any CSS color expression; badges render it at ~12% for the
 * background, full strength for the dot and text (spec A4 "status badges").
 */
export type Tone = string;

export const TONES = {
  primary: "var(--primary)",
  aqua: "var(--aqua)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--destructive)",
  info: "var(--info)",
  violet: "var(--st-waiting)",
  neutral: "var(--muted-foreground)",
} as const;

export type StatusMeta = { label: string; tone: Tone };

export const ORDER_STATUS: Record<OrderStatus, StatusMeta> = {
  pending: { label: "بانتظار التأكيد", tone: "var(--st-pending)" },
  confirmed: { label: "مؤكد", tone: "var(--st-confirmed)" },
  waiting: { label: "تم الوصول", tone: "var(--st-waiting)" },
  in_service: { label: "جارٍ التنفيذ", tone: "var(--st-in_service)" },
  completed: { label: "مكتمل", tone: "var(--st-completed)" },
  cancelled: { label: "ملغي", tone: "var(--st-cancelled)" },
  no_show: { label: "لم يحضر", tone: "var(--st-no_show)" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, StatusMeta> = {
  pending: { label: "بانتظار الدفع", tone: TONES.warning },
  paid: { label: "مدفوع", tone: TONES.success },
  refunded: { label: "مسترد", tone: TONES.neutral },
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  cash: "نقدي",
  card: "بطاقة",
  online: "أونلاين",
};

export const ORDER_SOURCE: Record<OrderSource, StatusMeta> = {
  app: { label: "التطبيق", tone: TONES.primary },
  walk_in: { label: "حضور مباشر", tone: TONES.aqua },
  phone: { label: "هاتفي", tone: TONES.violet },
};

export const BUSINESS_STATUS: Record<BusinessStatus, StatusMeta> = {
  pending: { label: "قيد المراجعة", tone: TONES.warning },
  approved: { label: "معتمدة – قيد الإعداد", tone: TONES.info },
  active: { label: "نشطة", tone: TONES.success },
  suspended: { label: "معلّقة", tone: TONES.danger },
  rejected: { label: "مرفوضة", tone: TONES.neutral },
};

export const APPLICATION_STATUS: Record<ApplicationStatus, StatusMeta> = {
  pending: { label: "قيد المراجعة", tone: TONES.warning },
  needs_changes: { label: "مطلوب تعديلات", tone: TONES.violet },
  approved: { label: "تمت الموافقة", tone: TONES.success },
  rejected: { label: "مرفوض", tone: TONES.danger },
};

export const CUSTOMER_STATUS: Record<CustomerStatus, StatusMeta> = {
  active: { label: "نشط", tone: TONES.success },
  suspended: { label: "موقوف", tone: TONES.danger },
};

export const COMPLAINT_STATUS: Record<ComplaintStatus, StatusMeta> = {
  open: { label: "مفتوحة", tone: TONES.danger },
  in_review: { label: "قيد المراجعة", tone: TONES.primary },
  waiting: { label: "بانتظار رد", tone: TONES.warning },
  resolved: { label: "تم الحل", tone: TONES.success },
  closed: { label: "مغلقة", tone: TONES.neutral },
};

export const COMPLAINT_CATEGORY: Record<ComplaintCategory, string> = {
  quality: "جودة الخدمة",
  pricing: "التسعير",
  behavior: "سلوك العاملين",
  booking: "الحجز والمواعيد",
  refund: "الاسترداد",
  other: "أخرى",
};

export const TRANSACTION_STATUS: Record<TransactionStatus, StatusMeta> = {
  pending: { label: "معلقة", tone: TONES.warning },
  paid: { label: "مدفوعة", tone: TONES.success },
  refunded: { label: "مستردة", tone: TONES.neutral },
  settled: { label: "تمت التسوية", tone: TONES.primary },
};

export const PAYOUT_STATUS: Record<PayoutStatus, StatusMeta> = {
  due: { label: "مستحقة", tone: TONES.warning },
  paid: { label: "مدفوعة", tone: TONES.success },
};

export const OFFER_STATUS: Record<OfferStatus, StatusMeta> = {
  draft: { label: "مسودة", tone: TONES.neutral },
  scheduled: { label: "مجدول", tone: TONES.info },
  active: { label: "نشط", tone: TONES.success },
  expired: { label: "منتهي", tone: TONES.neutral },
  disabled: { label: "موقوف", tone: TONES.danger },
};

export const ADMIN_ROLE: Record<AdminRole, StatusMeta & { description: string }> = {
  super: { label: "Super Admin", tone: TONES.primary, description: "وصول كامل لكل الوحدات والإعدادات" },
  operations: { label: "العمليات", tone: TONES.aqua, description: "المغاسل، الطلبات، الفروع والشكاوى" },
  finance: { label: "المالية", tone: TONES.success, description: "المعاملات، العمولات والمدفوعات" },
  support: { label: "الدعم", tone: TONES.violet, description: "العملاء، الشكاوى والتقييمات" },
};

export const STAFF_ROLE: Record<StaffRole, StatusMeta> = {
  owner: { label: "مالك", tone: TONES.primary },
  manager: { label: "مدير فرع", tone: TONES.violet },
  employee: { label: "موظف", tone: TONES.neutral },
};

export const SUSPEND_REASON: Record<SuspendReason, string> = {
  repeated_complaints: "شكاوى متكررة",
  incorrect_information: "بيانات غير صحيحة",
  operational_issue: "مشكلة تشغيلية",
  policy_violation: "مخالفة السياسات",
  owner_request: "بطلب من المالك",
};

export const HIDE_REVIEW_REASON: Record<HideReviewReason, string> = {
  abusive_language: "ألفاظ مسيئة",
  spam: "محتوى دعائي (سبام)",
  off_topic: "خارج الموضوع",
  personal_data: "بيانات شخصية",
};

export const NOTIFICATION_TYPE: Record<AdminNotificationType, StatusMeta> = {
  application: { label: "طلب انضمام", tone: TONES.warning },
  complaint: { label: "شكوى", tone: TONES.danger },
  critical_review: { label: "تقييم حرج", tone: TONES.danger },
  payment_issue: { label: "مشكلة دفع", tone: TONES.warning },
  unusual_activity: { label: "نشاط غير معتاد", tone: TONES.violet },
  system: { label: "النظام", tone: TONES.neutral },
  finance_flag: { label: "مراجعة مالية", tone: TONES.info },
};

export const AREAS: Record<string, string> = {
  nasr: "مدينة نصر",
  helio: "مصر الجديدة",
  nc: "التجمع",
  maadi: "المعادي",
  zamalek: "الزمالك",
  moh: "المهندسين",
  zayed: "الشيخ زايد",
  oct: "٦ أكتوبر",
};

export const SERVICE_CATEGORY: Record<string, string> = {
  exterior: "غسيل خارجي",
  interior: "غسيل داخلي",
  full: "داخلي وخارجي",
  deep: "تنظيف عميق",
};

export const AMENITY: Record<string, string> = {
  waiting: "منطقة انتظار",
  ac: "تكييف",
  wifi: "واي فاي",
  card: "دفع بالبطاقة",
  coffee: "قهوة",
  covered: "منطقة مغطاة",
};

export const VEHICLE_COLOR: Record<string, { label: string; hex: string }> = {
  white: { label: "أبيض", hex: "#F4F7FB" },
  black: { label: "أسود", hex: "#1C1C1E" },
  silver: { label: "فضي", hex: "#C5CDD6" },
  gray: { label: "رمادي", hex: "#6B7280" },
  blue: { label: "أزرق", hex: "#2563EB" },
  red: { label: "أحمر", hex: "#DC2626" },
  green: { label: "أخضر", hex: "#15803D" },
  beige: { label: "بيج", hex: "#D6C4A8" },
};

export const WEEK_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export const PERMISSION_MODULES: { key: PermissionKey; label: string; group: string }[] = [
  { key: "dashboard", label: "لوحة المؤشرات", group: "عام" },
  { key: "notifications", label: "الإشعارات", group: "عام" },
  { key: "customers", label: "العملاء", group: "المستخدمون" },
  { key: "staff", label: "الملاك والموظفون", group: "المستخدمون" },
  { key: "washes", label: "المغاسل", group: "المغاسل" },
  { key: "applications", label: "طلبات الانضمام", group: "المغاسل" },
  { key: "branches", label: "الفروع", group: "المغاسل" },
  { key: "orders", label: "الحجوزات والطلبات", group: "العمليات" },
  { key: "reviews", label: "التقييمات", group: "العمليات" },
  { key: "complaints", label: "الشكاوى", group: "العمليات" },
  { key: "offers", label: "العروض", group: "التسويق" },
  { key: "finance", label: "المالية", group: "المالية" },
  { key: "reports", label: "التقارير", group: "المالية" },
  { key: "admins", label: "المسؤولون", group: "النظام" },
  { key: "roles", label: "الأدوار والصلاحيات", group: "النظام" },
  { key: "settings", label: "إعدادات المنصة", group: "النظام" },
  { key: "audit", label: "سجل التدقيق", group: "النظام" },
];

export const PERMISSION_LEVEL: Record<PermissionLevel, StatusMeta> = {
  none: { label: "بدون", tone: TONES.neutral },
  view: { label: "عرض", tone: TONES.info },
  manage: { label: "إدارة", tone: TONES.primary },
};

/** Human labels for audit actions (falls back to the raw key). */
export const AUDIT_ACTION: Record<string, string> = {
  "admin.login": "تسجيل دخول",
  "system.reset": "إعادة ضبط البيانات",
  "order.created": "إنشاء حجز",
  suspend_wash: "تعليق مغسلة",
  reactivate_wash: "إعادة تفعيل مغسلة",
  edit_business_data: "تعديل بيانات مغسلة",
  activate_branch: "تفعيل فرع",
  deactivate_branch: "إيقاف فرع",
  suspend_staff: "إيقاف حساب موظف",
  reactivate_staff: "تفعيل حساب موظف",
  approve_application: "الموافقة على طلب",
  reject_application: "رفض طلب",
  request_changes_application: "طلب تعديلات",
  cancel_order: "إلغاء حجز",
  flag_order_finance: "تحويل للمراجعة المالية",
  suspend_customer: "إيقاف عميل",
  reactivate_customer: "تفعيل عميل",
  assign_complaint: "تعيين شكوى",
  add_complaint_note: "ملاحظة على شكوى",
  update_complaint_status: "تحديث حالة شكوى",
  hide_review: "إخفاء تقييم",
  restore_review: "استعادة تقييم",
  create_offer: "إنشاء عرض",
  update_offer: "تعديل عرض",
  enable_offer: "تفعيل عرض",
  disable_offer: "إيقاف عرض",
  resolve_discrepancy: "مراجعة فرق مالي",
  update_default_commission: "تعديل العمولة الافتراضية",
  update_commission_override: "تعديل عمولة مغسلة",
  update_commission_settings: "تعديل العمولة",
  mark_payout_paid: "تسجيل دفعة",
  create_admin_user: "إضافة مسؤول",
  change_admin_role: "تغيير دور مسؤول",
  deactivate_admin: "إيقاف مسؤول",
  activate_admin: "تفعيل مسؤول",
  update_roles_matrix: "تعديل الصلاحيات",
  update_settings: "تعديل الإعدادات",
  // Wash (vendor portal) actions
  "vendor.login": "دخول بوابة الشركاء",
  "order.create": "إنشاء طلب",
  "order.confirm": "تأكيد حجز",
  "order.check_in": "تسجيل وصول",
  "order.start": "بدء الخدمة",
  "order.complete": "إكمال الخدمة",
  "order.payment": "تحصيل دفعة",
  "order.cancel": "إلغاء طلب",
  "order.no_show": "عدم حضور",
  "order.assign": "تعيين موظف",
  "order.add_service": "إضافة خدمة",
  "order.discount": "تطبيق خصم",
  "order.note": "ملاحظة على طلب",
  "order.refund": "استرداد مبلغ",
  "service.create": "إضافة خدمة للقائمة",
  "service.update": "تعديل خدمة",
  "service.price_change": "تغيير سعر خدمة",
  "offer.create": "إنشاء عرض",
  "offer.update": "تعديل عرض",
  "offer.enable": "تفعيل عرض",
  "offer.disable": "إيقاف عرض",
  "branch.update": "تعديل بيانات فرع",
  "branch.rules": "تعديل قواعد الحجز",
  "slot.block": "حجب فترة",
  "slot.unblock": "إلغاء حجب فترة",
  "staff.create": "إضافة موظف",
  "staff.update": "تعديل موظف",
  "staff.status": "تغيير حالة موظف",
  "staff.schedule": "تعديل جدول الورديات",
  "shift.review": "مراجعة وردية",
  "shift.flag": "تمييز وردية للمتابعة",
  "day.close": "إغلاق اليوم",
  "review.reply": "الرد على تقييم",
  "review.report": "إبلاغ عن تقييم",
  "settings.update": "تعديل إعدادات المغسلة",
};

export const AUDIT_ENTITY: Record<string, string> = {
  businesses: "مغسلة",
  branches: "فرع",
  staff: "موظف",
  applications: "طلب انضمام",
  orders: "حجز",
  customers: "عميل",
  complaints: "شكوى",
  reviews: "تقييم",
  offers: "عرض",
  transactions: "معاملة",
  payouts: "دفعة",
  settings: "إعدادات",
  admins: "مسؤول",
  roles: "صلاحيات",
  system: "النظام",
  services: "خدمة",
  shifts: "وردية",
};

/** Deep link for an audit row's entity. */
export function auditEntityHref(entity: string, entityId: string): string | null {
  switch (entity) {
    case "businesses":
      return `/washes/${entityId}`;
    case "applications":
      return entityId.startsWith("app_") ? `/applications/${entityId}` : null;
    case "orders":
      return `/orders/${entityId}`;
    case "customers":
      return `/customers/${entityId}`;
    case "complaints":
      return `/complaints/${entityId}`;
    case "reviews":
      return "/reviews";
    case "transactions":
      return "/finance/transactions";
    case "payouts":
      return "/finance/payouts";
    case "admins":
      return "/admins";
    case "roles":
      return "/roles";
    case "settings":
      return entityId === "commission" ? "/finance/commission" : "/settings";
    case "branches":
      return "/branches";
    default:
      return null;
  }
}

// ── Shared status maps (used by super-admin and vendor-portal) ──

export const STAFF_STATUS: Record<StaffStatus, StatusMeta> = {
  active: { label: "نشط", tone: TONES.success },
  suspended: { label: "موقوف", tone: TONES.danger },
};

export const ADMIN_STATUS: Record<AdminStatus, StatusMeta> = {
  active: { label: "نشط", tone: TONES.success },
  inactive: { label: "موقوف", tone: TONES.neutral },
};

export const BRANCH_STATUS: Record<"active" | "inactive", StatusMeta> = {
  active: { label: "نشط", tone: TONES.success },
  inactive: { label: "متوقف", tone: TONES.neutral },
};

export const SHIFT_STATUS: Record<ShiftClosingStatus, StatusMeta> = {
  open: { label: "جارية", tone: TONES.info },
  submitted: { label: "بانتظار المراجعة", tone: TONES.warning },
  reviewed: { label: "تمت المراجعة", tone: TONES.success },
  flagged: { label: "للمتابعة", tone: TONES.danger },
};

export const CUSTOMER_SEGMENT: Record<CustomerSegment, StatusMeta & { description: string }> = {
  new: { label: "جديد", tone: TONES.info, description: "زيارة واحدة أو أول زيارة خلال 30 يوم" },
  returning: { label: "متكرر", tone: TONES.success, description: "زيارتين أو أكثر" },
  lost: { label: "منقطع", tone: TONES.danger, description: "لا زيارات منذ أكثر من 60 يوم" },
};

export const VENDOR_NOTIFICATION_TYPE: Record<VendorNotificationType, StatusMeta> = {
  new_booking: { label: "حجز جديد", tone: TONES.primary },
  booking_cancelled: { label: "إلغاء حجز", tone: TONES.danger },
  cash_difference: { label: "فرق نقدية", tone: TONES.danger },
  high_cancellation: { label: "إلغاءات مرتفعة", tone: TONES.warning },
  branch_issue: { label: "تنبيه فرع", tone: TONES.warning },
  daily_summary: { label: "ملخص يومي", tone: TONES.neutral },
  review: { label: "تقييمات", tone: TONES.violet },
  platform: { label: "من كارزن", tone: TONES.info },
  payout: { label: "مستحقات", tone: TONES.success },
};

/** Primary + secondary order actions as worded for wash staff (spec EM-06). */
export const ORDER_ACTION: Record<OrderAction, { label: string; tone: Tone }> = {
  confirm: { label: "تأكيد الحجز", tone: "var(--st-confirmed)" },
  check_in: { label: "تسجيل الوصول", tone: "var(--st-waiting)" },
  start: { label: "بدء الخدمة", tone: "var(--st-in_service)" },
  complete: { label: "إكمال الخدمة", tone: "var(--st-completed)" },
  collect_payment: { label: "تحصيل الدفع", tone: TONES.success },
  cancel: { label: "إلغاء الطلب", tone: TONES.danger },
  no_show: { label: "لم يحضر", tone: TONES.neutral },
  assign: { label: "تعيين موظف", tone: TONES.primary },
  add_service: { label: "إضافة خدمة", tone: TONES.aqua },
  discount: { label: "خصم", tone: TONES.warning },
  note: { label: "ملاحظة", tone: TONES.neutral },
  refund: { label: "استرداد", tone: TONES.danger },
};
