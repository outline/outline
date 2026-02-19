import * as Collapsible from "@radix-ui/react-collapsible";
import filter from "lodash/filter";
import includes from "lodash/includes";
import isEqual from "lodash/isEqual";
import { DisclosureIcon } from "outline-icons";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import { randomString } from "@shared/random";
import { TeamPreference } from "@shared/types";
import type WebhookSubscription from "~/models/WebhookSubscription";
import Button from "~/components/Button";
import Input from "~/components/Input";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useMobile from "~/hooks/useMobile";
import Flex from "@shared/components/Flex";

const WEBHOOK_EVENTS = {
  attachments: [
    "attachments.create",
    "attachments.update",
    "attachments.delete",
  ],
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
  return `ol_whs_${randomString(32)}`;
}

type EventCheckboxProps = {
  label: string;
  value: string;
  style?: React.CSSProperties;
  register: ReturnType<typeof useForm<FormData>>["register"];
};

function EventCheckbox({
  label,
  value,
  register,
  ...rest
}: EventCheckboxProps) {
  const checkbox = (
    <>
      <input type="checkbox" defaultValue={value} {...register("events", {})} />
      <Text>{label}</Text>
    </>
  );

  if (value === "*") {
    return (
      <GroupEventCheckboxLabel {...rest}>{checkbox}</GroupEventCheckboxLabel>
    );
  }

  return <EventCheckboxLabel {...rest}>{checkbox}</EventCheckboxLabel>;
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
  const groupCheckboxRefs = useRef<{ [key: string]: HTMLInputElement | null }>(
    {}
  );

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

  useEffect(() => {
    Object.entries(WEBHOOK_EVENTS).forEach(([group, groupEvents]) => {
      const checkbox = groupCheckboxRefs.current[group];
      if (checkbox) {
        const isGroupSelected = selectedGroups.includes(group);
        const selectedChildEvents = groupEvents.filter((event) =>
          events.includes(event)
        );
        const isPartiallySelected =
          !isGroupSelected &&
          selectedChildEvents.length > 0 &&
          selectedChildEvents.length < groupEvents.length;
        checkbox.indeterminate = isPartiallySelected;
      }
    });
  }, [events, selectedGroups]);

  const verb = webhookSubscription ? t("Update") : t("Create");
  const inProgressVerb = webhookSubscription ? t("Updating") : t("Creating");

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
          autoFocus={!webhookSubscription}
          flex
          label={t("Name")}
          placeholder={t("A memorable identifer")}
          {...register("name", {
            required: true,
          })}
        />
        <Input
          required
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
      <EventCheckbox
        label={t("All events")}
        value="*"
        style={{ marginLeft: 24 }}
        register={register}
      />
      <FieldSet disabled={isAllEventSelected}>
        <Flex column>
          {Object.entries(WEBHOOK_EVENTS)
            .filter(
              ([group]) =>
                group !== "comment" ||
                team.getPreference(TeamPreference.Commenting)
            )
            .map(([group, groupEvents], i) => {
              const { ref: registerRef, ...registerProps } = register(
                "events",
                {}
              );
              return (
                <GroupWrapper key={i} isMobile={isMobile}>
                  <Collapsible.Root defaultOpen={false}>
                    <Collapsible.Trigger asChild>
                      <GroupEventCheckboxLabel>
                        <StyledDisclosureIcon aria-hidden="true" />
                        <input
                          type="checkbox"
                          defaultValue={group}
                          {...registerProps}
                          onClick={(e) => e.stopPropagation()}
                          ref={(el) => {
                            groupCheckboxRefs.current[group] = el;
                            registerRef(el);
                          }}
                        />
                        <Text>
                          {t(`All {{ groupName }} events`, {
                            groupName: group.replace(/s$/, ""),
                          })}
                        </Text>
                      </GroupEventCheckboxLabel>
                    </Collapsible.Trigger>
                    <CollapsibleContent>
                      <FieldSet disabled={selectedGroups.includes(group)}>
                        {groupEvents.map((event) => (
                          <EventCheckbox
                            label={event}
                            value={event}
                            key={event}
                            register={register}
                          />
                        ))}
                      </FieldSet>
                    </CollapsibleContent>
                  </Collapsible.Root>
                </GroupWrapper>
              );
            })}
        </Flex>
      </FieldSet>
      <Flex justify="flex-end">
        <Button
          type="submit"
          disabled={formState.isSubmitting || !formState.isValid}
        >
          {formState.isSubmitting ? `${inProgressVerb}…` : verb}
        </Button>
      </Flex>
    </form>
  );
}

const EventCheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  padding: 0.5em 0;
  color: ${(props) => props.theme.textSecondary};
  font-size: 13px;
  font-family: ${(props) => props.theme.fontFamilyMono};
  gap: 8px;
`;

const StyledDisclosureIcon = styled(DisclosureIcon)`
  transition: transform 250ms ease-out;
  flex-shrink: 0;
  margin-right: -4px;
`;

const GroupEventCheckboxLabel = styled.button.attrs({ type: "button" })`
  display: flex;
  align-items: center;
  font-weight: 500;
  background: none;
  border: none;
  padding: 0.2em 0;
  cursor: var(--pointer);
  width: 100%;
  text-align: left;
  color: inherit;
  gap: 8px;

  &[aria-expanded="false"] {
    ${StyledDisclosureIcon} {
      transform: rotate(-90deg);
    }
  }
`;

interface FieldProps {
  disabled?: boolean;
}
const FieldSet = styled.fieldset<FieldProps>`
  padding: 0;
  margin: 0;
  border: none;
  margin-bottom: 1em;

  ${({ disabled }) =>
    disabled &&
    `
    opacity: 0.75;
    `}
`;

interface MobileProps {
  isMobile?: boolean;
}

const GroupWrapper = styled.div<MobileProps>`
  margin-left: -4px;
`;

const CollapsibleContent = styled(Collapsible.Content)`
  overflow: hidden;
  padding-left: 48px;

  &[data-state="open"] {
    animation: slideDown 250ms ease-out;
  }

  &[data-state="closed"] {
    animation: slideUp 250ms ease-out;
  }

  @keyframes slideDown {
    from {
      height: 0;
      opacity: 0;
    }
    to {
      height: var(--radix-collapsible-content-height);
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      height: var(--radix-collapsible-content-height);
      opacity: 1;
    }
    to {
      height: 0;
      opacity: 0;
    }
  }
`;

const TextFields = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1em;
`;

export default WebhookSubscriptionForm;
