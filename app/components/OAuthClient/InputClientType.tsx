import * as React from "react";
import { useTranslation } from "react-i18next";
import { InputSelect } from "../InputSelect";

/**
 * An input that allows a choice of OAuth client type.
 */
export const InputClientType = React.forwardRef(
  (
    props: Omit<React.ComponentProps<typeof InputSelect>, "options" | "label">,
    ref: React.Ref<HTMLButtonElement>
  ) => {
    const { t } = useTranslation();
    return (
      <InputSelect
        {...props}
        label={t("Client type")}
        ref={ref}
        style={{ marginBottom: "1em" }}
        options={[
          {
            type: "item",
            label: t("Confidential"),
            value: "confidential",
            description: t("Suitable for server-side applications"),
          },
          {
            type: "item",
            label: t("Public"),
            value: "public",
            description: t("Suitable for client-side or mobile applications"),
          },
        ]}
      />
    );
  }
);
