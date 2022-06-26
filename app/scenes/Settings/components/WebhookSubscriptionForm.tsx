import { isEqual, filter, includes } from "lodash";
import * as React from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import WebhookSubscription from "~/models/WebhookSubscription";
import Button from "~/components/Button";
import { ReactHookWrappedInput } from "~/components/Input";
import Text from "~/components/Text";
import useMobile from "~/hooks/useMobile";

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
    "webhook_subscriptions.update",
  ],
};

const EventCheckboxLabel = styled.label`
  display: flex;
  align-items: center;

  padding: 0.5rem 0;
`;

const GroupEventCheckboxLabel = styled(EventCheckboxLabel)`
  font-weight: bold;
  font-size: 1.2em;
`;

const AllEventCheckboxLabel = styled(EventCheckboxLabel)`
  font-weight: bold;
  font-size: 2em;
  padding-bottom: 1em;
`;

const EventCheckboxText = styled.span`
  margin-left: 0.5rem;
`;

interface FieldProps {
  disabled?: boolean;
}
const FieldSet = styled.fieldset<FieldProps>`
  padding-left: 0;
  border: none;

  ${({ disabled }) =>
    disabled &&
    `
    opacity: 0.5;
    `}
`;

interface MobileProps {
  isMobile?: boolean;
}
const GroupGrid = styled.div<MobileProps>`
  display: grid;
  grid-template-columns: 1fr 1fr;

  ${({ isMobile }) =>
    isMobile &&
    `
    grid-template-columns: 1fr;
    `}
`;

const GroupWrapper = styled.div<MobileProps>`
  padding-bottom: 2rem;

  ${({ isMobile }) =>
    isMobile &&
    `
    padding-bottom: 1rem;
    `}
`;

const TextFields = styled.div`
  display: flex;
  flex-direction: column;

  margin-bottom: 2rem;
`;

type Props = {
  handleSubmit: (data: FormData) => void;
  webhookSubscription?: WebhookSubscription;
};

interface FormData {
  name: string;
  url: string;
  events: string[];
}

function WebhookSubscriptionForm({ handleSubmit, webhookSubscription }: Props) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit: formHandleSubmit,
    formState,
    watch,
    setValue,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      events: webhookSubscription ? [...webhookSubscription.events] : [],
      name: webhookSubscription?.name,
      url: webhookSubscription?.url,
    },
  });

  const events = watch("events");
  const selectedGroups = filter(events, (e) => !e.includes("."));
  const isAllEventSelected = includes(events, "*");
  const filteredEvents = filter(events, (e) => {
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

  const verb = webhookSubscription ? t("Update") : t("Create");
  const inProgressVerb = webhookSubscription ? t("Updating") : t("Creating");

  function EventCheckbox({ label, value }: { label: string; value: string }) {
    const LabelComponent =
      value === "*"
        ? AllEventCheckboxLabel
        : Object.keys(WEBHOOK_EVENTS).includes(value)
        ? GroupEventCheckboxLabel
        : EventCheckboxLabel;

    return (
      <LabelComponent>
        <input
          type="checkbox"
          defaultValue={value}
          {...register("events", {})}
        />
        <EventCheckboxText>{label}</EventCheckboxText>
      </LabelComponent>
    );
  }

  return (
    <form onSubmit={formHandleSubmit(handleSubmit)}>
      <Text type="secondary">
        <Trans>
          Provide a descriptive name for this webhook and the URL we should send
          a POST request to when matching events are created.
        </Trans>
      </Text>
      <Text type="secondary">
        <Trans>
          Subscribe to all events, groups, or individual events. We recommend
          only subscribing to the minimum amount of events that your application
          needs to function.
        </Trans>
      </Text>
      <TextFields>
        <ReactHookWrappedInput
          required
          autoFocus
          flex
          label={t("Name")}
          {...register("name", {
            required: true,
          })}
        />
        <ReactHookWrappedInput
          required
          autoFocus
          flex
          pattern="https://.*"
          placeholder="https://…"
          label={t("URL")}
          {...register("url", { required: true })}
        />
      </TextFields>

      <EventCheckbox label={t("All events")} value="*" />

      <FieldSet disabled={isAllEventSelected}>
        <GroupGrid isMobile={isMobile}>
          {Object.entries(WEBHOOK_EVENTS).map(([group, events], i) => (
            <GroupWrapper key={i} isMobile={isMobile}>
              <EventCheckbox
                label={t(`All {{ groupName }} events`, { groupName: group })}
                value={group}
              />
              <FieldSet disabled={selectedGroups.includes(group)}>
                {events.map((event) => (
                  <EventCheckbox label={event} value={event} key={event} />
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
        {formState.isSubmitting ? `${inProgressVerb}…` : verb}
      </Button>
    </form>
  );
}

export default WebhookSubscriptionForm;
