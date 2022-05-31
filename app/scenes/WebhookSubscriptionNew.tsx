import * as React from "react";
import { useForm, UseFormRegister } from "react-hook-form";
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

type EventString = "*" | "docs.read" | "docs.write";

interface FormData {
  name: string;
  events: EventString[] | EventString;
}

const EventCheckboxLabel = styled.label`
  display: flex;
  align-items: center;

  padding: 0.5rem 0;
`;

const EventCheckboxText = styled.span`
  margin-right: 0.5rem;
`;

function EventCheckbox({
  label,
  value,
  onChange,
  register,
  disabled,
}: {
  label: string;
  value: EventString;
  onChange?: React.ChangeEventHandler;
  register: UseFormRegister<FormData>;
  disabled?: boolean;
}) {
  return (
    <EventCheckboxLabel>
      <EventCheckboxText>{label}</EventCheckboxText>
      <input
        type="checkbox"
        value={value}
        {...register("events", {
          required: true,
          disabled: disabled,
          onChange,
        })}
      />
    </EventCheckboxLabel>
  );
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
  } = useForm<FormData>({ mode: "onChange" });

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await webhookSubscriptions.create({
          name: data.name,
        });
        showToast(
          t("Webhook subscription created", {
            type: "success",
          })
        );
        onSubmit();
      } catch (err) {
        console.log(data, err);
        showToast(err.message, {
          type: "error",
        });
      }
    },
    [t, showToast, onSubmit, webhookSubscriptions]
  );

  const onAllEventsChange = React.useCallback(() => {
    const eventsOrig = watch("events");
    const events = Array.isArray(eventsOrig) ? eventsOrig : [eventsOrig];

    if (events.includes("*")) {
      setValue("events", ["*"]);
    }
  }, [setValue, watch]);

  const lastEventsOrig = watch("events");
  const lastEvents = Array.isArray(lastEventsOrig)
    ? lastEventsOrig
    : [lastEventsOrig];
  const isAllEventSelected = lastEvents.includes("*");

  return (
    <form onSubmit={formHandleSubmit(handleSubmit)}>
      <Text type="secondary">
        <Trans>Select the events you need and name this webhook</Trans>
      </Text>
      <Flex>
        <ReactHookWrappedInput
          required
          autoFocus
          flex
          {...register("name", { required: true })}
        />
      </Flex>
      <EventCheckbox
        label={t("All events")}
        value="*"
        onChange={onAllEventsChange}
        register={register}
      />
      <EventCheckbox
        label={t("Read docs")}
        value="docs.read"
        register={register}
        disabled={isAllEventSelected}
      />
      <EventCheckbox
        label={t("Write docs")}
        value="docs.write"
        register={register}
        disabled={isAllEventSelected}
      />
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
