import filter from "lodash/filter";
import includes from "lodash/includes";
import isEqual from "lodash/isEqual";
import randomstring from "randomstring";
import * as React from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import { TeamPreference } from "@shared/types";
import WebhookSubscription from "~/models/WebhookSubscription";
import Button from "~/components/Button";
import Input from "~/components/Input";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
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
    "users.promote",
    "users.demote",
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
    "documents.move",
    "documents.update",
    "documents.title_change",
    "documents.add_user",
    "documents.remove_user",
    "documents.add_group",
    "documents.remove_group",
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
  comments: ["comments.create", "comments.update", "comments.delete"],
  revisions: ["revisions.create"],
  fileOperations: [
    "fileOperations.create",
    "fileOperations.update",
    "fileOperations.delete",
  ],
  groups: [
    "groups.create",
    "groups.update",
    "groups.delete",
    "groups.add_user",
    "groups.remove_user",
  ],
  integrations: ["integrations.create", "integrations.update"],
  shares: ["shares.create", "shares.update", "shares.revoke"],
  teams: ["teams.update"],
  pins: ["pins.create", "pins.update", "pins.delete"],
  webhookSubscriptions: [
    "webhookSubscriptions.create",
    "webhookSubscriptions.delete",
    "webhookSubscriptions.update",
  ],
  views: ["views.create"],
};

const EventCheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  font-size: 15px;
  padding: 0.2em 0;
`;

const GroupEventCheckboxLabel = styled(EventCheckboxLabel)`
  font-weight: 500;
  font-size: 1.2em;
`;

const AllEventCheckboxLabel = styled(GroupEventCheckboxLabel)`
  font-size: 1.4em;
`;

const EventCheckboxText = styled.span`
  margin-left: 0.5rem;
`;

interface FieldProps {
  disabled?: boolean;
}
const FieldSet = styled.fieldset<FieldProps>`
  padding: 0;
  margin: 0;
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
  margin-bottom: 1em;
`;

type Props = {
  handleSubmit: (data: FormData) => void;
  webhookSubscription?: WebhookSubscription;
};

interface FormData {
  name: string;
  url: string;
  secret: string | null;
  events: string[];
}

function generateSigningSecret() {
  return `ol_whs_${randomstring.generate(32)}`;
}

function WebhookSubscriptionForm({ handleSubmit, webhookSubscription }: Props) {
  const { t } = useTranslation();
  const team = useCurrentTeam();
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
      secret: webhookSubscription
        ? webhookSubscription?.secret
        : generateSigningSecret(),
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
      <Text as="p" type="secondary">
        <Trans>
          Provide a descriptive name for this webhook and the URL we should send
          a POST request to when matching events are created.
        </Trans>
      </Text>
      <TextFields>
        <Input
          required
          autoFocus
          flex
          label={t("Name")}
          placeholder={t("A memorable identifer")}
          {...register("name", {
            required: true,
          })}
        />
        <Input
          required
          autoFocus
          flex
          pattern="https://.*"
          placeholder="https://…"
          label={t("URL")}
          {...register("url", { required: true })}
        />
        <Input
          flex
          spellCheck={false}
          label={t("Signing secret")}
          {...register("secret", {
            required: false,
          })}
        />
      </TextFields>
      <Text as="p" type="secondary">
        <Trans>
          Subscribe to all events, groups, or individual events. We recommend
          only subscribing to the minimum amount of events that your application
          needs to function.
        </Trans>
      </Text>
      <EventCheckbox label={t("All events")} value="*" />
      <FieldSet disabled={isAllEventSelected}>
        <GroupGrid isMobile={isMobile}>
          {Object.entries(WEBHOOK_EVENTS)
            .filter(
              ([group]) =>
                group !== "comment" ||
                team.getPreference(TeamPreference.Commenting)
            )
            .map(([group, groupEvents], i) => (
              <GroupWrapper key={i} isMobile={isMobile}>
                <EventCheckbox
                  label={t(`All {{ groupName }} events`, {
                    groupName: group.replace(/s$/, ""),
                  })}
                  value={group}
                />
                <FieldSet disabled={selectedGroups.includes(group)}>
                  {groupEvents.map((event) => (
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
