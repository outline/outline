import { faCalendar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { isToday, isPast, format as formatDate } from "date-fns";
import React from "react";
import { DayPicker } from "react-day-picker";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit";
import styled, { useTheme } from "styled-components";
import { dateLocale } from "@shared/utils/date";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Popover from "~/components/Popover";
import Text from "~/components/Text";
import useUserLocale from "~/hooks/useUserLocale";

type Props = {
  selectedDate?: Date;
  onSelect: (date: Date) => void;
};

const ExpiryDatePicker = ({ selectedDate, onSelect }: Props) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const userLocale = useUserLocale();
  const locale = React.useMemo(() => dateLocale(userLocale), [userLocale]);
  const [error, setError] = React.useState<string>();

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
      if (!isToday(date) && isPast(date)) {
        setError(t("Cannot select a past date"));
        return;
      }
      popover.hide();
      setError(undefined);
      onSelect(date);
    },
    [t, popover, onSelect]
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
      <Popover {...popover} ref={popoverContentRef} width={280} shrink>
        <DayPicker
          mode="single"
          required={true}
          selected={selectedDate}
          onSelect={handleSelect}
          style={styles}
          footer={<ErrorFooter error={error} />}
        />
      </Popover>
    </>
  );
};

const Icon = () => (
  <IconWrapper>
    <FontAwesomeIcon icon={faCalendar} />
  </IconWrapper>
);

const ErrorFooter = ({ error }: { error?: string }) => {
  if (!error) {
    return null;
  }
  return (
    <Flex justify="center">
      <Text type="danger" size="small">
        {error}
      </Text>
    </Flex>
  );
};

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
