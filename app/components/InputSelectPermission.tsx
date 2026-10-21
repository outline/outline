import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import { CollectionPermission } from "@shared/types";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import { EmptySelectValue } from "~/types";

type Props = {
  shrink?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
} & Pick<
  React.ComponentProps<typeof InputSelect>,
  "value" | "onChange" | "disabled" | "labelHidden" | "nude" | "help"
>;

export function InputSelectPermission(props: Props) {
  const { ref, value, onChange, shrink, ...rest } = props;
  const { t } = useTranslation();

  const options = React.useMemo<Option[]>(
    () => [
      {
        type: "item",
        label: t("View only"),
        value: CollectionPermission.Read,
      },
      {
        type: "item",
        label: t("Can edit"),
        value: CollectionPermission.ReadWrite,
      },
      {
        type: "separator",
      },
      {
        type: "item",
        label: t("No access"),
        value: EmptySelectValue,
      },
    ],
    [t]
  );

  return (
    <Select
      ref={ref}
      options={options}
      value={value || EmptySelectValue}
      onChange={onChange}
      label={t("Permission")}
      $shrink={shrink}
      {...rest}
    />
  );
}

const Select = styled(InputSelect)<{ $shrink?: boolean }>`
  ${({ nude }) =>
    nude &&
    css`
      color: ${s("textSecondary")};
    `}
  ${({ $shrink }) => !$shrink && "margin-bottom: 16px;"}
`;
