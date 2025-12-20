import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { CollectionPermission } from "@shared/types";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import { EmptySelectValue } from "~/types";

type Props = {
  shrink?: boolean;
} & Pick<
  React.ComponentProps<typeof InputSelect>,
  "value" | "onChange" | "disabled" | "hideLabel" | "nude" | "help"
>;

export const InputSelectPermission = React.forwardRef<HTMLButtonElement, Props>(
  (props, ref) => {
    const { value, onChange, shrink, ...rest } = props;
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
);
InputSelectPermission.displayName = "InputSelectPermission";

const Select = styled(InputSelect)<{ $shrink?: boolean }>`
  color: ${s("textSecondary")};
  ${({ $shrink }) => !$shrink && "margin-bottom: 16px;"}
`;
