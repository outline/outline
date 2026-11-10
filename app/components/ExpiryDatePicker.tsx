import { format as formatDate } from "date-fns";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import { Calendar } from "@shared/components/Calendar";
import { dateLocale } from "@shared/utils/date";
import Button from "~/components/Button";
import ButtonSmall from "~/components/ButtonSmall";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useUserLocale from "~/hooks/useUserLocale";

type Props = {
  selectedDate?: Date;
  onSelect: (date: Date) => void;
  /** Called to remove the date, shows a remove button when a date is selected. */
  onClear?: () => void;
  /** The text to display when no date is selected. */
  placeholder?: string;
  /** Whether to display a smaller input. */
  small?: boolean;
  /** Applied to the outer element. */
  className?: string;
};

const ExpiryDatePicker = ({
  selectedDate,
  onSelect,
  onClear,
  placeholder,
  small,
  className,
}: Props) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);

  const userLocale = useUserLocale();
  const locale = dateLocale(userLocale);
  const PickerButton = small ? SmallPickerButton : LargePickerButton;
  const clearSize = small ? 18 : 24;

  const handleSelect = React.useCallback(
    (date: Date) => {
      setOpen(false);
      onSelect(date);
    },
    [onSelect]
  );

  return (
    <Wrapper className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <PickerButton neutral>
            {selectedDate
              ? formatDate(selectedDate, "MMM dd, yyyy", { locale })
              : (placeholder ?? t("Choose a date"))}
          </PickerButton>
        </PopoverTrigger>
        <PopoverContent
          aria-label={t("Choose a date")}
          width={280}
          side="right"
          shrink
        >
          <Calendar
            required
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={locale}
            disabled={{ before: new Date() }}
          />
        </PopoverContent>
      </Popover>
      {selectedDate && onClear && (
        <Tooltip content={t("Remove expiration")}>
          <ClearButton
            type="button"
            onClick={onClear}
            aria-label={t("Remove expiration")}
            size={clearSize}
          >
            <CloseIcon color={theme.placeholder} size={clearSize} />
          </ClearButton>
        </Tooltip>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const ClearButton = styled(NudeButton)`
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
`;

const LargePickerButton = styled(Button)`
  width: 150px;
`;

const SmallPickerButton = styled(ButtonSmall)`
  width: 130px;
`;

export default ExpiryDatePicker;
