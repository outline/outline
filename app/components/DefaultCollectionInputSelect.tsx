import {
  CollectionIcon as CollectionIconComponent,
  HomeIcon,
  PrivateCollectionIcon,
} from "outline-icons";
import { observer } from "mobx-react";
import { getLuminance } from "polished";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Icon from "@shared/components/Icon";
import { colorPalette } from "@shared/utils/collections";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import useStores from "~/hooks/useStores";

type DefaultCollectionInputSelectProps = {
  onSelectCollection: (collection: string) => void;
  defaultCollectionId: string | null;
};

const DefaultCollectionInputSelect = observer(
  ({
    onSelectCollection,
    defaultCollectionId,
  }: DefaultCollectionInputSelectProps) => {
    const { t } = useTranslation();
    const { collections, ui } = useStores();
    const [fetching, setFetching] = useState(false);
    const [fetchError, setFetchError] = useState();

    React.useEffect(() => {
      async function fetchData() {
        if (!collections.isLoaded && !fetching && !fetchError) {
          try {
            setFetching(true);
            await collections.fetchPage({
              limit: 100,
            });
          } catch (error) {
            toast.error(
              t("Collections could not be loaded, please reload the app")
            );
            setFetchError(error);
          } finally {
            setFetching(false);
          }
        }
      }
      void fetchData();
    }, [fetchError, t, fetching, collections]);

    if (fetching) {
      return null;
    }

    const isDark = ui.resolvedTheme === "dark";

    // Eagerly resolve collection icon properties within this observer context
    // to avoid MobX warnings when Radix Select clones elements for the trigger.
    const options: Option[] = collections.nonPrivate.reduce(
      (acc, collection) => {
        const collectionIcon = collection.icon;
        const rawColor = collection.color ?? colorPalette[0];

        let icon: React.ReactElement;
        if (!collectionIcon || collectionIcon === "collection") {
          const color =
            isDark && rawColor !== "currentColor"
              ? getLuminance(rawColor) > 0.09
                ? rawColor
                : "currentColor"
              : rawColor;
          const Component = collection.isPrivate
            ? PrivateCollectionIcon
            : CollectionIconComponent;
          icon = <Component color={color} />;
        } else {
          let color = rawColor;
          if (color !== "currentColor") {
            if (isDark) {
              color = getLuminance(color) > 0.09 ? color : "currentColor";
            } else {
              color = getLuminance(color) < 0.9 ? color : "currentColor";
            }
          }
          icon = (
            <Icon
              value={collectionIcon}
              color={color}
              initial={collection.initial}
              forceColor
            />
          );
        }

        return [
          ...acc,
          {
            type: "item" as const,
            label: collection.name,
            value: collection.id,
            icon,
          },
        ];
      },
      [
        {
          type: "item",
          label: t("Home"),
          value: "home",
          icon: <HomeIcon />,
        },
      ] satisfies Option[]
    );

    return (
      <InputSelect
        options={options}
        value={defaultCollectionId ?? "home"}
        onChange={onSelectCollection}
        label={t("Start view")}
        hideLabel
        short
      />
    );
  }
);

export default DefaultCollectionInputSelect;
