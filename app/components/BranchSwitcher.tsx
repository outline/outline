import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { useShop } from "~/stores/shop";
import { currentBranch, setCurrentBranch } from "~/utils/shopScope";
const Select = styled.select`
  width: 100%;
  margin: 4px 12px 8px;
  padding: 4px 6px;
  font-size: 13px;
  color: ${s("textSecondary")};
  background: transparent;
  border: 1px solid ${s("inputBorder")};
  border-radius: 4px;
`;
/**
 * Which branch the shop pages are showing.
 *
 * Changing it reloads rather than pushing the choice through the store: the
 * selection is read wherever a page needs it, and a full load is the simplest
 * way to be sure nothing is left showing the branch that was chosen before.
 *
 * @returns the rendered switcher, or nothing when there is only one branch.
 */
export function BranchSwitcher() {
  const { t } = useTranslation();
  const branches = useShop((state) => state.branches);
  const chosen = currentBranch() ?? "";
  if (branches.length < 2) {
    return null;
  }
  return (
    <Select
      aria-label={t("Branch")}
      value={chosen}
      onChange={(event) => {
        setCurrentBranch(event.target.value || undefined);
        window.location.reload();
      }}
    >
      <option value="">{t("All branches")}</option>
      {branches.map((branch) => (
        <option key={branch.id} value={branch.name}>
          {branch.name}
        </option>
      ))}
    </Select>
  );
}
