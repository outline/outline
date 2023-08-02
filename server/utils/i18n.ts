import path from "path";
import i18n from "i18next";
import backend from "i18next-fs-backend";
import { languages } from "@shared/i18n";
import { unicodeBCP47toCLDR, unicodeCLDRtoBCP47 } from "@shared/utils/date";
import env from "@server/env";
import { User } from "@server/models";

/**
 * Returns i18n options for the given user or the default server language if
 * no user is provided.
 *
 * @param user The user to get options for
 * @returns i18n options
 */
export function opts(user?: User | null) {
  return {
    lng: unicodeCLDRtoBCP47(user?.language ?? env.DEFAULT_LANGUAGE),
  };
}

/**
 * Initializes i18n library, loading all available translations from the
 * filesystem.
 *
 * @returns i18n instance
 */
export async function initI18n() {
  const lng = unicodeCLDRtoBCP47(env.DEFAULT_LANGUAGE);
  i18n.use(backend);
  await i18n.init({
    compatibilityJSON: "v3",
    backend: {
      loadPath: (language: string) =>
        path.resolve(
          path.join(
            __dirname,
            "..",
            "..",
            "shared",
            "i18n",
            "locales",
            unicodeBCP47toCLDR(language),
            "translation.json"
          )
        ),
    },
    preload: languages.map(unicodeCLDRtoBCP47),
    interpolation: {
      escapeValue: false,
    },
    lng,
    fallbackLng: lng,
    keySeparator: false,
    returnNull: false,
  });
  return i18n;
}
