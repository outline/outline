import * as React from "react";
import { useTranslation } from "react-i18next";
import { $Diff } from "utility-types";
import InputSelect, { Props, Option } from "~/components/InputSelect";

const InputSelectRole = (
  props: $Diff<
    Props,
    {
      options: Array<Option>;
      ariaLabel: string;
    }
  >
) => {
  const { t } = useTranslation();
  return (
    <InputSelect
      label={t("Role")}
      options={[
        {
          label: t("Member"),
          value: "member",
        },
        {
          label: t("Viewer"),
          value: "viewer",
        },
        {
          label: t("Admin"),
          value: "admin",
        },
      ]}
      ariaLabel={t("Role")}
      {...props}
    />
  );
};

export default InputSelectRole;
