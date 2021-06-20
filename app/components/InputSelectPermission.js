// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import InputSelect, { type Props, type Option } from "./InputSelect";

export default function InputSelectPermission(
  props: $Rest<Props, { options: Array<Option> }>
) {
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
