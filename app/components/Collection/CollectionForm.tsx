import uniq from "lodash/uniq";
import { observer } from "mobx-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import { randomElement } from "@shared/random";
import { CollectionPermission } from "@shared/types";
import { IconLibrary } from "@shared/utils/IconLibrary";
import { colorPalette } from "@shared/utils/collections";
import { CollectionValidation } from "@shared/validations";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import InputSelectPermission from "~/components/InputSelectPermission";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import { EmptySelectValue } from "~/types";

const IconPicker = React.lazy(() => import("~/components/IconPicker"));

export interface FormData {
  name: string;
  icon: string;
  color: string | null;
  sharing: boolean;
  permission: CollectionPermission | undefined;
}

const useIconColor = (collection?: Collection) => {
  const { collections } = useStores();
  const hasMultipleCollections = collections.orderedData.length > 1;
  const collectionColors = uniq(
    collections.orderedData.map((c) => c.color).filter(Boolean)
  ) as string[];

  const iconColor = React.useMemo(
    () =>
      collection?.color ??
      // If all the existing collections have the same color, use that color,
      // otherwise pick a random color from the palette
      (hasMultipleCollections && collectionColors.length === 1
        ? collectionColors[0]
        : randomElement(colorPalette)),
    [collection?.color]
  );
  return iconColor;
};

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

  const iconColor = useIconColor(collection);
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
