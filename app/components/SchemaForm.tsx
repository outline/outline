import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import { InputSelect } from "~/components/InputSelect";
import Text from "~/components/Text";
import type { DocType, FormValues } from "~/utils/formSchema";
import { validateForm, visibleFields } from "~/utils/formSchema";

interface Props {
  doctype: DocType;
  /** Starting values, for editing an existing record. */
  initial?: FormValues;
  submitLabel: string;
  onSubmit: (values: FormValues) => void;
  onCancel?: () => void;
}

/**
 * A form built from a description rather than written out.
 *
 * Which fields appear and what counts as valid both come from the DocType, so
 * a form's rules live in one place instead of being spread between the markup
 * and whatever checks the handler happens to make.
 *
 * @returns the rendered form.
 */
export function SchemaForm({
  doctype,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const [values, setValues] = useState<FormValues>(() => {
    const defaults: FormValues = {};
    doctype.fields.forEach((field) => {
      defaults[field.fieldname] = field.defaultValue ?? "";
    });
    return { ...defaults, ...initial };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const shown = visibleFields(doctype, values);

  const set = (fieldname: string, value: string) => {
    setValues({ ...values, [fieldname]: value });
    // Clear the complaint as soon as they start fixing it.
    if (errors[fieldname]) {
      const next = { ...errors };
      delete next[fieldname];
      setErrors(next);
    }
  };

  const handleSubmit = () => {
    const found = validateForm(doctype, values);
    setErrors(found);
    if (Object.keys(found).length === 0) {
      onSubmit(values);
    }
  };

  return (
    <Flex column gap={8} style={{ padding: "8px 0" }}>
      <Flex gap={8} wrap align="flex-end">
        {shown.map((field) =>
          field.fieldtype === "select" ? (
            <InputSelect
              key={field.fieldname}
              label={t(field.label)}
              value={values[field.fieldname] ?? ""}
              onChange={(value) => set(field.fieldname, value)}
              options={(field.options ?? []).map((option) => ({
                type: "item",
                label: t(option.label),
                value: option.value,
              }))}
            />
          ) : (
            <Input
              key={field.fieldname}
              type={field.fieldtype === "email" ? "email" : "text"}
              label={t(field.label)}
              value={values[field.fieldname] ?? ""}
              placeholder={field.placeholder}
              onChange={(event) => set(field.fieldname, event.target.value)}
              short={field.short}
            />
          )
        )}
        <Button onClick={handleSubmit}>{t(submitLabel)}</Button>
        {onCancel ? (
          <Button neutral borderOnHover onClick={onCancel}>
            {t("Cancel")}
          </Button>
        ) : null}
      </Flex>

      {Object.entries(errors).map(([fieldname, message]) => (
        <Text
          key={fieldname}
          type="danger"
          size="small"
          as="p"
          data-testid={`error-${fieldname}`}
        >
          {message}
        </Text>
      ))}
    </Flex>
  );
}
