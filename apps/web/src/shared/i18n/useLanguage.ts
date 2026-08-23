import { parseAsStringEnum, useQueryState } from "nuqs";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguageContext } from "@/shared/contexts/SessionContext";
import { useSession } from "../hooks/use-session";
import {
	DEFAULT_LANGUAGE,
	SUPPORTED_LANGUAGES,
	type TLanguage,
} from "../types/i18n.types";
import { Cookie } from "../utils/cookie";

export const useLanguage = () => {
	const { i18n } = useTranslation();
	const { session } = useSession();
	const { updateLanguage: persistLanguage } = useLanguageContext();

	const [lang, setLang] = useQueryState(
		"lang",
		parseAsStringEnum<TLanguage>(Object.values(SUPPORTED_LANGUAGES))
			.withDefault((Cookie.get("lang") as TLanguage) || DEFAULT_LANGUAGE)
			.withOptions({ shallow: false }),
	);

	// Sync language when session loads
	useEffect(() => {
		if (session?.preferredLanguage && session.preferredLanguage !== lang) {
			setLang(session.preferredLanguage as TLanguage);
		}
	}, [session?.preferredLanguage, lang, setLang]);

	useEffect(() => {
		if (
			i18n &&
			typeof i18n.changeLanguage === "function" &&
			i18n.language !== lang
		) {
			i18n.changeLanguage(lang);
			Cookie.set("lang", lang, 365);
		}
	}, [lang, i18n]);

	const changeLanguage = useCallback(
		async (newLang: TLanguage) => {
			setLang(newLang);
			Cookie.set("lang", newLang, 365);

			// Persist to DB if logged in
			if (session?.userId && persistLanguage) {
				try {
					await persistLanguage(newLang);
				} catch (err) {
					console.error("Failed to persist language preference:", err);
				}
			}
		},
		[setLang, session?.userId],
	);

	return {
		language: lang,
		changeLanguage,
		supportedLanguages: SUPPORTED_LANGUAGES,
	} as const;
};
