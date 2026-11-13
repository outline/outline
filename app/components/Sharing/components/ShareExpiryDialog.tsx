import { addWeeks, endOfDay } from "date-fns";
import { observer } from "mobx-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { Calendar } from "@shared/components/Calendar";
import { dateLocale } from "@shared/utils/date";
import type Share from "~/models/Share";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import useUserLocale from "~/hooks/useUserLocale";
import { showErrorToast } from "./toasts";

interface Props {
  /** The share to change the expiry of. */
  share: Share;
  /** Called after the expiry is saved. */
  onSubmit: () => void;
}

/**
 * Dialog content to choose the date after which a public link stops working.
 */
export const ShareExpiryDialog = observer(function ShareExpiryDialog({
  share,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const userLocale = useUserLocale();
  const [date, setDate] = useState<Date | undefined>(() => {
    if (!share.expiresAt) {
      return undefined;
    }

    // A past date cannot be selected, so suggest a week from today instead.
    return share.isExpired
      ? addWeeks(new Date(), 1)
      : new Date(share.expiresAt);
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = useCallback(
    async (ev: React.FormEvent) => {
      ev.preventDefault();
      if (!date) {
        return;
      }

      setIsSaving(true);
      try {
        await share.save({ expiresAt: endOfDay(date).toISOString() });
        toast.success(t("Expiry updated"));
        onSubmit();
      } catch (err) {
        showErrorToast(err);
      } finally {
        setIsSaving(false);
      }
    },
    [date, share, onSubmit, t]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Flex gap={12} column>
        <CalendarWrapper>
          <Calendar
            required
            mode="single"
            numberOfMonths={2}
            selected={date}
            onSelect={setDate}
            defaultMonth={date}
            locale={dateLocale(userLocale)}
            disabled={{ before: new Date() }}
          />
        </CalendarWrapper>
        <Flex justify="flex-end">
          <Button type="submit" disabled={!date || isSaving}>
            {isSaving ? `${t("Saving")}…` : t("Save")}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
});

const CalendarWrapper = styled.div`
  display: flex;
  justify-content: center;
`;
