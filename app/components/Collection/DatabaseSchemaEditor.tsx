import { observer } from "mobx-react";
import { CloseIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { v4 as uuidv4 } from "uuid";
import { s } from "@shared/styles";
import type { Property, PropertyConfig, PropertyOption } from "@shared/types";
import { PropertyType, RollupAggregation } from "@shared/types";
import { errToString } from "@shared/utils/error";
import { PropertyValidation } from "@shared/validations";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import { InputSelect } from "~/components/InputSelect";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";

type Props = {
  /** The collection whose data schema to edit. */
  collectionId: string;
  /** Callback when the schema has been saved. */
  onSubmit: () => void;
};

const typeLabels: Record<PropertyType, string> = {
  [PropertyType.Text]: "Text",
  [PropertyType.Number]: "Number",
  [PropertyType.Select]: "Select",
  [PropertyType.MultiSelect]: "Multi-select",
  [PropertyType.Checkbox]: "Checkbox",
  [PropertyType.Date]: "Date",
  [PropertyType.Url]: "URL",
  [PropertyType.Person]: "Person",
  [PropertyType.Relation]: "Relation",
  [PropertyType.Rollup]: "Rollup",
};

const aggregationLabels: Record<RollupAggregation, string> = {
  [RollupAggregation.Count]: "Count",
  [RollupAggregation.Sum]: "Sum",
  [RollupAggregation.Avg]: "Average",
  [RollupAggregation.Min]: "Min",
  [RollupAggregation.Max]: "Max",
};

/**
 * A dialog for defining the typed property schema that turns a collection
 * into a database. Properties keep stable ids across renames so existing
 * document values are preserved.
 */
function DatabaseSchemaEditor({ collectionId, onSubmit }: Props) {
  const { t } = useTranslation();
  const { collections } = useStores();
  const collection = collections.get(collectionId);

  const [draft, setDraft] = React.useState<Property[]>(() =>
    (collection?.dataSchema ?? []).map((property) => ({
      ...property,
      options: property.options?.map((option) => ({ ...option })),
    }))
  );
  const [isSaving, setIsSaving] = React.useState(false);

  const updateProperty = (index: number, updates: Partial<Property>) => {
    setDraft((current) =>
      current.map((property, i) =>
        i === index ? { ...property, ...updates } : property
      )
    );
  };

  const handleAdd = () => {
    setDraft((current) => [
      ...current,
      {
        id: uuidv4(),
        name: "",
        type: PropertyType.Text,
      },
    ]);
  };

  const handleRemove = (index: number) => {
    setDraft((current) => current.filter((_, i) => i !== index));
  };

  const handleTypeChange = (index: number, value: string) => {
    const type = Object.values(PropertyType).find((item) => item === value);
    if (!type) {
      return;
    }
    const supportsOptions =
      type === PropertyType.Select || type === PropertyType.MultiSelect;
    updateProperty(index, {
      type,
      options: supportsOptions ? (draft[index].options ?? []) : undefined,
      config:
        type === PropertyType.Relation
          ? draft[index].config
          : type === PropertyType.Rollup
            ? { rollupAggregation: RollupAggregation.Count }
            : undefined,
    });
  };

  const updateConfig = (index: number, updates: Partial<PropertyConfig>) => {
    updateProperty(index, {
      config: { ...draft[index].config, ...updates },
    });
  };

  const handleTargetCollectionChange = (index: number, value: string) => {
    updateProperty(index, {
      config: value === "" ? undefined : { targetCollectionId: value },
    });
  };

  const handleOptionsChange = (index: number, value: string) => {
    const existing = draft[index].options ?? [];
    const names = value
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const options: PropertyOption[] = [];

    for (const name of names) {
      const normalized = name.toLowerCase();
      if (seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      // keep the existing option id when renaming case or reordering, so
      // stored document values remain valid.
      const match = existing.find(
        (option) => option.name.trim().toLowerCase() === normalized
      );
      options.push(match ? { ...match, name } : { id: uuidv4(), name });
    }

    updateProperty(index, { options });
  };

  const handleSave = async () => {
    if (!collection) {
      return;
    }
    setIsSaving(true);
    try {
      await collection.save({
        dataSchema: draft.map((property) => ({
          ...property,
          name: property.name.trim(),
        })),
      });
      toast.success(t("Settings saved"));
      onSubmit();
    } catch (error) {
      toast.error(errToString(error));
    } finally {
      setIsSaving(false);
    }
  };

  const isValid =
    draft.every((property) => property.name.trim() !== "") &&
    new Set(draft.map((property) => property.name.trim().toLowerCase()))
      .size === draft.length &&
    draft.every(
      (property) =>
        property.type !== PropertyType.Rollup ||
        (!!property.config?.relationPropertyId &&
          (property.config.rollupAggregation === RollupAggregation.Count ||
            !!property.config.rollupPropertyId))
    );

  return (
    <Flex column gap={12}>
      <Text as="p" type="secondary">
        {t(
          "Properties defined here appear on every document in the collection and can be used to filter and sort database views."
        )}
      </Text>

      {draft.map((property, index) => {
        const supportsOptions =
          property.type === PropertyType.Select ||
          property.type === PropertyType.MultiSelect;
        const isRelation = property.type === PropertyType.Relation;
        const isRollup = property.type === PropertyType.Rollup;
        const relationProperties = draft.filter(
          (item) => item.type === PropertyType.Relation
        );
        const rollupRelation = relationProperties.find(
          (item) => item.id === property.config?.relationPropertyId
        );
        const rollupTargetSchema = rollupRelation?.config?.targetCollectionId
          ? (collections.get(rollupRelation.config.targetCollectionId)
              ?.dataSchema ?? [])
          : [];
        const rollupNumberProperties = rollupTargetSchema.filter(
          (item) => item.type === PropertyType.Number
        );

        return (
          <PropertyRow key={property.id} column gap={6}>
            <Flex align="center" gap={8}>
              <NameInput
                value={property.name}
                placeholder={t("Property name")}
                maxLength={PropertyValidation.maxNameLength}
                onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                  updateProperty(index, { name: ev.target.value })
                }
                margin={0}
              />
              <InputSelect
                options={Object.values(PropertyType).map((type) => ({
                  type: "item" as const,
                  label: t(typeLabels[type]),
                  value: type,
                }))}
                value={property.type}
                onChange={(value) => handleTypeChange(index, value)}
                label={t("Type")}
                labelHidden
                short
              />
              <NudeButton
                type="button"
                onClick={() => handleRemove(index)}
                aria-label={t("Remove")}
              >
                <CloseIcon size={18} />
              </NudeButton>
            </Flex>
            {isRelation && (
              <InputSelect
                options={[
                  {
                    type: "item" as const,
                    label: t("Any collection"),
                    value: "",
                  },
                  ...collections.orderedData.map((item) => ({
                    type: "item" as const,
                    label: item.name,
                    value: item.id,
                  })),
                ]}
                value={property.config?.targetCollectionId ?? ""}
                onChange={(value) => handleTargetCollectionChange(index, value)}
                label={t("Related collection")}
                labelHidden
                short
              />
            )}
            {isRollup && (
              <Flex align="center" gap={8}>
                <InputSelect
                  options={relationProperties.map((item) => ({
                    type: "item" as const,
                    label: item.name || t("Untitled"),
                    value: item.id,
                  }))}
                  value={property.config?.relationPropertyId ?? null}
                  onChange={(value) =>
                    updateConfig(index, { relationPropertyId: value })
                  }
                  label={t("Relation property")}
                  labelHidden
                  short
                />
                <InputSelect
                  options={Object.values(RollupAggregation)
                    .filter(
                      (aggregation) =>
                        aggregation === RollupAggregation.Count ||
                        rollupNumberProperties.length > 0
                    )
                    .map((aggregation) => ({
                      type: "item" as const,
                      label: t(aggregationLabels[aggregation]),
                      value: aggregation,
                    }))}
                  value={
                    property.config?.rollupAggregation ??
                    RollupAggregation.Count
                  }
                  onChange={(value) =>
                    updateConfig(index, {
                      rollupAggregation: value as RollupAggregation,
                    })
                  }
                  label={t("Aggregation")}
                  labelHidden
                  short
                />
                {property.config?.rollupAggregation !==
                  RollupAggregation.Count && (
                  <InputSelect
                    options={rollupNumberProperties.map((item) => ({
                      type: "item" as const,
                      label: item.name,
                      value: item.id,
                    }))}
                    value={property.config?.rollupPropertyId ?? null}
                    onChange={(value) =>
                      updateConfig(index, { rollupPropertyId: value })
                    }
                    label={t("Property to aggregate")}
                    labelHidden
                    short
                  />
                )}
              </Flex>
            )}
            {supportsOptions && (
              <OptionsInput
                defaultValue={(property.options ?? [])
                  .map((option) => option.name)
                  .join(", ")}
                placeholder={t("Options, separated by commas")}
                onBlur={(ev: React.FocusEvent<HTMLInputElement>) =>
                  handleOptionsChange(index, ev.target.value)
                }
                margin={0}
              />
            )}
          </PropertyRow>
        );
      })}

      <div>
        <Button type="button" onClick={handleAdd} icon={<PlusIcon />} neutral>
          {t("Add property")}
        </Button>
      </div>

      <Flex justify="flex-end">
        <Button type="button" onClick={handleSave} disabled={!isValid}>
          {isSaving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </Flex>
    </Flex>
  );
}

const PropertyRow = styled(Flex)`
  border: 1px solid ${s("inputBorder")};
  border-radius: 8px;
  padding: 8px;
`;

const NameInput = styled(Input)`
  flex-grow: 1;
`;

const OptionsInput = styled(Input)`
  width: 100%;
`;

export default observer(DatabaseSchemaEditor);
