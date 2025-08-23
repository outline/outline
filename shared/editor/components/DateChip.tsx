import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
} from "date-fns";
import { CalendarIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { ComponentProps } from "../types";

type Props = ComponentProps & {
  onUpdateDate?: (date: Date) => void;
};

export const DateChip = React.memo(
  ({ node, isSelected, onUpdateDate, isEditable }: Props) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [currentMonth, setCurrentMonth] = React.useState(new Date());
    const containerRef = React.useRef<HTMLDivElement>(null);

    const date = React.useMemo(() => {
      try {
        return new Date(node.attrs.date);
      } catch (_error) {
        return new Date();
      }
    }, [node.attrs.date]);

    // Check if the date is empty or invalid
    const hasValidDate = React.useMemo(
      () => node.attrs.date && !isNaN(date.getTime()),
      [node.attrs.date, date]
    );

    const label = React.useMemo(
      () =>
        hasValidDate
          ? node.attrs.label || format(date, "dd-MMM-yyyy")
          : "Choose a date",
      [hasValidDate, node.attrs.label, date]
    );

    const handleSelect = React.useCallback(
      (selectedDate: Date) => {
        if (!isEditable) {
          return;
        }
        setIsOpen(false);
        onUpdateDate?.(selectedDate);
      },
      [onUpdateDate, isEditable]
    );

    const handleOpenChange = React.useCallback(
      (newOpen: boolean) => {
        if (!isEditable) {
          return;
        }
        setIsOpen(newOpen);
      },
      [isEditable]
    );

    const handlePreviousMonth = React.useCallback(() => {
      if (!isEditable) {
        return;
      }
      setCurrentMonth((prev) => subMonths(prev, 1));
    }, [isEditable]);

    const handleNextMonth = React.useCallback(() => {
      if (!isEditable) {
        return;
      }
      setCurrentMonth((prev) => addMonths(prev, 1));
    }, [isEditable]);

    const handleMonthChange = React.useCallback(
      (event: React.ChangeEvent<HTMLSelectElement>) => {
        if (!isEditable) {
          return;
        }
        event.stopPropagation();
        const newMonth = parseInt(event.target.value);
        setCurrentMonth((prev) => {
          const newDate = new Date(prev);
          newDate.setMonth(newMonth);
          return newDate;
        });
      },
      [isEditable]
    );

    const handleYearChange = React.useCallback(
      (event: React.ChangeEvent<HTMLSelectElement>) => {
        if (!isEditable) {
          return;
        }
        event.stopPropagation();
        const newYear = parseInt(event.target.value);
        setCurrentMonth((prev) => {
          const newDate = new Date(prev);
          newDate.setFullYear(newYear);
          return newDate;
        });
      },
      [isEditable]
    );

    // Generate years for dropdown (current year ± 10 years)
    const years = React.useMemo(() => {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = currentYear - 10; i <= currentYear + 10; i++) {
        years.push(i);
      }
      return years;
    }, []);

    // Month names for dropdown
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    // Set current month to selected date when it changes
    React.useEffect(() => {
      if (hasValidDate) {
        setCurrentMonth(date);
      }
    }, [hasValidDate, date]);

    // Close picker when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (containerRef.current && !containerRef.current.contains(target)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        // Use a small delay to avoid immediate closing
        const timeoutId = setTimeout(() => {
          document.addEventListener("mousedown", handleClickOutside);
        }, 100);

        return () => {
          clearTimeout(timeoutId);
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }
    }, [isOpen]);

    // If not editable, just render the chip without popover functionality
    if (!isEditable) {
      return (
        <ReadOnlyChip
          className={isSelected ? "ProseMirror-selectednode" : ""}
          data-date={node.attrs.date}
          data-label={node.attrs.label}
        >
          <CalendarIcon size={14} />
          <span>{label}</span>
        </ReadOnlyChip>
      );
    }

    return (
      <Container ref={containerRef}>
        <ChipButton
          className={isSelected ? "ProseMirror-selectednode" : ""}
          data-date={node.attrs.date}
          data-label={node.attrs.label}
          onClick={() => handleOpenChange(!isOpen)}
        >
          <CalendarIcon size={14} />
          <span>{label}</span>
        </ChipButton>

        {isOpen && (
          <DatePickerPopover onClick={(e) => e.stopPropagation()}>
            <DatePickerHeader onClick={(e) => e.stopPropagation()}>
              <MonthYearSelectors onClick={(e) => e.stopPropagation()}>
                <SelectWrapper onClick={(e) => e.stopPropagation()}>
                  <MonthSelect
                    value={currentMonth.getMonth()}
                    onChange={handleMonthChange}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Select month"
                  >
                    {months.map((month, index) => (
                      <option key={month} value={index}>
                        {month}
                      </option>
                    ))}
                  </MonthSelect>
                  <DropdownIndicator>▼</DropdownIndicator>
                </SelectWrapper>
                <SelectWrapper onClick={(e) => e.stopPropagation()}>
                  <YearSelect
                    value={currentMonth.getFullYear()}
                    onChange={handleYearChange}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Select year"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </YearSelect>
                  <DropdownIndicator>▼</DropdownIndicator>
                </SelectWrapper>
              </MonthYearSelectors>
              <NavigationButtons>
                <NavButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviousMonth();
                  }}
                  aria-label="Previous month"
                >
                  ‹
                </NavButton>
                <NavButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextMonth();
                  }}
                  aria-label="Next month"
                >
                  ›
                </NavButton>
              </NavigationButtons>
            </DatePickerHeader>

            {hasValidDate && (
              <SelectedDayTitle>
                {format(date, "EEEE, MMMM d")}
              </SelectedDayTitle>
            )}

            <DatePickerGrid>
              <DayHeader>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <DayHeaderCell key={day}>{day}</DayHeaderCell>
                  )
                )}
              </DayHeader>
              <DayGrid>
                {(() => {
                  const start = startOfMonth(currentMonth);
                  const end = endOfMonth(currentMonth);
                  const days = eachDayOfInterval({ start, end });

                  // Add padding days at the beginning
                  const startDay = start.getDay();
                  const paddingDays = Array.from(
                    { length: startDay },
                    (_, i) => <DayCell key={`padding-${i}`} disabled />
                  );

                  const dayCells = days.map((day) => (
                    <DayCell
                      key={day.toISOString()}
                      selected={hasValidDate && isSameDay(day, date)}
                      today={isToday(day)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(day);
                      }}
                    >
                      {day.getDate()}
                    </DayCell>
                  ));

                  return [...paddingDays, ...dayCells];
                })()}
              </DayGrid>
            </DatePickerGrid>
          </DatePickerPopover>
        )}
      </Container>
    );
  }
);

DateChip.displayName = "DateChip";

const ChipButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px 2px 6px;
  background: ${(props) => props.theme.mentionBackground};
  border: 1px solid ${(props) => props.theme.divider};
  border-radius: 12px;
  font-size: 0.9em;
  font-weight: 500;
  color: ${(props) => props.theme.text};
  cursor: pointer;
  text-decoration: none !important;
  vertical-align: bottom;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover {
    background: ${(props) => props.theme.mentionHoverBackground};
    border-color: ${(props) => props.theme.accent};
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:focus {
    outline: none;
    background: ${(props) => props.theme.mentionHoverBackground};
    border-color: ${(props) => props.theme.accent};
    box-shadow: 0 0 0 2px ${(props) => props.theme.accent}20;
  }

  &.ProseMirror-selectednode {
    background: ${(props) => props.theme.mentionHoverBackground};
    border-color: ${(props) => props.theme.accent};
  }
`;

const ReadOnlyChip = styled(ChipButton)`
  cursor: default;
  opacity: 0.7;
  pointer-events: none;
`;

const Container = styled.div`
  position: relative;
  display: inline-block;
`;

const DatePickerPopover = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  min-width: 220px;
  margin-top: 4px;
`;

const DatePickerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 6px;
`;

const MonthYearSelectors = styled.div`
  display: flex;
  gap: 4px;
  flex: 1;
  max-width: 150px;
  align-items: center;
`;

const SelectWrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
`;

const MonthSelect = styled.select`
  width: 100%;
  padding: 4px 20px 4px 6px;
  border: 1px solid #e1e5e9;
  border-radius: 3px;
  background: white;
  color: #333;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  appearance: none;
  outline: none;
  transition: all 0.15s ease;
  text-align: left;
  height: 22px;
  line-height: 1;

  &:hover {
    border-color: #007bff;
    background-color: #f8f9fa;
  }

  &:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    background-color: white;
  }
`;

const YearSelect = styled.select`
  width: 100%;
  padding: 4px 20px 4px 6px;
  border: 1px solid #e1e5e9;
  border-radius: 3px;
  background: white;
  color: #333;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  appearance: none;
  outline: none;
  transition: all 0.15s ease;
  text-align: left;
  height: 22px;
  line-height: 1;

  &:hover {
    border-color: #007bff;
    background-color: #f8f9fa;
  }

  &:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    background-color: white;
  }
`;

const DropdownIndicator = styled.span`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #666;
  font-size: 8px;
  z-index: 1;
`;

const NavigationButtons = styled.div`
  display: flex;
  gap: 1px;
`;

const NavButton = styled.button`
  width: 20px;
  height: 20px;
  border: 1px solid #e1e5e9;
  border-radius: 3px;
  background: white;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.15s ease;

  &:hover {
    background: #f8f9fa;
    border-color: #007bff;
  }

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const SelectedDayTitle = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: #666;
  margin-bottom: 6px;
  text-align: center;
`;

const DatePickerGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DayHeader = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
`;

const DayHeaderCell = styled.div`
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  color: #666;
  padding: 2px 0;
`;

const DayGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
`;

const DayCell = styled.button<{
  selected?: boolean;
  today?: boolean;
  disabled?: boolean;
}>`
  width: 22px;
  height: 22px;
  border: 1px solid transparent;
  border-radius: 2px;
  background: ${(props) => {
    if (props.disabled) {
      return "transparent";
    }
    if (props.selected) {
      return "#007bff";
    }
    return "white";
  }};
  color: ${(props) => {
    if (props.disabled) {
      return "#ccc";
    }
    if (props.selected) {
      return "white";
    }
    if (props.today) {
      return "#007bff";
    }
    return "#333";
  }};
  cursor: ${(props) => (props.disabled ? "default" : "pointer")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: ${(props) => (props.today || props.selected ? "600" : "400")};
  transition: all 0.15s ease;

  &:hover {
    ${(props) =>
      !props.disabled &&
      `
      background: ${props.selected ? "#0056b3" : "#f8f9fa"};
      border-color: #007bff;
    `}
  }

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;
