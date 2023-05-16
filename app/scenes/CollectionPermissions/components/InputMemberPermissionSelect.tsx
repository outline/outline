import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { CollectionPermission } from "@shared/types";
import InputSelect, { Props as SelectProps } from "~/components/InputSelect";

export default function InputMemberPermissionSelect(
  props: Partial<SelectProps>
) {
  const { t } = useTranslation();

  return (
    <Select
      label={t("Permissions")}
      options={[
        {
          label: t("View only"),
          value: CollectionPermission.Read,
        },
        {
          label: t("View and edit"),
          value: CollectionPermission.ReadWrite,
        },
        {
          label: t("Admin"),
          value: CollectionPermission.Admin,
        },
      ]}
      ariaLabel={t("Permissions")}
      labelHidden
      nude
      {...props}
    />
  );
}

const Select = styled(InputSelect)`
  margin: 0;
  font-size: 14px;
  border-color: transparent;
  box-shadow: none;
  color: ${s("textSecondary")};

  select {
    margin: 0;
  }
` as React.ComponentType<SelectProps>;
