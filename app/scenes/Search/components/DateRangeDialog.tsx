import { subMonths } from "date-fns";
import { useCallback, useState } from "react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Calendar } from "@shared/components/Calendar";
import {
  dateLocale,
  dateRangeToReadable,
  parseISODate,
  toISODate,
} from "@shared/utils/date";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useUserLocale from "~/hooks/useUserLocale";
import type { DateRange } from "../searchFilters";

interface Props {
  /** The range to show as selected when the dialog opens. */
  defaultRange?: DateRange;
  /** Called with the chosen range as ISO dates. */
  onSubmit: (range: Required<DateRange>) => void;
}

/**
 * Dialog content to choose the first and last day of a date filter.
 */
export function DateRangeDialog({ defaultRange, onSubmit }: Props) {
  const { t } = useTranslation();
  const userLocale = useUserLocale();
  const [today] = useState(() => new Date());
  const [range, setRange] = useState<DayPickerRange | undefined>(() => {
    const from = defaultRange?.from ? parseISODate(defaultRange.from) : null;
    const to = defaultRange?.to ? parseISODate(defaultRange.to) : null;
    if (!from && !to) {
      return undefined;
    }
    return { from: from ?? to ?? undefined, to: to ?? undefined };
  });

  // Show the last day of the range in the right month, so that future months
  // (which cannot be picked) are not shown.
  const [defaultMonth] = useState(() => subMonths(range?.to ?? today, 1));

  // When a whole range is selected, the next click starts a new range.
  const handleSelect = useCallback(
    (next: DayPickerRange | undefined, selectedDay: Date) => {
      setRange((current) =>
        current?.from && current.to ? { from: selectedDay } : next
      );
    },
    []
  );

  const handleSubmit = useCallback(
    (ev: React.FormEvent) => {
      ev.preventDefault();
      if (!range?.from) {
        return;
      }
      onSubmit({
        from: toISODate(range.from),
        to: toISODate(range.to ?? range.from),
      });
    },
    [range, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Flex gap={12} column>
        <CalendarWrapper>
          <Calendar
            mode="range"
            numberOfMonths={2}
            showOutsideDays={false}
            selected={range}
            onSelect={handleSelect}
            defaultMonth={defaultMonth}
            locale={dateLocale(userLocale)}
            disabled={{ after: today }}
          />
        </CalendarWrapper>
        <Flex justify="space-between" align="center" gap={12}>
          <Text type="secondary" size="small">
            {range?.from
              ? dateRangeToReadable(
                  range.from,
                  range.to ?? range.from,
                  userLocale
                )
              : t("Choose the first and last day")}
          </Text>
          <Button type="submit" disabled={!range?.from}>
            {t("Apply")}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}

const CalendarWrapper = styled.div`
  display: flex;
  justify-content: center;
`;
