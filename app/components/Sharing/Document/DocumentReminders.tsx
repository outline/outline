import { observer } from "mobx-react";
import { ClockIcon, TrashIcon, EditIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import type Document from "~/models/Document";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Modal from "~/components/Modal";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import Time from "~/components/Time";
import { Separator } from "../components";
import { ListItem } from "../components/ListItem";
import DocumentReminderForm from "./DocumentReminderForm";

type Props = {
  document: Document;
};

function DocumentReminders({ document }: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const can = usePolicy(document);
  const { documentReminders, users } = useStores();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingReminder, setEditingReminder] = React.useState<
    string | null
  >(null);

  // Only show for document owner
  const isOwner = document.createdBy?.id === user.id;

  const { loading, request: fetchReminders } = useRequest(
    React.useCallback(
      () => documentReminders.fetchReminders(document.id),
      [documentReminders, document.id]
    )
  );

  React.useEffect(() => {
    if (isOwner) {
      void fetchReminders();
    }
  }, [isOwner, fetchReminders]);

  const reminders = documentReminders.getReminders(document.id);

  const handleDelete = React.useCallback(
    async (reminderId: string) => {
      try {
        await documentReminders.delete(reminderId);
        toast.success(t("Reminder deleted"));
      } catch (err) {
        toast.error(t("Failed to delete reminder"));
      }
    },
    [documentReminders, t]
  );

  const handleEdit = React.useCallback((reminderId: string) => {
    setEditingReminder(reminderId);
    setIsFormOpen(true);
  }, []);

  const handleCreate = React.useCallback(() => {
    setEditingReminder(null);
    setIsFormOpen(true);
  }, []);

  const handleFormClose = React.useCallback(() => {
    setIsFormOpen(false);
    setEditingReminder(null);
  }, []);

  const handleFormSuccess = React.useCallback(() => {
    setIsFormOpen(false);
    setEditingReminder(null);
    void fetchReminders();
  }, [fetchReminders]);

  if (!isOwner) {
    return null;
  }

  if (loading) {
    return null;
  }

  const editingReminderData = editingReminder
    ? reminders.find((r) => r.id === editingReminder)
    : null;

  return (
    <>
      <Separator />
      <Section>
        <SectionHeader>
          <Flex align="center" gap={8}>
            <ClockIcon size={18} />
            <Text weight="bold" size="small">
              {t("Reminders")}
            </Text>
          </Flex>
          <Button onClick={handleCreate} neutral small>
            {t("Add")}
          </Button>
        </SectionHeader>

        {reminders.length === 0 ? (
          <EmptyState>
            <Text type="secondary" size="small">
              {t("No active reminders")}
            </Text>
          </EmptyState>
        ) : (
          <RemindersList>
            {reminders.map((reminder) => {
              const editor = users.get(reminder.editorId);
              if (!editor) {
                return null;
              }

              return (
                <ListItem
                  key={reminder.id}
                  image={<Avatar model={editor} size={AvatarSize.Medium} />}
                  title={editor.name}
                  subtitle={
                    <Flex column gap={4}>
                      {reminder.message && (
                        <Text type="secondary" size="small">
                          {reminder.message}
                        </Text>
                      )}
                      <Flex align="center" gap={8}>
                        {reminder.isActive ? (
                          <Text type="secondary" size="xsmall">
                            {reminder.intervalDays
                              ? t("Repeats every {{ days }} days", {
                                days: reminder.intervalDays,
                              })
                              : t("Once")}
                          </Text>
                        ) : (
                          <Text type="secondary" size="xsmall">
                            {t("Inactive")}
                          </Text>
                        )}
                        {reminder.nextSendAt && (
                          <>
                            <Text type="tertiary" size="xsmall">
                              •
                            </Text>
                            <Text type="secondary" size="xsmall">
                              {t("Next")}{" "}
                              <Time dateTime={reminder.nextSendAt} />
                            </Text>
                          </>
                        )}
                      </Flex>
                    </Flex>
                  }
                  actions={
                    <Flex align="center" gap={4}>
                      <NudeButton
                        onClick={() => handleEdit(reminder.id)}
                        tooltip={{ content: t("Edit") }}
                      >
                        <EditIcon size={16} />
                      </NudeButton>
                      <NudeButton
                        onClick={() => handleDelete(reminder.id)}
                        tooltip={{ content: t("Delete") }}
                      >
                        <TrashIcon size={16} />
                      </NudeButton>
                    </Flex>
                  }
                />
              );
            })}
          </RemindersList>
        )}
      </Section>

      {isFormOpen && (
        <DocumentReminderForm
          document={document}
          reminder={editingReminderData}
          onRequestClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  );
}

const Section = styled.div`
  padding: 12px 0;
`;

const SectionHeader = styled(Flex)`
  justify-content: space-between;
  align-items: center;
  padding: 0 24px 12px;
`;

const EmptyState = styled.div`
  padding: 12px 24px;
  text-align: center;
`;

const RemindersList = styled.div`
  padding: 0 24px;
`;

export default observer(DocumentReminders);
