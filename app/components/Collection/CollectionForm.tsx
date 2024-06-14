import { observer } from "mobx-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import { randomElement } from "@shared/random";
import { CollectionPermission } from "@shared/types";
import { IconLibrary } from "@shared/utils/IconLibrary";
import { colorPalette } from "@shared/utils/collections";
import { CollectionValidation } from "@shared/validations";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Icon from "~/components/Icon";
import Input from "~/components/Input";
import InputSelectPermission from "~/components/InputSelectPermission";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { Feature, FeatureFlags } from "~/utils/FeatureFlags";

const IconPicker = React.lazy(() => import("~/components/IconPicker"));

export interface FormData {
  name: string;
  icon: string;
  color: string | null;
  sharing: boolean;
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

  const fallbackIcon = <Icon value={"collection"} color={iconColor} />;

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
            <InputSelectPermission
              ref={field.ref}
              value={field.value}
              onChange={(value: CollectionPermission) => {
                field.onChange(value);
              }}
              note={t(
                "The default access for workspace members, you can share with more users or groups later."
              )}
            />
          )}
        />
      )}

      {team.sharing &&
        (!collection ||
          FeatureFlags.isEnabled(Feature.newCollectionSharing)) && (
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
