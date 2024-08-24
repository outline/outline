import { format as formatDate } from "date-fns";
import { CalendarIcon } from "outline-icons";
import React from "react";
import { DayPicker } from "react-day-picker";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit";
import styled, { useTheme } from "styled-components";
import { dateLocale } from "@shared/utils/date";
import Button from "~/components/Button";
import Popover from "~/components/Popover";
import useUserLocale from "~/hooks/useUserLocale";

type Props = {
  selectedDate?: Date;
  onSelect: (date: Date) => void;
};

const ExpiryDatePicker = ({ selectedDate, onSelect }: Props) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const userLocale = useUserLocale();
  const locale = dateLocale(userLocale);

  const popover = usePopoverState({ gutter: 0, placement: "right" });
  const popoverContentRef = React.useRef<HTMLDivElement>(null);

  const styles = React.useMemo(
    () =>
      ({
        "--rdp-caption-font-size": "16px",
        "--rdp-cell-size": "34px",
        "--rdp-selected-text": theme.accentText,
        "--rdp-accent-color": theme.accent,
        "--rdp-accent-color-dark": theme.accent,
        "--rdp-background-color": theme.listItemHoverBackground,
        "--rdp-background-color-dark": theme.listItemHoverBackground,
      } as React.CSSProperties),
    [theme]
  );

  const handleSelect = React.useCallback(
    (date: Date) => {
      popover.hide();
      onSelect(date);
    },
    [popover, onSelect]
  );

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <StyledPopoverButton {...props} icon={<Icon />} neutral>
            {selectedDate
              ? formatDate(selectedDate, "MMM dd, yyyy", { locale })
              : t("Choose a date")}
          </StyledPopoverButton>
        )}
      </PopoverDisclosure>
      <Popover
        {...popover}
        ref={popoverContentRef}
        width={280}
        shrink
        aria-label={t("Choose a date")}
      >
        <DayPicker
          required
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          style={styles}
          disabled={{ before: new Date() }}
        />
      </Popover>
    </>
  );
};

const Icon = () => (
  <IconWrapper>
    <CalendarIcon />
  </IconWrapper>
);

const StyledPopoverButton = styled(Button)`
  margin-top: 12px;
  width: 150px;
`;

const IconWrapper = styled.span`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 24px;
  height: 24px;
`;

export default ExpiryDatePicker;
