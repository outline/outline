// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import SelectInput, { type Props, type Option } from "components/SelectInput";

const InputSelectRole = (
  props: $Rest<
    $Exact<Props>,
    // eslint-disable-next-line prettier/prettier
  {| options: Array<Option>, ariaLabel: string, ariaLabelPlural: string |}>
) => {
  const { t } = useTranslation();

  return (
    <SelectInput
      label={t("Role")}
      options={[
        { label: t("Member"), value: "member" },
        { label: t("Viewer"), value: "viewer" },
        { label: t("Admin"), value: "admin" },
      ]}
      ariaLabel="Role"
      ariaLabelPlural="Roles"
      {...props}
    />
  );
};

export default InputSelectRole;
