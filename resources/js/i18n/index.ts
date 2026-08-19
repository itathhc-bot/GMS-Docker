import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ar from "./locales/ar.json";
import { recordMissingKey } from "./missingKeys";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", dir: "ltr" as const },
  { code: "ar", label: "العربية", dir: "rtl" as const },
];

export const LANG_STORAGE_KEY = "app_lang";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: LANG_STORAGE_KEY,
    },
    saveMissing: true,
    missingKeyHandler: (lngs, ns, key, fallbackValue) => {
      const langs = (lngs as unknown as string[]) || [];
      // Always register so the audit panel can surface it.
      try {
        recordMissingKey(key, langs, fallbackValue as string | undefined, ns as string | undefined);
      } catch {
        // ignore registry errors
      }
      if (typeof window !== "undefined" && import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn(
          `[i18n] Missing translation key "${key}" for languages [${langs.join(", ")}]${
            fallbackValue ? ` (fallback: "${fallbackValue}")` : ""
          }`,
        );
      }
    },
  });

function applyDir(lng: string) {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === lng) ?? SUPPORTED_LANGUAGES[0];
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("dir", lang.dir);
    document.documentElement.setAttribute("lang", lang.code);
  }
}

// Apply persisted language + direction immediately on load so RTL/LTR is correct
// before React mounts. The detector also reads localStorage, but applying dir
// here guarantees no flash of wrongly-directioned UI.
function bootstrapLanguage() {
  if (typeof window === "undefined") return;
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
      if (i18n.language !== stored) {
        void i18n.changeLanguage(stored);
      }
      applyDir(stored);
      return;
    }
  } catch {
    // localStorage might be unavailable (private mode etc.)
  }
  applyDir(i18n.language || "en");
}

bootstrapLanguage();
i18n.on("languageChanged", (lng) => {
  applyDir(lng);
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lng);
  } catch {
    // ignore
  }
});

export default i18n;
