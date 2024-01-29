import * as React from "react";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "~/utils/language";

type Props = {
  locale: string;
};

export default function ChangeLanguage({ locale }: Props) {
  const { i18n } = useTranslation();

  React.useEffect(() => {
    void changeLanguage(locale, i18n);
  }, [locale, i18n]);

  return null;
}
