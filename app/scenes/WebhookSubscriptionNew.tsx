import * as React from "react";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { ReactHookWrappedInput } from "~/components/Input";
import Text from "~/components/Text";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  onSubmit: () => void;
};

interface FormData {
  name: string;
  url: string;
  events: string[];
}

const EventCheckboxLabel = styled.label`
  display: flex;
  align-items: center;

  padding: 0.5rem 0;

  &.group-label {
    font-weight: bold;
    font-size: 1.2em;
  }
`;

const EventCheckboxText = styled.span`
  margin-right: 0.5rem;
`;

const WEBHOOK_EVENTS = {
  users: [
    "users.create",
    "users.signin",
    "users.update",
    "users.suspend",
    "users.activate",
    "users.delete",
    "users.invite",
  ],
  documents: [
    "documents.create",
    "documents.publish",
    "documents.unpublish",
    "documents.delete",
    "documents.permanent_delete",
    "documents.archive",
    "documents.unarchive",
    "documents.restore",
    "documents.star",
    "documents.unstar",
    "documents.move",
    "documents.update",
    "documents.update.delayed",
    "documents.update.debounced",
    "documents.title_change",
  ],
  revisions: ["revisions.create"],
  fileOperations: [
    "file_operations.create",
    "file_operations.update",
    "file_operations.delete",
  ],
  collections: [
    "collections.create",
    "collections.update",
    "collections.delete",
    "collections.add_user",
    "collections.remove_user",
    "collections.add_group",
    "collections.remove_group",
    "collections.move",
    "collections.permission_changed",
  ],
  groups: [
    "groups.create",
    "groups.update",
    "groups.delete",
    "groups.add_user",
    "groups.remove_user",
  ],
  integrations: ["integrations.create", "integrations.update"],
  teams: ["teams.update"],
  pins: ["pins.create", "pins.update", "pins.delete"],
};

const FieldSet = styled.fieldset`
  border: none;

  &.disabled {
    opacity: 50%;
  }
`;

const AllFieldSet = styled(FieldSet)`
  padding-left: 0;

  display: grid;
  grid-template-columns: 1fr 1fr;

  &.mobile {
    grid-template-columns: 1fr;
  }
`;

const GroupWrapper = styled.div`
  padding: 2rem 0;

  &.mobile {
    padding: 1rem 0;
  }
`;

function joinClasses(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function WebhookSubscriptionNew({ onSubmit }: Props) {
  const { webhookSubscriptions } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();
  const {
    register,
    handleSubmit: formHandleSubmit,
    formState,
    watch,
    setValue,
  } = useForm<FormData>({ mode: "all", defaultValues: { events: [] } });

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        const events = Array.isArray(data.events) ? data.events : [data.events];

        const toSend = {
          ...data,
          events,
        };

        await webhookSubscriptions.create(toSend);
        showToast(
          t("Webhook subscription created", {
            type: "success",
          })
        );
        onSubmit();
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      }
    },
    [t, showToast, onSubmit, webhookSubscriptions]
  );

  const events = watch("events");
  const isAllEventSelected = events && events.includes("*");

  const isGroupAllSelected = useCallback(
    (group: string) => events && events.includes(group),
    [events]
  );

  const isMobile = useMobile();

  useEffect(() => {
    if (isAllEventSelected) {
      console.log("setting value to *");
      setValue("events", ["*"]);
    }
  }, [isAllEventSelected, setValue]);

  function EventCheckbox({ label, value }: { label: string; value: string }) {
    return (
      <EventCheckboxLabel
        className={
          Object.keys(WEBHOOK_EVENTS).includes(value) ? "group-label" : ""
        }
      >
        <EventCheckboxText>{label}</EventCheckboxText>
        <input type="checkbox" value={value} {...register("events", {})} />
      </EventCheckboxLabel>
    );
  }

  return (
    <form onSubmit={formHandleSubmit(handleSubmit)}>
      <Text type="secondary">
        <Trans>Select the events you need and name this webhook</Trans>
      </Text>
      <Flex column={true}>
        <ReactHookWrappedInput
          required
          autoFocus
          flex
          label="Name"
          {...register("name", { required: true })}
        />
        <ReactHookWrappedInput
          required
          autoFocus
          flex
          label="URL"
          {...register("url", { required: true })}
        />
      </Flex>
      <EventCheckbox label={t("All events")} value="*" />
      <AllFieldSet
        disabled={isAllEventSelected}
        className={joinClasses(
          isAllEventSelected && "disabled",
          isMobile && "mobile"
        )}
      >
        {Object.entries(WEBHOOK_EVENTS).map(([group, events], i) => (
          <GroupWrapper key={i} className={joinClasses(isMobile && "mobile")}>
            <EventCheckbox label={t(`All ${group} Events`)} value={group} />
            <FieldSet
              className={isGroupAllSelected(group) ? "disabled" : ""}
              disabled={isGroupAllSelected(group)}
            >
              {events.map((event) => (
                <EventCheckbox label={event} value={event} />
              ))}
            </FieldSet>
          </GroupWrapper>
        ))}
      </AllFieldSet>
      <Button
        type="submit"
        disabled={formState.isSubmitting || !formState.isValid}
      >
        {formState.isSubmitting ? "Creating…" : "Create"}
      </Button>
    </form>
  );
}

export default WebhookSubscriptionNew;
