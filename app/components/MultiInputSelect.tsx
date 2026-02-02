import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { QuestionMarkIcon } from "outline-icons";
import Flex from "./Flex";
import Input from "./Input";
import { LabelText } from "./Input";
import Tooltip from "./Tooltip";
import NudeButton from "./NudeButton";
import {
    Menu,
    MenuButton,
    MenuContent,
    MenuTrigger,
} from "./primitives/Menu";
import { MenuProvider } from "./primitives/Menu/MenuContext";
import { SelectButton } from "./primitives/components/InputSelect";

export type Item = {
    type: "item";
    label: string;
    value: string;
};

export type Option = Item;

type Props = Omit<React.HTMLAttributes<HTMLButtonElement>, "onChange"> & {
    options: Option[];
    value: string[];
    onChange: (value: string[]) => void;
    label: string;
    hideLabel?: boolean;
    disabled?: boolean;
    short?: boolean;
    help?: string;
    searchable?: boolean;
    emptyLabel?: string;
    selectedLabel?: (count: number) => string;
    renderOption?: (option: Option) => React.ReactNode;
} & React.ComponentProps<typeof SelectButton>; // Use SelectButton props for trigger

export const MultiInputSelect = React.forwardRef<HTMLButtonElement, Props>(
    (props, ref) => {
        const {
            options,
            value = [],
            onChange,
            label,
            hideLabel,
            short,
            help,
            searchable,
            emptyLabel,
            selectedLabel,
            renderOption,
            nude,
            ...triggerProps
        } = props;

        const { t } = useTranslation();
        const [open, setOpen] = React.useState(false);
        const [query, setQuery] = React.useState("");
        const searchInputRef = React.useRef<HTMLInputElement>(null);

        const filteredOptions = React.useMemo(() => {
            if (!searchable || !query) {
                return options;
            }
            return options.filter((option) =>
                option.label.toLowerCase().includes(query.toLowerCase())
            );
        }, [options, query, searchable]);

        const handleSelect = React.useCallback(
            (itemValue: string) => {
                const newValue = value.includes(itemValue)
                    ? value.filter((v) => v !== itemValue)
                    : [...value, itemValue];
                onChange(newValue);
            },
            [value, onChange]
        );

        const getTriggerLabel = () => {
            if (value.length === 0) return emptyLabel || t("All languages");
            if (value.length === 1)
                return options.find((o) => o.value === value[0])?.label;
            return selectedLabel
                ? selectedLabel(value.length)
                : t("{{count}} languages selected", { count: value.length });
        };

        return (
            <Wrapper short={short}>
                <Label text={label} hidden={hideLabel ?? false} help={help} />
                <MenuProvider variant="dropdown">
                    <Menu open={open} onOpenChange={setOpen}>
                        <MenuTrigger ref={ref} disabled={props.disabled} asChild>
                            <SelectButton neutral disclosure $nude={nude} {...triggerProps}>
                                {getTriggerLabel()}
                            </SelectButton>
                        </MenuTrigger>
                        <MenuContent
                            style={{ maxHeight: "300px", overflowY: "auto" }}
                        >
                            {searchable && (
                                <SearchInputWrapper>
                                    <Input
                                        ref={searchInputRef}
                                        type="search"
                                        value={query}
                                        onChange={(ev) => setQuery(ev.target.value)}
                                        placeholder={`${t("Search")}…`}
                                        labelHidden
                                        margin={0}
                                        onKeyDown={(ev) => {
                                            if (ev.key === "Escape") {
                                                ev.stopPropagation();
                                            }
                                            // Prevent menu from closing when typing
                                            ev.stopPropagation();
                                        }}
                                        autoFocus
                                    />
                                </SearchInputWrapper>
                            )}
                            {filteredOptions.map((option) => (
                                <MenuButton
                                    key={option.value}
                                    selected={value.includes(option.value)}
                                    label={renderOption ? renderOption(option) : option.label}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleSelect(option.value);
                                    }}
                                />
                            ))}
                        </MenuContent>
                    </Menu>
                </MenuProvider>
            </Wrapper>
        );
    }
);

MultiInputSelect.displayName = "MultiInputSelect";

function Label({
    text,
    hidden,
    help,
}: {
    text: string;
    hidden: boolean;
    help?: string;
}) {
    const content = (
        <Flex align="center" gap={2} style={{ marginBottom: "4px" }}>
            <LabelText style={{ paddingBottom: 0 }}>{text}</LabelText>
            {help ? (
                <Tooltip content={help}>
                    <TooltipButton size={18}>
                        <QuestionMarkIcon size={18} />
                    </TooltipButton>
                </Tooltip>
            ) : null}
        </Flex>
    );

    return hidden ? null : content;
}

const Wrapper = styled.label<{ short?: boolean }>`
  display: block;
  max-width: ${(props) => (props.short ? "350px" : "100%")};
`;

const TooltipButton = styled(NudeButton)`
  color: ${s("textSecondary")};

  &:hover,
  &[aria-expanded="true"] {
    background: none !important;
  }
`;

const SearchInputWrapper = styled.div`
  padding: 4px;
  border-bottom: 1px solid ${s("divider")};
  margin-bottom: 4px;
`;

export default MultiInputSelect;
