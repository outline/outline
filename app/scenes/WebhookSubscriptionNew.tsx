import * as React from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { ReactHookWrappedInput } from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  onSubmit: () => void;
};

type EventString = "*" | "documents" | "documents.move" | "documents.delete";

interface FormData {
  name: string;
  url: string;
  events: EventString[];
}

const EventCheckboxLabel = styled.label`
  display: flex;
  align-items: center;

  padding: 0.5rem 0;
`;

const EventCheckboxText = styled.span`
  margin-right: 0.5rem;
`;

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
  } = useForm<FormData>({ mode: "onTouched", defaultValues: { events: [] } });

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
  const isDocsRootSelected = events && events.includes("documents");

  useEffect(() => {
    if (isAllEventSelected) {
      setValue("events", ["*"]);
    }
  }, [isAllEventSelected, setValue]);

  useEffect(() => {
    if (isDocsRootSelected && events.some((e) => e.startsWith("documents."))) {
      setValue(
        "events",
        events.filter((e) => !e.startsWith("documents."))
      );
    }
  }, [isDocsRootSelected, setValue, events]);

  function EventCheckbox({
    label,
    value,
  }: {
    label: string;
    value: EventString;
  }) {
    return (
      <EventCheckboxLabel>
        <EventCheckboxText>{label}</EventCheckboxText>
        <input
          type="checkbox"
          value={value}
          {...register("events", {
            required: true,
          })}
        />
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
      <fieldset disabled={isAllEventSelected}>
        <EventCheckbox label={t("All Document Events")} value="documents" />
        <fieldset disabled={isDocsRootSelected}>
          <EventCheckbox label={t("Documents Moved")} value="documents.move" />
          <EventCheckbox
            label={t("Documents Deleted")}
            value="documents.delete"
          />
        </fieldset>
      </fieldset>
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
