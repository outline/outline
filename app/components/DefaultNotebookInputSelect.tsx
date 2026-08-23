import {
  CollectionIcon as NotebookIconComponent,
  HomeIcon,
  PrivateCollectionIcon,
} from "outline-icons";
import { observer } from "mobx-react";
import { getLuminance } from "polished";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { toError } from "@shared/utils/error";
import Icon from "@shared/components/Icon";
import { colorPalette } from "@shared/constants";
import type { Option } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import useStores from "~/hooks/useStores";
type DefaultNotebookInputSelectProps = {
  onSelectNotebook: (notebook: string) => void;
  defaultNotebookId: string | null;
};
const DefaultNotebookInputSelect = observer(
  ({
    onSelectNotebook,
    defaultNotebookId,
  }: DefaultNotebookInputSelectProps) => {
    const { t } = useTranslation();
    const { notebooks, ui } = useStores();
    const [fetching, setFetching] = useState(false);
    const [fetchError, setFetchError] = useState<Error>();
    React.useEffect(() => {
      async function fetchData() {
        if (!notebooks.isLoaded && !fetching && !fetchError) {
          try {
            setFetching(true);
            await notebooks.fetchPage({
              limit: 100,
            });
          } catch (error) {
            toast.error(
              t("Notebooks could not be loaded, please reload the app")
            );
            setFetchError(toError(error));
          } finally {
            setFetching(false);
          }
        }
      }
      void fetchData();
    }, [fetchError, t, fetching, notebooks]);
    if (fetching) {
      return null;
    }
    const isDark = ui.resolvedTheme === "dark";
    // Eagerly resolve collection icon properties within this observer context
    // to avoid MobX warnings when Radix Select clones elements for the trigger.
    const options: Option[] = notebooks.nonPrivate.reduce(
      (acc, notebook) => {
        const notebookIcon = notebook.icon;
        const rawColor = notebook.color ?? colorPalette[0];
        let icon: React.ReactElement;
        if (!notebookIcon || notebookIcon === "collection") {
          const color =
            isDark && rawColor !== "currentColor"
              ? getLuminance(rawColor) > 0.09
                ? rawColor
                : "currentColor"
              : rawColor;
          const Component = notebook.isPrivate
            ? PrivateCollectionIcon
            : NotebookIconComponent;
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
              value={notebookIcon}
              color={color}
              initial={notebook.initial}
              forceColor
            />
          );
        }
        return [
          ...acc,
          {
            type: "item" as const,
            label: notebook.name,
            value: notebook.id,
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
        value={defaultNotebookId ?? "home"}
        onChange={onSelectNotebook}
        label={t("Start view")}
        labelHidden
        short
      />
    );
  }
);
export default DefaultNotebookInputSelect;
