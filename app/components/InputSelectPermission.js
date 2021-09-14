// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import SelectInput, { type Props, type Option } from "./SelectInput";

export default function InputSelectPermission(
  props: $Rest<Props, { options: Array<Option> }>
) {
  const { t } = useTranslation();

  return (
    <SelectInput
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
