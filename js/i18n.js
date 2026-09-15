const translations = {
  en: {
    "page.title": "Geiger–Müller Counter Simulation",
    "language.switch": "العربية",
    "controls.heading": "Experiment controls",
    "source.label": "Radiation source",
    "source.none": "None (background)",
    "source.barium": "Ba-137m",
    "source.alpha": "α radiation",
    "source.beta": "β radiation",
    "source.gamma": "γ radiation",
    "source.unknown": "Unknown",
    "barrier.label": "Type of barrier",
    "barrier.none": "None",
    "barrier.lead": "Lead",
    "barrier.plastic": "Plastic",
    "barrier.cardboard": "Cardboard",
    "barrierCount.label": "Number of barriers",
    "duration.label": "Count duration",
    "duration.10": "10 seconds",
    "duration.30": "30 seconds",
    "duration.60": "1 minute",
    "button.startCount": "Start Count",
    "button.newBarium": "New Ba-137 Source",
    "button.newExperiment": "New Experiment",
    "timer.show": "Show Timer",
    "timer.stop": "Stop Timer",
    "timer.restart": "Restart Timer",
    "timer.label": "Timer",
    "sound.label": "Click sound for each count",
    "apparatus.heading": "Apparatus",
    "apparatus.description": "Radiation source below the barriers, with the Geiger–Müller tube above them, connected to a counter",
    "apparatus.counts": "COUNTS",
    "legend.unknown": "Unknown",
    "barium.age": "Time since Ba-137m source was prepared:",
    "status.counting": "Counting…",
    "status.finished": "{counts} counts in {duration}.",
    "status.newBarium": "New Ba-137m source prepared.",
    "footer.source": "Source on GitHub",
  },
  ar: {
    "page.title": "محاكاة عداد غايغر–مولر",
    "language.switch": "English",
    "controls.heading": "عناصر التحكم بالتجربة",
    "source.label": "مصدر الإشعاع",
    "source.none": "لا يوجد (الإشعاع الخلفي)",
    "source.barium": "Ba-137m",
    "source.alpha": "إشعاع ألفا α",
    "source.beta": "إشعاع بيتا β",
    "source.gamma": "إشعاع غاما γ",
    "source.unknown": "مصدر مجهول",
    "barrier.label": "نوع الحاجز",
    "barrier.none": "بدون حاجز",
    "barrier.lead": "رصاص",
    "barrier.plastic": "بلاستيك",
    "barrier.cardboard": "كرتون",
    "barrierCount.label": "عدد الحواجز",
    "duration.label": "مدة العد",
    "duration.10": "10 ثوانٍ",
    "duration.30": "30 ثانية",
    "duration.60": "دقيقة واحدة",
    "button.startCount": "بدء العد",
    "button.newBarium": "مصدر Ba-137 جديد",
    "button.newExperiment": "تجربة جديدة",
    "timer.show": "إظهار المؤقت",
    "timer.stop": "إيقاف المؤقت",
    "timer.restart": "إعادة تشغيل المؤقت",
    "timer.label": "المؤقت",
    "sound.label": "صوت نقرة لكل نبضة",
    "apparatus.heading": "الجهاز",
    "apparatus.description": "مصدر الإشعاع أسفل الحواجز، وأنبوب غايغر–مولر فوقها موصول بعداد",
    "apparatus.counts": "النبضات",
    "legend.unknown": "مجهول",
    "barium.age": "الزمن منذ تحضير مصدر Ba-137m:",
    "status.counting": "جارٍ العد…",
    "status.finished": "عدد النبضات: {counts} خلال {duration}.",
    "status.newBarium": "تم تحضير مصدر Ba-137m جديد.",
    "footer.source": "الشيفرة المصدرية على GitHub",
  },
};

const STORAGE_KEY = "language";
const TEXT_DIRECTIONS = { en: "ltr", ar: "rtl" };

let currentLanguage = "en";
const languageChangeListeners = [];

export function translate(key, params = {}) {
  const template = translations[currentLanguage][key] ?? translations.en[key];
  return template.replace(/\{(\w+)\}/g, (placeholder, name) => params[name] ?? placeholder);
}

export function onLanguageChange(listener) {
  languageChangeListeners.push(listener);
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = TEXT_DIRECTIONS[currentLanguage];
  document.title = translate("page.title");
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = translate(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", translate(element.dataset.i18nAriaLabel));
  }
  for (const listener of languageChangeListeners) listener(currentLanguage);
}

function readSavedLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveLanguage(language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {}
}

export function setLanguage(language) {
  currentLanguage = language in translations ? language : "en";
  saveLanguage(currentLanguage);
  applyTranslations();
}

export function toggleLanguage() {
  setLanguage(currentLanguage === "en" ? "ar" : "en");
}

export function initializeLanguage() {
  const savedLanguage = readSavedLanguage();
  currentLanguage = savedLanguage in translations ? savedLanguage : "en";
  applyTranslations();
}
