// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import SelectInput, { type Props, type Option } from "./SelectInput";

export default function InputSelectPermission(
  props: $Rest<
    $Exact<Props>,
    // eslint-disable-next-line prettier/prettier
    {| options: Array<Option>, ariaLabel: string, ariaLabelPlural: string |}>
) {
  const { t } = useTranslation();
  console.log(props);
  return (
    <SelectInput
      label={t("Default access")}
      options={[
        { label: t("View and edit"), value: "read_write" },
        { label: t("View only"), value: "read" },
        { label: t("No access"), value: "" },
      ]}
      ariaLabel="Default access"
      ariaLabelPlural="Default access options"
      {...props}
    />
  );
}
