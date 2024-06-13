import capitalize from "lodash/capitalize";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  DataAttributeDataType,
  type DataAttributeOptions,
} from "@shared/models/types";
import { DataAttributeValidation } from "@shared/validations";
import DataAttribute from "~/models/DataAttribute";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import InputSelect from "../InputSelect";
import NudeButton from "../NudeButton";
import Switch from "../Switch";

export interface FormData {
  name: string;
  description?: string;
  dataType: DataAttributeDataType;
  options?: DataAttributeOptions;
  pinned: boolean;
}

export const DataAttributeForm = observer(function DataAttributeForm_({
  handleSubmit,
  dataAttribute,
}: {
  handleSubmit: (data: FormData) => void;
  dataAttribute?: DataAttribute;
}) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit: formHandleSubmit,
    formState,
    watch,
    control,
    setFocus,
    setValue,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      name: dataAttribute?.name,
      description: dataAttribute?.description ?? undefined,
      dataType: dataAttribute?.dataType ?? DataAttributeDataType.String,
      options: dataAttribute?.options ?? undefined,
      pinned: dataAttribute?.pinned ?? false,
    },
  });
  React.useEffect(() => {
    setTimeout(() => setFocus("name", { shouldSelect: true }), 100);
  }, [setFocus]);

  const values = watch();

  return (
    <form onSubmit={formHandleSubmit(handleSubmit)}>
      <Controller
        control={control}
        name="dataType"
        render={({ field }) => (
          <InputSelect
            ref={field.ref}
            value={field.value}
            onChange={(value: DataAttributeDataType) => {
              field.onChange(value);

              if (value === DataAttributeDataType.List) {
                setValue("options", { options: [""] });
              }
            }}
            ariaLabel={t("Format")}
            label={t("Format")}
            options={Object.values(DataAttributeDataType).map((dataType) => ({
              value: dataType,
              label: t(capitalize(dataType)),
            }))}
          />
        )}
      />
      {values.dataType === DataAttributeDataType.List && (
        <Flex column gap={8}>
          {values.options?.options?.map((option, index) => (
            <div key={index}>
              <Input
                value={option}
                type="text"
                autoComplete="off"
                autoFocus
                flex
              />
            </div>
          ))}
          <Controller
            control={control}
            name="options"
            render={({ field }) => (
              <NudeButton
                disabled={
                  (values.options?.options?.length ?? 0) >=
                  DataAttributeValidation.maxOptions
                }
                onClick={() => {
                  field.onChange({
                    options: [...(field.value?.options ?? []), ""],
                  });
                }}
              >
                <PlusIcon />
              </NudeButton>
            )}
          />
        </Flex>
      )}
      <Input
        type="text"
        label={t("Name")}
        {...register("name", {
          required: true,
          maxLength: DataAttributeValidation.maxNameLength,
        })}
        autoComplete="off"
        autoFocus
        flex
      />
      <Input
        type="text"
        label={t("Description")}
        {...register("description", {
          maxLength: DataAttributeValidation.maxDescriptionLength,
        })}
        autoComplete="off"
        flex
      />
      <Switch
        id="pinned"
        label={t("Pinned")}
        note={t("Pinned attributes are shown at the top of documents.")}
        {...register("pinned")}
      />
      <Flex justify="flex-end">
        <Button
          type="submit"
          disabled={formState.isSubmitting || !formState.isValid}
        >
          {dataAttribute
            ? formState.isSubmitting
              ? `${t("Saving")}…`
              : t("Save")
            : formState.isSubmitting
            ? `${t("Creating")}…`
            : t("Create")}
        </Button>
      </Flex>
    </form>
  );
});
