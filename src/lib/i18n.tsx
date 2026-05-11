import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Lang = "ar" | "en";

const dict = {
  // Common
  appName: { ar: "فيورا", en: "Viora" },
  tagline: {
    ar: "رعاية صحية حديثة وأنيقة",
    en: "Modern Healthcare, Beautifully Simple",
  },
  login: { ar: "تسجيل الدخول", en: "Login" },
  signup: { ar: "إنشاء حساب", en: "Sign up" },
  logout: { ar: "تسجيل الخروج", en: "Logout" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  password: { ar: "كلمة المرور", en: "Password" },
  fullName: { ar: "الاسم الكامل", en: "Full name" },
  phone: { ar: "رقم الهاتف", en: "Phone" },
  submit: { ar: "إرسال", en: "Submit" },
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  confirm: { ar: "تأكيد", en: "Confirm" },
  add: { ar: "إضافة", en: "Add" },
  edit: { ar: "تعديل", en: "Edit" },
  delete: { ar: "حذف", en: "Delete" },
  search: { ar: "بحث", en: "Search" },
  loading: { ar: "جارٍ التحميل…", en: "Loading…" },
  none: { ar: "لا يوجد", en: "None" },
  back: { ar: "رجوع", en: "Back" },
  language: { ar: "اللغة", en: "Language" },

  // Nav
  home: { ar: "الرئيسية", en: "Home" },
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  patientPortal: { ar: "بوابة المريض", en: "Patient Portal" },
  doctorDashboard: { ar: "لوحة الطبيب", en: "Doctor" },
  receptionDashboard: { ar: "الاستقبال", en: "Reception" },
  adminDashboard: { ar: "الإدارة", en: "Admin" },

  // Patient
  bookAppointment: { ar: "احجز موعد", en: "Book appointment" },
  myAppointments: { ar: "مواعيدي", en: "My appointments" },
  myHistory: { ar: "السجل الطبي", en: "Medical history" },
  doctors: { ar: "الأطباء", en: "Doctors" },
  specialization: { ar: "التخصص", en: "Specialization" },
  fee: { ar: "سعر الكشفية", en: "Consultation fee" },
  selectDate: { ar: "اختر التاريخ", en: "Select date" },
  selectTime: { ar: "اختر الوقت", en: "Select time" },
  noSlots: { ar: "لا توجد أوقات متاحة", en: "No available slots" },
  bookNow: { ar: "احجز الآن", en: "Book now" },
  bookingSuccess: { ar: "تم الحجز بنجاح", en: "Booking confirmed" },

  // Status
  status: { ar: "الحالة", en: "Status" },
  Scheduled: { ar: "محجوز", en: "Scheduled" },
  Waiting: { ar: "في الانتظار", en: "Waiting" },
  InConsultation: { ar: "داخل الكشف", en: "In consultation" },
  PendingPayment: { ar: "بانتظار الدفع", en: "Pending payment" },
  Completed: { ar: "مكتمل", en: "Completed" },
  Cancelled: { ar: "ملغى", en: "Cancelled" },

  // Reception
  todayAppointments: { ar: "مواعيد اليوم", en: "Today's appointments" },
  checkIn: { ar: "تسجيل الحضور", en: "Check-in" },
  walkIn: { ar: "مريض جديد (Walk-in)", en: "Walk-in patient" },
  bill: { ar: "الفاتورة", en: "Bill" },
  collectPayment: { ar: "تحصيل الدفع", en: "Collect payment" },
  patient: { ar: "المريض", en: "Patient" },
  doctor: { ar: "الطبيب", en: "Doctor" },
  time: { ar: "الوقت", en: "Time" },
  actions: { ar: "إجراءات", en: "Actions" },
  total: { ar: "الإجمالي", en: "Total" },

  // Doctor
  liveQueue: { ar: "قائمة الانتظار الحية", en: "Live queue" },
  startConsultation: { ar: "بدء الكشف", en: "Start consultation" },
  finishConsultation: { ar: "إنهاء الكشف", en: "Finish consultation" },
  addService: { ar: "إضافة خدمة", en: "Add service" },
  prescription: { ar: "الوصفة الطبية", en: "Prescription" },
  medications: { ar: "الأدوية", en: "Medications" },
  notes: { ar: "ملاحظات", en: "Notes" },

  // Admin
  manageDoctors: { ar: "إدارة الأطباء", en: "Manage doctors" },
  manageServices: { ar: "إدارة الخدمات", en: "Manage services" },
  reports: { ar: "التقارير", en: "Reports" },
  totalRevenue: { ar: "إجمالي الدخل", en: "Total revenue" },
  totalPatients: { ar: "عدد المرضى", en: "Patients" },
  totalAppointments: { ar: "عدد المواعيد", en: "Appointments" },
  servicesCount: { ar: "عدد الخدمات", en: "Services" },
  servicePrice: { ar: "السعر", en: "Price" },
  serviceName: { ar: "اسم الخدمة", en: "Service name" },
  consultationFee: { ar: "سعر الكشفية", en: "Consultation fee" },
  workingHours: { ar: "أوقات الدوام", en: "Working hours" },
  manageRoles: { ar: "إدارة الصلاحيات", en: "Manage roles" },
  assignRole: { ar: "تعيين صلاحية", en: "Assign role" },
  role: { ar: "الصلاحية", en: "Role" },

  heroTitle: {
    ar: "رحلتك الصحية، بإدارة سلسة وعصرية",
    en: "Your Health Journey, Beautifully Managed",
  },
  heroSubtitle: {
    ar: "فيورا تجمع المرضى والأطباء والإدارة في تجربة واحدة أنيقة وسلسة.",
    en: "Viora connects patients, doctors, and clinics in one seamless, elegant experience.",
  },
  getStarted: { ar: "ابدأ الآن", en: "Get started" },
  featureBookDesc: {
    ar: "احجز موعدك مع أفضل الأطباء في ثوانٍ",
    en: "Reserve your slot with top specialists in seconds",
  },
  featureQueueDesc: {
    ar: "تحديثات فورية تبقي الجميع على اطلاع دائماً",
    en: "Real-time updates keep every role in sync",
  },
  featurePrescDesc: {
    ar: "وصفات طبية رقمية في متناول يدك دائماً",
    en: "Digital prescriptions, always at your fingertips",
  },
  featureAdminDesc: {
    ar: "إدارة كاملة للعيادة في مكان واحد",
    en: "Complete clinic administration in one place",
  },
} as const;

type Key = keyof typeof dict;

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    try {
      const saved =
        typeof window !== "undefined" ? localStorage.getItem("lang") : null;
      if (saved === "ar" || saved === "en") setLangState(saved);
    } catch {
      // localStorage unavailable (private browsing, restricted environment)
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      if (typeof window !== "undefined") localStorage.setItem("lang", l);
    } catch {
      // localStorage unavailable
    }
  };

  const t = (key: Key) => dict[key]?.[lang] ?? key;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
