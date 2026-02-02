import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { toast } from "sonner";
import type Collection from "~/models/Collection";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Text from "~/components/Text";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { MultiInputSelect } from "~/components/MultiInputSelect";
import { s } from "@shared/styles";

type Props = {
  initialCollection?: Collection;
  onSubmit: () => void;
};



function CollectionMergeDialog({ initialCollection, onSubmit }: Props) {
  const { collections } = useStores();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const [selectedCollectionIds, setSelectedCollectionIds] = React.useState<
    string[]
  >(initialCollection ? [initialCollection.id] : []);
  const [newCollectionName, setNewCollectionName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const availableCollections = React.useMemo(() => {
    return collections.orderedData.filter(
      (col) => col.isActive
    );
  }, [collections.orderedData]);

  const handleToggleCollection = (collectionId: string) => {
    setSelectedCollectionIds((prev) => {
      if (prev.includes(collectionId)) {
        return prev.filter((id) => id !== collectionId);
      } else {
        return [...prev, collectionId];
      }
    });
  };

  const handleSubmit = async () => {
    if (selectedCollectionIds.length < 2) {
      toast.error(t("Please select at least 2 collections to merge"));
      return;
    }

    if (!newCollectionName.trim()) {
      toast.error(t("Please enter a name for the merged collection"));
      return;
    }

    setIsSubmitting(true);
    try {
      await client.post("/collections.mergeRequest", {
        sourceCollectionIds: selectedCollectionIds,
        newCollectionName: newCollectionName.trim(),
      });

      toast.success(t("Merge request created. Waiting for owner approvals."));
      onSubmit();
    } catch (err: any) {
      toast.error(err?.message || t("Failed to create merge request"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Flex column gap={16}>
      <Text as="p" type="secondary">
        {t(
          "Select collections to merge. All documents and memberships will be preserved."
        )}
      </Text>

      <div>
        <Heading as="h3">{t("Collections to merge")}</Heading>
        <MultiInputSelect
          options={availableCollections.map((c) => ({
            type: "item" as const,
            label: c.name,
            value: c.id,
            icon: c.icon,
            color: c.color,
          }))}
          value={selectedCollectionIds}
          onChange={setSelectedCollectionIds}
          label={t("Collections to merge")}
          hideLabel
          emptyLabel={t("Select collections...")}
          selectedLabel={(count) =>
            t("{{count}} collections selected", { count })
          }
          renderOption={(option: any) => (
            <Flex align="center" gap={8}>
              <CollectionIcon
                collection={{
                  color: option.color,
                  icon: option.icon,
                } as any}
                size={20}
              />
              <span>{option.label}</span>
            </Flex>
          )}
          searchable
        />
        {availableCollections.length === 0 && (
          <Text type="secondary">{t("No collections available")}</Text>
        )}
      </div>

      <div>
        <Heading as="h3">{t("New collection name")}</Heading>
        <Input
          value={newCollectionName}
          onChange={(e) => setNewCollectionName(e.target.value)}
          placeholder={t("Enter name for merged collection")}
          autoFocus
        />
      </div>

      {selectedCollectionIds.length >= 2 && (
        <Text type="secondary" size="small">
          {selectedCollectionIds.every(
            (id) =>
              availableCollections.find((c) => c.id === id)?.createdBy?.id ===
              user.id
          )
            ? t(
              "You are the owner of all selected collections. The merge will be performed immediately upon confirmation."
            )
            : t(
              "Some collections belong to other owners. A merge request will be sent which they must approve."
            )}
        </Text>
      )}

      <Flex justify="flex-end" gap={8}>
        <Button onClick={onSubmit} neutral>
          {t("Cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            selectedCollectionIds.length < 2 ||
            !newCollectionName.trim()
          }
        >
          {isSubmitting ? `${t("Creating")}…` : t("Create merge request")}
        </Button>
      </Flex>
    </Flex>
  );
}

export default observer(CollectionMergeDialog);
