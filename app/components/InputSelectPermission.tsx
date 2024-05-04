import * as React from "react";
import { useTranslation } from "react-i18next";
import { $Diff } from "utility-types";
import { CollectionPermission } from "@shared/types";
import { EmptySelectValue } from "~/types";
import InputSelect, { Props, Option, InputSelectRef } from "./InputSelect";

function InputSelectPermission(
  props: $Diff<
    Props,
    {
      options: Array<Option>;
      ariaLabel: string;
    }
  >,
  ref: React.RefObject<InputSelectRef>
) {
  const { value, onChange, ...rest } = props;
  const { t } = useTranslation();
  const handleChange = React.useCallback(
    (value) => {
      onChange?.(value === EmptySelectValue ? null : value);
    },
    [onChange]
  );

  return (
    <InputSelect
      ref={ref}
      label={t("Permission")}
      options={[
        {
          label: t("Can edit"),
          value: CollectionPermission.ReadWrite,
        },
        {
          label: t("View only"),
          value: CollectionPermission.Read,
        },
        {
          label: t("No access"),
          value: EmptySelectValue,
        },
      ]}
      ariaLabel={t("Default access")}
      value={value || EmptySelectValue}
      onChange={handleChange}
      {...rest}
    />
  );
}

export default React.forwardRef(InputSelectPermission);
