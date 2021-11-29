import * as React from "react";
import { useTranslation } from "react-i18next";
import { $Diff } from "utility-types";
import InputSelect, { Props, Option } from "./InputSelect";

export default function InputSelectPermission(
  props: $Diff<
    Props,
    {
      options: Array<Option>;
      ariaLabel: string;
    }
  >
) {
  const { value, onChange, ...rest } = props;
  const { t } = useTranslation();
  const handleChange = React.useCallback(
    (value) => {
      if (value === "no_access") {
        value = "";
      }

      onChange(value);
    },
    [onChange]
  );

  return (
    <InputSelect
      label={t("Default access")}
      options={[
        {
          label: t("View and edit"),
          value: "read_write",
        },
        {
          label: t("View only"),
          value: "read",
        },
        {
          label: t("No access"),
          value: "no_access",
        },
      ]}
      ariaLabel={t("Default access")}
      value={value || "no_access"}
      onChange={handleChange}
      {...rest}
    />
  );
}
