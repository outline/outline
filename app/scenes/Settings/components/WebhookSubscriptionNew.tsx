import { isEqual } from "lodash";
import * as React from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import Button from "~/components/Button";
import { ReactHookWrappedInput } from "~/components/Input";
import Text from "~/components/Text";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

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
  webhookSubscriptions: [
    "webhook_subscriptions.create",
    "webhook_subscriptions.delete",
  ],
};

const EventCheckboxLabel = styled.label`
  display: flex;
  align-items: center;

  padding: 0.5rem 0;

  &.group-label {
    font-weight: bold;
    font-size: 1.2em;
  }

  &.all-label {
    font-weight: bold;
    font-size: 2em;
    padding-bottom: 1em;
  }
`;

const EventCheckboxText = styled.span`
  margin-right: 0.5rem;
`;

const FieldSet = styled.fieldset`
  padding-left: 0;
  border: none;

  &.disabled {
    opacity: 50%;
  }
`;

const GroupGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;

  &.mobile {
    grid-template-columns: 1fr;
  }
`;

const GroupWrapper = styled.div`
  padding-bottom: 2rem;

  &.mobile {
    padding-bottom: 1rem;
  }
`;

const TextFields = styled.div`
  display: flex;
  flex-direction: column;

  margin-bottom: 2rem;
`;

type Props = {
  onSubmit: () => void;
};

interface FormData {
  name: string;
  url: string;
  events: string[];
}

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
  const selectedGroups = events.filter((e) => !e.includes("."));
  const isAllEventSelected = events.includes("*");
  const filteredEvents = events.filter((e) => {
    const [beforePeriod] = e.split(".");

    return (
      selectedGroups.length === 0 ||
      e === beforePeriod ||
      !selectedGroups.includes(beforePeriod)
    );
  });

  const isMobile = useMobile();

  useEffect(() => {
    if (isAllEventSelected) {
      setValue("events", ["*"]);
    }
  }, [isAllEventSelected, setValue]);

  useEffect(() => {
    if (!isEqual(events, filteredEvents)) {
      setValue("events", filteredEvents);
    }
  }, [events, filteredEvents, setValue]);

  function EventCheckbox({ label, value }: { label: string; value: string }) {
    return (
      <EventCheckboxLabel
        className={joinClasses(
          value === "*" && "all-label",
          value !== "*" &&
            Object.keys(WEBHOOK_EVENTS).includes(value) &&
            "group-label"
        )}
      >
        <EventCheckboxText>{label}</EventCheckboxText>
        <input
          type="checkbox"
          defaultValue={value}
          {...register("events", {})}
        />
      </EventCheckboxLabel>
    );
  }

  return (
    <form onSubmit={formHandleSubmit(handleSubmit)}>
      <Text type="secondary">
        <Trans>
          Provide a descriptive name for this webhook and provide the URL we
          should send a POST request to when matching events come in.
        </Trans>
      </Text>
      <Text type="secondary">
        <Trans>
          You can subscribe to specific events with the checkboxes below. You
          can subscribe to all events, subscribe to groups or individual event
          types.
        </Trans>
      </Text>
      <TextFields>
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
      </TextFields>

      <EventCheckbox label={t("All events")} value="*" />

      <FieldSet
        disabled={isAllEventSelected}
        className={joinClasses(isAllEventSelected && "disabled")}
      >
        <GroupGrid className={joinClasses(isMobile && "mobile")}>
          {Object.entries(WEBHOOK_EVENTS).map(([group, events], i) => (
            <GroupWrapper key={i} className={joinClasses(isMobile && "mobile")}>
              <EventCheckbox label={t(`All ${group} Events`)} value={group} />
              <FieldSet
                className={selectedGroups.includes(group) ? "disabled" : ""}
                disabled={selectedGroups.includes(group)}
              >
                {events.map((event, i) => (
                  <EventCheckbox label={event} value={event} key={i} />
                ))}
              </FieldSet>
            </GroupWrapper>
          ))}
        </GroupGrid>
      </FieldSet>
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
