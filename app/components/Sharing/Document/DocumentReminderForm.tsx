import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import type Document from "~/models/Document";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Labeled from "~/components/Labeled";
import Modal from "~/components/Modal";
import { InputSelect } from "~/components/InputSelect";
import type { Option } from "~/components/InputSelect";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import type { DocumentReminder } from "~/stores/DocumentRemindersStore";
import UserSelect from "~/components/UserSelect";

type Props = {
  document: Document;
  reminder?: DocumentReminder | null;
  onRequestClose: () => void;
  onSuccess: () => void;
};

function DocumentReminderForm({
  document,
  reminder,
  onRequestClose,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const { documentReminders, users } = useStores();
  const [editorId, setEditorId] = React.useState<string>(
    reminder?.editorId || ""
  );
  const [message, setMessage] = React.useState<string>(
    reminder?.message || ""
  );
  const [intervalDays, setIntervalDays] = React.useState<number | null>(
    reminder?.intervalDays || null
  );
  const [isActive, setIsActive] = React.useState<boolean>(
    reminder?.isActive ?? true
  );

  // Get available editors (users with access to document, excluding owner)
  const availableEditors = React.useMemo(
    () => document.members.filter((member) => member.id !== user.id),
    [document.members, user.id]
  );

  const { loading, request: handleSubmit } = useRequest(
    React.useCallback(async () => {
      if (!editorId) {
        toast.error(t("Select editor"));
        return;
      }

      try {
        if (reminder) {
          await documentReminders.update({
            id: reminder.id,
            message: message || undefined,
            isActive,
            intervalDays,
          });
          toast.success(t("Reminder updated"));
        } else {
          await documentReminders.create({
            documentId: document.id,
            editorId,
            message: message || undefined,
            intervalDays,
          });
          toast.success(t("Reminder created"));
        }
        onSuccess();
      } catch (_error) {
        toast.error(
          reminder
            ? t("Could not update reminder")
            : t("Could not create reminder")
        );
      }
    }, [
      documentReminders,
      document.id,
      editorId,
      message,
      intervalDays,
      isActive,
      reminder,
      onSuccess,
      t,
    ])
  );

  const intervalOptions: Option[] = React.useMemo(
    () => [
      { type: "item" as const, label: t("Once"), value: "null" },
      { type: "item" as const, label: t("Every day"), value: "1" },
      { type: "item" as const, label: t("Every week"), value: "7" },
      { type: "item" as const, label: t("Every month"), value: "30" },
    ],
    [t]
  );

  return (
    <Modal
      isOpen
      title={reminder ? t("Edit reminder") : t("Create reminder")}
      onRequestClose={onRequestClose}
    >
      <Form>
        <Labeled label={t("Editor")}>
          {reminder ? (
            <Text>
              {users.get(reminder.editorId)?.name || reminder.editor.name}
            </Text>
          ) : (
            <UserSelect
              value={editorId}
              onChange={setEditorId}
              users={availableEditors}
              placeholder={t("Select editor")}
            />
          )}
        </Labeled>

        <Labeled label={t("Message")} optional>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("Optional message for the editor")}
            maxLength={1000}
            autoFocus
          />
        </Labeled>

        <Labeled label={t("Repeat")}>
          <InputSelect
            value={
              intervalDays === null ? "null" : intervalDays?.toString() || "null"
            }
            onChange={(value) =>
              setIntervalDays(value === "null" ? null : parseInt(value, 10))
            }
            options={intervalOptions}
            label=""
            hideLabel
          />
        </Labeled>

        {reminder && (
          <Labeled label={t("Status")}>
            <Flex align="center" gap={8}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <Text size="small">{t("Active")}</Text>
            </Flex>
          </Labeled>
        )}

        <Actions>
          <Button onClick={onRequestClose} neutral>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !editorId}>
            {reminder ? t("Save") : t("Create")}
          </Button>
        </Actions>
      </Form>
    </Modal>
  );
}

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
`;

const Actions = styled(Flex)`
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
`;

export default observer(DocumentReminderForm);
