import { observer } from "mobx-react";
import { BulletedListIcon, MenuIcon } from "outline-icons";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import { randomElement } from "@shared/random";
import { s } from "@shared/styles";
import { CollectionDisplay, CollectionPermission } from "@shared/types";
import { IconLibrary } from "@shared/utils/IconLibrary";
import { colorPalette } from "@shared/utils/collections";
import { CollectionValidation } from "@shared/validations";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import InputSelect from "~/components/InputSelect";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { EmptySelectValue } from "~/types";
import { Label } from "../Labeled";

const IconPicker = React.lazy(() => import("~/components/IconPicker"));

export interface FormData {
  name: string;
  icon: string;
  color: string | null;
  sharing: boolean;
  display: CollectionDisplay | undefined;
  permission: CollectionPermission | undefined;
}

export const CollectionForm = observer(function CollectionForm_({
  handleSubmit,
  collection,
}: {
  handleSubmit: (data: FormData) => void;
  collection?: Collection;
}) {
  const team = useCurrentTeam();
  const { t } = useTranslation();

  const [hasOpenedIconPicker, setHasOpenedIconPicker] = useBoolean(false);

  const iconColor = React.useMemo(
    () => collection?.color ?? randomElement(colorPalette),
    [collection?.color]
  );

  const fallbackIcon = <Icon value="collection" color={iconColor} />;

  const {
    register,
    handleSubmit: formHandleSubmit,
    formState,
    watch,
    control,
    setValue,
    setFocus,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      name: collection?.name ?? "",
      icon: collection?.icon,
      display: collection?.display ?? CollectionDisplay.List,
      sharing: collection?.sharing ?? true,
      permission: collection?.permission,
      color: iconColor,
    },
  });

  const values = watch();

  React.useEffect(() => {
    // If the user hasn't picked an icon yet, go ahead and suggest one based on
    // the name of the collection. It's the little things sometimes.
    if (!hasOpenedIconPicker && !collection) {
      setValue(
        "icon",
        IconLibrary.findIconByKeyword(values.name) ??
          values.icon ??
          "collection"
      );
    }
  }, [collection, hasOpenedIconPicker, setValue, values.name, values.icon]);

  React.useEffect(() => {
    setTimeout(() => setFocus("name", { shouldSelect: true }), 100);
  }, [setFocus]);

  const handleIconChange = React.useCallback(
    (icon: string, color: string | null) => {
      if (icon !== values.icon) {
        setFocus("name");
      }

      setValue("icon", icon);
      setValue("color", color);
    },
    [setFocus, setValue, values.icon]
  );

  return (
    <form onSubmit={formHandleSubmit(handleSubmit)}>
      <Text as="p">
        <Trans>
          Collections are used to group documents and choose permissions
        </Trans>
        .
      </Text>
      <Flex gap={8}>
        <Input
          type="text"
          placeholder={t("Name")}
          {...register("name", {
            required: true,
            maxLength: CollectionValidation.maxNameLength,
          })}
          prefix={
            <React.Suspense fallback={fallbackIcon}>
              <StyledIconPicker
                icon={values.icon}
                color={values.color ?? iconColor}
                initial={values.name[0]}
                popoverPosition="right"
                onOpen={setHasOpenedIconPicker}
                onChange={handleIconChange}
              />
            </React.Suspense>
          }
          autoComplete="off"
          autoFocus
          flex
        />
      </Flex>

      {/* Following controls are available in create flow, but moved elsewhere for edit */}
      {!collection && (
        <Controller
          control={control}
          name="permission"
          render={({ field }) => (
            <InputSelect
              ref={field.ref}
              label={t("Permission")}
              options={[
                {
                  label: t("View only"),
                  value: CollectionPermission.Read,
                },
                {
                  label: t("Can edit"),
                  value: CollectionPermission.ReadWrite,
                },
                {
                  label: t("No access"),
                  value: EmptySelectValue,
                },
              ]}
              ariaLabel={t("Default access")}
              value={field.value || EmptySelectValue}
              onChange={(
                value: CollectionPermission | typeof EmptySelectValue
              ) => {
                field.onChange(value === EmptySelectValue ? null : value);
              }}
              note={t(
                "The default access for workspace members, you can share with more users or groups later."
              )}
            />
          )}
        />
      )}

      <Controller
        control={control}
        name="display"
        render={({ field }) => (
          <div style={{ marginBottom: 8 }}>
            <Label>{t("Display")}</Label>
            <Flex gap={8}>
              <Toggle>
                <Text weight="bold" as={Flex} gap={4} align="center">
                  <MenuIcon /> {t("List")}
                </Text>
                <Text type="secondary">{t("Show only titles")}</Text>
                <input
                  type="radio"
                  name="display"
                  value={CollectionDisplay.List}
                  checked={field.value === CollectionDisplay.List}
                  onClick={(ev) => field.onChange(ev.currentTarget.value)}
                />
              </Toggle>
              <Toggle>
                <Text weight="bold" as={Flex} gap={4} align="center">
                  <BulletedListIcon /> {t("Post")}
                </Text>
                <Text type="secondary">{t("Show document preview")}</Text>
                <input
                  type="radio"
                  name="display"
                  value={CollectionDisplay.Post}
                  checked={field.value === CollectionDisplay.Post}
                  onClick={(ev) => field.onChange(ev.currentTarget.value)}
                />
              </Toggle>
            </Flex>
          </div>
        )}
      />

      {team.sharing && (
        <Switch
          id="sharing"
          label={t("Public document sharing")}
          note={t(
            "Allow documents within this collection to be shared publicly on the internet."
          )}
          {...register("sharing")}
        />
      )}

      <Flex justify="flex-end">
        <Button
          type="submit"
          disabled={formState.isSubmitting || !formState.isValid}
        >
          {collection
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

const StyledIconPicker = styled(IconPicker)`
  margin-left: 4px;
  margin-right: 4px;
`;

const Toggle = styled.label`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  border-radius: 4px;
  border: 1px solid ${s("inputBorder")};
  font-size: 14px;
  padding: 8px;
  margin-bottom: 12px;
  width: 50%;
  cursor: var(--pointer);

  input {
    display: none;
  }

  &:has(input:checked) {
    border-color: ${s("accent")};
    box-shadow: 0 0 0 1px ${s("accent")};
  }
`;
