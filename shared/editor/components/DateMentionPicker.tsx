import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { RemoveScroll } from "react-remove-scroll";
import styled from "styled-components";
import { Calendar } from "../../components/Calendar";
import { depths, s } from "../../styles";
import { dateLocale, toISODate } from "../../utils/date";

type Props = {
  /** The currently selected date, if any. */
  selectedDate?: Date;
  /** The user's language, used to localise the calendar. */
  language?: Parameters<typeof dateLocale>[0];
  /** Called with the new date-only ISO string when a day is picked. */
  onChange: (modelId: string) => void;
  /** The trigger element the calendar popover is anchored to. */
  children: React.ReactNode;
};

/**
 * The interactive calendar popover for a date mention. It lives in its own
 * module so that its browser-only dependencies (Radix, react-day-picker) are
 * loaded lazily and stay out of the editor schema graph, which is also imported
 * on the server.
 *
 * @returns the popover wrapping the provided trigger.
 */
export default function DateMentionPicker({
  selectedDate,
  language,
  onChange,
  children,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const handleSelect = React.useCallback(
    (date: Date) => {
      setOpen(false);
      onChange(toISODate(date));
    },
    [onChange]
  );

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        asChild
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          asChild
          sideOffset={4}
          align="start"
          aria-label={t("Choose a date")}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <RemoveScroll as={Slot} allowPinchZoom>
            <DatePopoverContent>
              <Calendar
                required
                mode="single"
                selected={selectedDate}
                defaultMonth={selectedDate}
                onSelect={handleSelect}
                locale={dateLocale(language)}
              />
            </DatePopoverContent>
          </RemoveScroll>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

const DatePopoverContent = styled.div`
  z-index: ${depths.modal};
  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  border-radius: 8px;
  outline: none;

  &[data-state="open"] {
    animation: fadeIn 150ms ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
