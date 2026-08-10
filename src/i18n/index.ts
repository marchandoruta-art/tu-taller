import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import es from './locales/es.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

type Dict = Record<string, unknown>;

function deepMerge(target: Dict, source: Dict): Dict {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      target[key] = deepMerge((target[key] as Dict) ?? {}, value as Dict);
    } else {
      target[key] = value;
    }
  }
  return target;
}

const base: Record<LanguageCode, Dict> = {
  es: es as Dict,
  en: en as Dict,
  fr: fr as Dict,
  de: de as Dict,
  pt: pt as Dict,
};

// Feature modules live in ./locales/<module>/<lang>.json and are merged in,
// so translations can grow per screen without touching the base files.
const modules = import.meta.glob<Dict>('./locales/*/*.json', {
  eager: true,
  import: 'default',
});

for (const [path, dict] of Object.entries(modules)) {
  const lang = path.split('/').pop()?.replace('.json', '') as LanguageCode | undefined;
  if (lang && base[lang]) deepMerge(base[lang], dict);
}

// Some screens reference keys with an explicit namespace prefix
// (e.g. t('vehiclesUI:dashboard.title')), so every top-level group is also
// registered as its own namespace in addition to the flat 'translation' one.
const namespaceKeys = new Set<string>();
for (const dict of Object.values(base)) {
  for (const [key, value] of Object.entries(dict)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) namespaceKeys.add(key);
  }
}

const resources = Object.fromEntries(
  Object.entries(base).map(([lang, dict]) => {
    const bundles: Record<string, unknown> = { translation: dict };
    for (const ns of namespaceKeys) {
      if (dict[ns]) bundles[ns] = dict[ns];
    }
    return [lang, bundles];
  })
);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: ['translation', ...namespaceKeys],
    defaultNS: 'translation',
    fallbackNS: 'translation',

    fallbackLng: 'es',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'app_language',
      caches: ['localStorage'],
    },
  });

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.resolvedLanguage || 'es';
}

export default i18n;
