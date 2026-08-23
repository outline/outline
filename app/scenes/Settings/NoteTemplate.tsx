import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";
import type { DocumentTemplate as Template } from "../../../src/mocks/shop";
interface Props {
  /** Which of the two printable documents this page edits. */
  type: Template["type"];
  /** Heading for the page. */
  title: string;
  /** Short line under the heading. */
  description: string;
}
const Preview = styled.div`
  margin-top: 8px;
  padding: 16px;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  background: ${s("backgroundSecondary")};
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.6;
`;
/**
 * Editing one of the printable notes.
 *
 * The preview is the point: these are pieces of paper a customer ends up
 * holding, so the wording is shown as it will print rather than described.
 *
 * @returns the rendered template settings page.
 */
export function NoteTemplateSettings({ type, title, description }: Props) {
  const { t } = useTranslation();
  const fetchAll = useShop((state) => state.fetchAll);
  const templates = useShop((state) => state.noteTemplates);
  const saveNoteTemplate = useShop((state) => state.saveNoteTemplate);
  const template = templates.find((item) => item.type === type);
  const [draft, setDraft] = useState<Template | undefined>(template);
  const [notice, setNotice] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);
  // Adopt the stored template once it arrives, but never overwrite edits in
  // progress – fetchAll runs again after every save.
  useEffect(() => {
    setDraft((current) => current ?? template);
  }, [template]);
  if (!draft) {
    return (
      <Scene title={title}>
        <Heading>{title}</Heading>
        <Empty>{t("Loading…")}</Empty>
      </Scene>
    );
  }
  const set = (changes: Partial<Template>) =>
    setDraft({ ...draft, ...changes });
  const handleSave = async () => {
    setNotice(undefined);
    setIsSaving(true);
    try {
      const result = await saveNoteTemplate(draft);
      setNotice(
        result?.saved
          ? t("Saved.")
          : t("Give the document a title before saving.")
      );
    } finally {
      setIsSaving(false);
    }
  };
  const previewLines = [
    draft.showLogo ? "[ Acme Pet Care ]" : undefined,
    draft.showBranch ? t("Kemang branch") : undefined,
    "",
    draft.title,
    "",
    draft.header,
    draft.body ? `\n${draft.body}` : undefined,
    "",
    draft.showStaff ? `${t("Served by")} Sinta Wijaya` : undefined,
    draft.footer,
  ].filter((line) => line !== undefined);
  return (
    <Scene title={title}>
      <Heading>{title}</Heading>
      <Text as="p" type="secondary">
        {description}
      </Text>

      {notice ? (
        <Text as="p" type="secondary" data-testid="template-notice">
          {notice}
        </Text>
      ) : null}

      <Input
        label={t("Title")}
        value={draft.title}
        onChange={(event) => set({ title: event.target.value })}
      />
      <Input
        label={t("Opening line")}
        value={draft.header}
        onChange={(event) => set({ header: event.target.value })}
      />
      <Input
        type="textarea"
        label={t("Body")}
        value={draft.body}
        onChange={(event) => set({ body: event.target.value })}
        rows={3}
      />
      <Input
        label={t("Closing line")}
        value={draft.footer}
        onChange={(event) => set({ footer: event.target.value })}
      />

      <Switch
        label={t("Show the shop name")}
        checked={draft.showLogo}
        onChange={(checked) => set({ showLogo: checked })}
      />
      <Switch
        label={t("Show the branch")}
        checked={draft.showBranch}
        onChange={(checked) => set({ showBranch: checked })}
      />
      <Switch
        label={t("Show who served them")}
        checked={draft.showStaff}
        onChange={(checked) => set({ showStaff: checked })}
      />

      <Text as="p" weight="bold" style={{ marginTop: 16 }}>
        {t("Preview")}
      </Text>
      <Preview data-testid="template-preview">
        {previewLines.join("\n")}
      </Preview>

      <Flex gap={8} style={{ paddingTop: 16 }}>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? t("Saving…") : t("Save")}
        </Button>
      </Flex>
    </Scene>
  );
}
