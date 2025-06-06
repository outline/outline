import { UseFormRegister, Path, FieldValues } from "react-hook-form";

/**
 * Creates a switch register function that adapts react-hook-form's register
 * to work with Switch components that use boolean callbacks instead of synthetic events.
 *
 * @param register - The register function from react-hook-form
 * @param fieldName - The name of the form field to register
 * @returns An object with the registration props adapted for Switch components
 */
export function createSwitchRegister<
  TFormData extends FieldValues = FieldValues
>(register: UseFormRegister<TFormData>, fieldName: Path<TFormData>) {
  const { onChange, ...rest } = register(fieldName);
  return {
    ...rest,
    onChange: (checked: boolean) => {
      const syntheticEvent = {
        target: { name: fieldName, value: checked, checked },
        type: "change",
      };
      void onChange(syntheticEvent);
    },
  };
}
