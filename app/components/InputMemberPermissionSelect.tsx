import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { InputSelectNew, Option } from "~/components/InputSelectNew";
import { EmptySelectValue, Permission } from "~/types";

type Props = Pick<
  React.ComponentProps<typeof InputSelectNew>,
  "value" | "onChange" | "disabled" | "className"
>;

export default function InputMemberPermissionSelect(
  props: Props & { permissions: Permission[] }
) {
  const { value, onChange, ...rest } = props;
  const { t } = useTranslation();

  const options = React.useMemo<Option[]>(
    () =>
      props.permissions.reduce((acc, permission) => {
        if (permission.divider) {
          acc.push({ type: "separator" });
        }
        acc.push({
          ...permission,
          type: "item",
        });
        return acc;
      }, [] as Option[]),
    [props.permissions]
  );

  return (
    <Select
      options={options}
      value={value || EmptySelectValue}
      onChange={onChange}
      ariaLabel={t("Permissions")}
      label={t("Permissions")}
      hideLabel
      nude
      {...rest}
    />
  );
}

const Select = styled(InputSelectNew)`
  color: ${s("textSecondary")};
`;
