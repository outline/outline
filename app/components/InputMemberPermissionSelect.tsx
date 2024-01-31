import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import InputSelect, { Props as SelectProps } from "~/components/InputSelect";
import { Permission } from "~/types";

export default function InputMemberPermissionSelect(
  props: Partial<SelectProps> & { permissions: Permission[] }
) {
  const { t } = useTranslation();

  return (
    <Select
      label={t("Permissions")}
      options={props.permissions}
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
