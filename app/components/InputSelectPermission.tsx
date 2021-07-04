import * as React from "react";
import { useTranslation } from "react-i18next";
import InputSelect from "./InputSelect";

import type { Props, Option } from "./InputSelect";

export default function InputSelectPermission(props: Omit<Props, "options">) {
  const { t } = useTranslation();

  return (
    <InputSelect
      label={t("Default access")}
      options={[
        { label: t("View and edit"), value: "read_write" },
        { label: t("View only"), value: "read" },
        { label: t("No access"), value: "" },
      ]}
      {...props}
    />
  );
}
