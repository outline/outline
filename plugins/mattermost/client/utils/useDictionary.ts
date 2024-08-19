import React from "react";
import { useTranslation } from "react-i18next";

export default function useDictionary() {
  const { t } = useTranslation();

  return React.useMemo(
    () => ({
      invalidApiKey: t("Invalid API key"),
      serverError: t(
        "Server error - please check the url and network configuration"
      ),
    }),
    [t]
  );
}

export type Dictionary = ReturnType<typeof useDictionary>;
