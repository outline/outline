import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { type DefaultTheme } from "styled-components";
import { TeamPreference, UserPreference } from "@shared/types";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import { SwatchButton } from "~/components/SwatchButton";
import Text from "~/components/Text";
import useBuildTheme from "~/hooks/useBuildTheme";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";

const isColorValue = (value: unknown): value is string =>
  typeof value === "string" &&
  (value.startsWith("#") ||
    value.startsWith("rgb") ||
    value.startsWith("hsl"));

/**
 * Grouped theme property names for the color editor. Keys not listed in any
 * group are collected into an "Other" section automatically.
 */
const themePropertyGroups: Record<string, string[]> = {
  Text: [
    "text",
    "textSecondary",
    "textTertiary",
    "placeholder",
    "cursor",
    "link",
    "accentText",
  ],
  Backgrounds: [
    "background",
    "backgroundSecondary",
    "backgroundTertiary",
    "backgroundQuaternary",
    "accent",
    "selected",
  ],
  Sidebar: [
    "sidebarBackground",
    "sidebarHoverBackground",
    "sidebarActiveBackground",
    "sidebarControlHoverBackground",
    "sidebarDraftBorder",
    "sidebarText",
  ],
  Modals: ["modalBackdrop", "modalBackground", "modalShadow", "backdrop"],
  Menus: ["menuItemSelected", "menuBackground"],
  Inputs: [
    "inputBorder",
    "inputBorderFocused",
    "inputBackground",
    "listItemHoverBackground",
  ],
  Buttons: [
    "buttonNeutralBackground",
    "buttonNeutralText",
    "buttonNeutralBorder",
  ],
  "Tooltips & Toasts": [
    "tooltipBackground",
    "tooltipText",
    "toastBackground",
    "toastText",
  ],
  Dividers: ["divider", "titleBarDivider", "horizontalRule", "embedBorder"],
  "Diff & Comments": [
    "textDiffInserted",
    "textDiffInsertedBackground",
    "textDiffDeleted",
    "textDiffDeletedBackground",
    "commentMarkBackground",
    "textHighlight",
    "textHighlightForeground",
  ],
  Notices: [
    "noticeInfoBackground",
    "noticeInfoText",
    "noticeTipBackground",
    "noticeTipText",
    "noticeWarningBackground",
    "noticeWarningText",
    "noticeSuccessBackground",
    "noticeSuccessText",
  ],
  "Code Syntax": [
    "code",
    "codeBackground",
    "codeBorder",
    "codeComment",
    "codePunctuation",
    "codeNumber",
    "codeProperty",
    "codeTag",
    "codeString",
    "codeClassName",
    "codeConstant",
    "codeParameter",
    "codeSelector",
    "codeAttrName",
    "codeAttrValue",
    "codeEntity",
    "codeKeyword",
    "codeFunction",
    "codeStatement",
    "codePlaceholder",
    "codeInserted",
    "codeImportant",
    "codeOperator",
  ],
};

/**
 * Build the full groups map including an "Uncategorized" catch-all for any
 * color-valued theme keys not explicitly listed above.
 */
function buildGroups(theme: DefaultTheme): Record<string, string[]> {
  const grouped = new Set(Object.values(themePropertyGroups).flat());
  const uncategorized = Object.keys(theme).filter(
    (k) => isColorValue(theme[k as keyof DefaultTheme]) && !grouped.has(k)
  );

  if (uncategorized.length > 0) {
    return { ...themePropertyGroups, Uncategorized: uncategorized };
  }
  return themePropertyGroups;
}

/**
 * A visual editor for per-user theme color overrides. Displays all theme color
 * properties grouped by category with clickable swatches for picking new values.
 */
function ThemeOverrideEditor() {
  const { t } = useTranslation();
  const { auth } = useStores();
  const user = useCurrentUser();

  // Build the base theme WITHOUT user overrides so we can show original values
  const baseTheme = useBuildTheme(
    auth.team?.getPreference(TeamPreference.CustomTheme) ||
      auth.config?.customTheme ||
      undefined
  );

  const groups = React.useMemo(() => buildGroups(baseTheme), [baseTheme]);

  const [filter, setFilter] = React.useState("");
  const [showOverridesOnly, setShowOverridesOnly] = React.useState(false);
  const [overrides, setOverrides] = React.useState<Record<string, string>>(
    () => user.getPreference(UserPreference.CustomThemeOverrides, {})
  );

  const saveTimeoutRef = React.useRef<number | undefined>(undefined);

  React.useEffect(
    () => () => {
      if (saveTimeoutRef.current !== undefined) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    },
    []
  );

  const applyOverrides = React.useCallback(
    (updated: Record<string, string>) => {
      setOverrides(updated);
      if (Object.keys(updated).length === 0) {
        setShowOverridesOnly(false);
      }
    },
    []
  );

  const persistOverrides = React.useCallback(
    async (updated: Record<string, string>) => {
      user.setPreference(UserPreference.CustomThemeOverrides, updated);
      try {
        await user.save();
        toast.success(t("Preferences saved"));
      } catch (err) {
        toast.error(String(err));
      }
    },
    [user, t]
  );

  const handleColorPick = React.useCallback(
    (key: string, color: string) => {
      const updated = { ...overrides, [key]: color };
      applyOverrides(updated);
      if (saveTimeoutRef.current !== undefined) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        void persistOverrides(updated);
      }, 300);
    },
    [overrides, applyOverrides, persistOverrides]
  );

  const handleColorRemove = React.useCallback(
    (key: string) => {
      const updated = { ...overrides };
      delete updated[key];
      applyOverrides(updated);
      if (saveTimeoutRef.current !== undefined) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = undefined;
      }
      void persistOverrides(updated);
    },
    [overrides, applyOverrides, persistOverrides]
  );

  const hasOverrides = Object.keys(overrides).length > 0;
  const filterLower = filter.toLowerCase();

  return (
    <>
      <Heading as="h2">{t("Theme overrides")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Personalize theme colors by clicking a swatch to choose a new value.
          Overrides are saved automatically and apply only to your account.
        </Trans>
      </Text>
      <FilterRow>
        <Input
          type="search"
          placeholder={t("Filter by property or color\u2026")}
          value={filter}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
            setFilter(ev.target.value)
          }
          label={t("Filter")}
          labelHidden
        />
        {hasOverrides && (
          <FilterToggle
            type="button"
            aria-pressed={showOverridesOnly}
            onClick={() => setShowOverridesOnly((v) => !v)}
            $active={showOverridesOnly}
          >
            {t("Overrides only")}
          </FilterToggle>
        )}
      </FilterRow>
      {Object.entries(groups).map(([group, keys]) => {
        const filtered = keys.filter((key) => {
          const value = String(baseTheme[key as keyof DefaultTheme] ?? "");
          if (!isColorValue(baseTheme[key as keyof DefaultTheme])) {
            return false;
          }
          if (showOverridesOnly && !overrides[key]) {
            return false;
          }
          return (
            key.toLowerCase().includes(filterLower) ||
            value.toLowerCase().includes(filterLower) ||
            group.toLowerCase().includes(filterLower)
          );
        });

        if (filtered.length === 0) {
          return null;
        }

        return (
          <React.Fragment key={group}>
            <GroupLabel>{group}</GroupLabel>
            <ThemeValuesTable>
              <colgroup>
                <col />
                <col />
                <col />
              </colgroup>
              <tbody>
                {filtered.map((key) => {
                  const baseValue = String(
                    baseTheme[key as keyof DefaultTheme]
                  );
                  const override = overrides[key];
                  return (
                    <tr key={key}>
                      <NameCell>
                        <code>{key}</code>
                      </NameCell>
                      <SwatchCell>
                        <SwatchButton
                          color={baseValue}
                          size={20}
                          alpha
                          onChange={(color) => handleColorPick(key, color)}
                          pickerInModal={false}
                        />
                      </SwatchCell>
                      <OverrideCell>
                        {override && (
                          <>
                            <SwatchButton
                              color={override}
                              size={20}
                              alpha
                              onChange={(color) => handleColorPick(key, color)}
                              pickerInModal={false}
                            />
                            <RemoveButton
                              type="button"
                              onClick={() => handleColorRemove(key)}
                              aria-label={t("Remove override")}
                            >
                              &times;
                            </RemoveButton>
                          </>
                        )}
                      </OverrideCell>
                    </tr>
                  );
                })}
              </tbody>
            </ThemeValuesTable>
          </React.Fragment>
        );
      })}
    </>
  );
}

const FilterRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  max-width: 420px;
`;

const FilterToggle = styled.button<{ $active: boolean }>`
  background: ${(props) =>
    props.$active ? props.theme.accent : props.theme.buttonNeutralBackground};
  color: ${(props) =>
    props.$active ? props.theme.accentText : props.theme.buttonNeutralText};
  border: 1px solid
    ${(props) =>
      props.$active ? props.theme.accent : props.theme.buttonNeutralBorder};
  border-radius: 4px;
  padding: 0 12px;
  height: 32px;
  font-size: 13px;
  cursor: var(--pointer);
  white-space: nowrap;
  flex-shrink: 0;
`;

const GroupLabel = styled.h4`
  font-size: 13px;
  font-weight: 600;
  color: ${(props) => props.theme.textSecondary};
  margin: 12px 0 4px;
`;

const ThemeValuesTable = styled.table`
  margin: 4px 0 8px;
  border-collapse: collapse;
  table-layout: fixed;
  width: 420px;
  font-size: 13px;

  col:nth-child(1) {
    width: 300px;
  }
  col:nth-child(2) {
    width: 40px;
  }
  col:nth-child(3) {
    width: 80px;
  }

  td {
    padding: 5px 4px;
    border-bottom: 1px solid ${(props) => props.theme.divider};
    vertical-align: middle;
    height: 32px;

    code {
      font-size: 12px;
    }
  }
`;

const NameCell = styled.td`
  && {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const SwatchCell = styled.td`
  && {
    line-height: 0;
  }
`;

const OverrideCell = styled.td`
  && {
    line-height: 0;
    white-space: nowrap;
  }

  > * {
    display: inline-block;
    vertical-align: middle;
    margin-right: 4px;
  }
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: ${(props) => props.theme.danger};
  font-size: 18px;
  line-height: 1;
  cursor: var(--pointer);
  padding: 0 4px;
  opacity: 0.6;

  &:hover {
    opacity: 1;
  }
`;

export default observer(ThemeOverrideEditor);
