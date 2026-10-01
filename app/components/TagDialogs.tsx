import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { errToString } from "@shared/utils/error";
import { TagValidation } from "@shared/validations";
import { normalizeTagName } from "@shared/utils/TagHelper";
import type Tag from "~/models/Tag";
import Button from "~/components/Button";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import IconColorPicker from "~/components/IconPicker/components/IconColorPicker";
import Input from "~/components/Input";
import { InputSelect } from "~/components/InputSelect";
import useStores from "~/hooks/useStores";
import { validateTagName } from "~/utils/tagInput";
import { mergeTargetOptions } from "~/utils/tags";

type Props = {
  /** The tag being changed. */
  tag: Tag;
  /** Callback invoked once the change is saved. */
  onSubmit: () => void;
};

/**
 * Dialog to rename a tag.
 */
export const TagRenameDialog = observer(function TagRenameDialog({
  tag,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const { tags } = useStores();
  const [name, setName] = React.useState(tag.name);
  const error = validateTagName(name);
  const errorMessage =
    error === "invalid"
      ? t(
          "Tags must include a letter or number and can only contain letters, numbers, hyphens and underscores"
        )
      : error === "tooLong"
        ? t("Tags can be at most {{ max }} characters", {
            max: TagValidation.maxNameLength,
          })
        : undefined;
  const unchanged = normalizeTagName(name) === tag.name;

  const handleSubmit = async () => {
    await tags.update({ id: tag.id, name: normalizeTagName(name) });
    onSubmit();
    toast.success(t("Tag renamed"));
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Rename")}
      savingText={`${t("Saving")}…`}
      disabled={!!error || unchanged}
    >
      <Input
        type="text"
        label={t("Name")}
        value={name}
        onChange={(ev) => setName(ev.target.value)}
        maxLength={TagValidation.maxNameLength}
        error={errorMessage}
        required
        autoFocus
        flex
      />
    </ConfirmationDialog>
  );
});

/**
 * Dialog to change or remove the color of a tag.
 */
export const TagColorDialog = observer(function TagColorDialog({
  tag,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const { tags } = useStores();
  const [color, setColor] = React.useState<string | null>(tag.color ?? null);
  const [isSaving, setIsSaving] = React.useState(false);

  const save = async (value: string | null) => {
    setIsSaving(true);
    try {
      await tags.update({ id: tag.id, color: value });
      onSubmit();
      toast.success(t("Tag color updated"));
    } catch (err) {
      toast.error(errToString(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Flex gap={12} column>
      <ColorPickerWrapper>
        <IconColorPicker
          width={0}
          activeColor={color ?? ""}
          onSelect={setColor}
        />
      </ColorPickerWrapper>
      <Flex justify="flex-end" gap={8}>
        {tag.color && (
          <Button onClick={() => void save(null)} disabled={isSaving} neutral>
            {t("Remove color")}
          </Button>
        )}
        <Button
          onClick={() => void save(color)}
          disabled={isSaving || !color || color === tag.color}
        >
          {isSaving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </Flex>
    </Flex>
  );
});

/**
 * Dialog to merge a tag into another one, stating how many documents move.
 */
export const TagMergeDialog = observer(function TagMergeDialog({
  tag,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const { tags } = useStores();
  const [targetId, setTargetId] = React.useState<string>();
  const options = mergeTargetOptions(tags.orderedData, tag.id).map(
    (target) => ({
      type: "item" as const,
      label: `#${target.name}`,
      value: target.id,
    })
  );
  const target = targetId ? tags.get(targetId) : undefined;

  const handleSubmit = async () => {
    if (!targetId) {
      return false;
    }
    await tags.merge(tag.id, targetId);
    onSubmit();
    toast.success(t("Tags merged"));
    return undefined;
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Merge")}
      savingText={`${t("Merging")}…`}
      disabled={!targetId}
      danger
    >
      <Flex gap={12} column>
        <InputSelect
          label={t("Merge into")}
          placeholder={t("Select a tag")}
          options={options}
          value={targetId}
          onChange={setTargetId}
        />
        <span>
          {target ? (
            <Trans
              defaults="At least {{ count }} document you can access tagged <em>#{{ source }}</em> will be tagged <em>#{{ target }}</em> instead, and <em>#{{ source }}</em> will be deleted."
              count={tag.documentCount}
              values={{
                source: tag.name,
                target: target.name,
              }}
              components={{ em: <strong /> }}
            />
          ) : (
            t("Choose the tag to merge #{{ name }} into.", { name: tag.name })
          )}
        </span>
      </Flex>
    </ConfirmationDialog>
  );
});

/**
 * Dialog confirming deletion of a tag, stating how many documents lose it.
 */
export const TagDeleteDialog = observer(function TagDeleteDialog({
  tag,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const { tags } = useStores();

  const handleSubmit = async () => {
    await tags.delete(tag);
    onSubmit();
    toast.success(t("Tag deleted"));
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("I’m sure – Delete")}
      savingText={`${t("Deleting")}…`}
      danger
    >
      <Trans
        defaults="Are you sure you want to delete <em>#{{ name }}</em>? It will be removed from at least {{ count }} document you can access."
        count={tag.documentCount}
        values={{ name: tag.name }}
        components={{ em: <strong /> }}
      />
    </ConfirmationDialog>
  );
});

const ColorPickerWrapper = styled.div`
  overflow-x: auto;
`;
