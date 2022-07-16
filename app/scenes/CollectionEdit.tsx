import invariant from "invariant";
import { observer } from "mobx-react";
import { useState } from "react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { MAX_TITLE_LENGTH } from "@shared/constants";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import IconPicker from "~/components/IconPicker";
import Input from "~/components/Input";
import InputSelect from "~/components/InputSelect";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  collectionId: string;
  onSubmit: () => void;
};

const CollectionEdit = ({ collectionId, onSubmit }: Props) => {
  const { collections } = useStores();
  const collection = collections.get(collectionId);
  invariant(collection, "Collection not found");
  const [name, setName] = useState(collection.name);
  const [icon, setIcon] = useState(collection.icon);
  const [color, setColor] = useState(collection.color || "#4E5C6E");
  const [sort, setSort] = useState<{
    field: string;
    direction: "asc" | "desc";
  }>(collection.sort);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToasts();
  const { t } = useTranslation();

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent<HTMLFormElement>) => {
      ev.preventDefault();
      setIsSaving(true);

      try {
        await collection.save({
          name,
          icon,
          color,
          sort,
        });
        onSubmit();
        showToast(t("The collection was updated"), {
          type: "success",
        });
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [collection, color, icon, name, onSubmit, showToast, sort, t]
  );

  const handleSortChange = (value: string) => {
    const [field, direction] = value.split(".");

    if (direction === "asc" || direction === "desc") {
      setSort({
        field,
        direction,
      });
    }
  };

  const handleNameChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setName(ev.target.value);
  };

  const handleChange = (color: string, icon: string) => {
    setColor(color);
    setIcon(icon);
  };

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <Text type="secondary">
          <Trans>
            You can edit the name and other details at any time, however doing
            so often might confuse your team mates.
          </Trans>
        </Text>
        <Flex gap={8}>
          <Input
            type="text"
            label={t("Name")}
            onChange={handleNameChange}
            maxLength={MAX_TITLE_LENGTH}
            value={name}
            required
            autoFocus
            flex
          />
          <IconPicker onChange={handleChange} color={color} icon={icon} />
        </Flex>
        <InputSelect
          label={t("Sort in sidebar")}
          options={[
            {
              label: t("Alphabetical sort"),
              value: "title.asc",
            },
            {
              label: t("Manual sort"),
              value: "index.asc",
            },
          ]}
          value={`${sort.field}.${sort.direction}`}
          onChange={handleSortChange}
          ariaLabel={t("Sort")}
        />
        <Button type="submit" disabled={isSaving || !collection.name}>
          {isSaving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </form>
    </Flex>
  );
};

export default observer(CollectionEdit);
