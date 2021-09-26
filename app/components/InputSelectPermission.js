// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import InputSelect, { type Props, type Option } from "./InputSelect";

export default function InputSelectPermission(
  props: $Rest<
    $Exact<Props>,
    // eslint-disable-next-line prettier/prettier
    {| options: Array<Option>, ariaLabel: string, ariaLabelPlural: string |}>
) {
  const { t } = useTranslation();

  return (
    <InputSelect
      label={t("Default access")}
      options={[
        { label: t("View and edit"), value: "read_write" },
        { label: t("View only"), value: "read" },
        { label: t("No access"), value: "no_access" },
      ]}
      ariaLabel="Default access"
      ariaLabelPlural="Default access options"
      {...props}
    />
  );
}
