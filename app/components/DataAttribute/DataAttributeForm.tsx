import { observer } from "mobx-react";
import { CloseIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import {
  DataAttributeDataType,
  type DataAttributeOptions,
} from "@shared/models/types";
import { DataAttributeValidation } from "@shared/validations";
import type DataAttribute from "~/models/DataAttribute";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import { DataAttributesHelper } from "~/utils/DataAttributesHelper";
import InputSelect from "../InputSelect";
import NudeButton from "../NudeButton";

type Props = {
  handleSubmit: (data: FormData) => void;
  dataAttribute?: DataAttribute;
};

export interface FormData {
  name: string;
  description?: string;
  dataType: DataAttributeDataType;
  options?: DataAttributeOptions;
}

export const DataAttributeForm = observer(function DataAttributeForm_({
  handleSubmit,
  dataAttribute,
}: Props) {
  const theme = useTheme();
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
    },
  });
  const values = watch();
  const isEditing = !!dataAttribute;

  React.useEffect(() => {
    if (isEditing) {
      return;
    }
    setTimeout(() => setFocus("name", { shouldSelect: true }), 100);
  }, [isEditing, setFocus]);

  return (
    <form onSubmit={formHandleSubmit(handleSubmit)}>
      <div>
        <Controller
          control={control}
          name="dataType"
          render={({ field }) => (
            <InputSelect
              ref={field.ref}
              value={field.value}
              disabled={isEditing}
              onChange={(value: DataAttributeDataType) => {
                field.onChange(value);

                if (value === DataAttributeDataType.List) {
                  setValue("options", {
                    options: [
                      {
                        value: "",
                      },
                      {
                        value: "",
                      },
                    ],
                  });
                }
              }}
              ariaLabel={t("Format")}
              label={t("Format")}
              options={Object.values(DataAttributeDataType).map((dataType) => ({
                value: dataType,
                label: DataAttributesHelper.getName(dataType, t),
              }))}
              style={{ width: "auto" }}
            />
          )}
        />
      </div>
      {values.dataType === DataAttributeDataType.List && (
        <Options gap={8} column>
          {values.options?.options?.map((option, index) => (
            <Flex gap={4} align="center" key={index}>
              <Input
                value={option.value}
                onChange={(event) => {
                  const newOptions = [...(values.options?.options ?? [])];
                  newOptions[index] = { value: event.target.value };
                  setValue("options", { options: newOptions });
                }}
                type="text"
                autoComplete="off"
                autoFocus={index !== 1}
                minLength={DataAttributeValidation.minOptionLength}
                maxLength={DataAttributeValidation.maxOptionLength}
                margin={0}
                required
                flex
              />
              <NudeButton
                disabled={
                  (values.options?.options?.length ?? 0) <=
                  DataAttributeValidation.minOptions
                }
                onClick={() => {
                  const newOptions = [...(values.options?.options ?? [])];
                  newOptions.splice(index, 1);
                  setValue("options", { options: newOptions });
                }}
              >
                <CloseIcon color={theme.textSecondary} />
              </NudeButton>
            </Flex>
          ))}
          <div>
            <Controller
              control={control}
              name="options"
              render={({ field }) => (
                <Button
                  neutral
                  borderOnHover
                  icon={<PlusIcon size={20} />}
                  disabled={
                    (values.options?.options?.length ?? 0) >=
                    DataAttributeValidation.maxOptions
                  }
                  onClick={() => {
                    field.onChange({
                      options: [
                        ...(field.value?.options ?? []),
                        {
                          value: "",
                        },
                      ],
                    });
                  }}
                >
                  {t("Add option")}
                </Button>
              )}
            />
          </div>
        </Options>
      )}
      <Input
        type="text"
        label={t("Name")}
        {...register("name", {
          required: true,
          minLength: DataAttributeValidation.minNameLength,
          maxLength: DataAttributeValidation.maxNameLength,
        })}
        autoComplete="off"
        autoFocus
        flex
      />
      <Input
        type="text"
        label={t("Description")}
        placeholder={t("Optional")}
        {...register("description", {
          maxLength: DataAttributeValidation.maxDescriptionLength,
        })}
        autoComplete="off"
        flex
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

const Options = styled(Flex)`
  margin-left: 16px;
  margin-bottom: 16px;
`;
