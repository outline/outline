import {
  HomeIcon,
  ArchiveIcon,
  ShapesIcon,
  UserIcon,
  BuildingBlocksIcon,
  TableIcon,
  DocumentIcon,
  BeakerIcon,
  MathIcon,
  StarredIcon,
  SmileyIcon,
  EmailIcon,
  TeamIcon,
  BuildingBlocksIcon as BranchIcon,
} from "outline-icons";
import { useTranslation } from "react-i18next";
import Header from "./Header";
import Relative from "./Relative";
import SidebarLink from "./SidebarLink";

/**
 * Navigation for the shop pages.
 *
 * Kept in its own section so the wiki navigation above it is untouched.
 *
 * @returns the rendered sidebar section.
 */
export function ShopLinks() {
  const { t } = useTranslation();

  return (
    <Relative>
      <Header id="store" title={t("Store")}>
        <SidebarLink
          to="/dashboard"
          icon={<HomeIcon />}
          exact
          label={t("Dashboard")}
        />
        <SidebarLink
          to="/pos"
          icon={<TableIcon />}
          label={t("Point of sale")}
        />
        <SidebarLink
          to="/occupancy"
          icon={<BuildingBlocksIcon />}
          label={t("Occupancy")}
        />
        <SidebarLink
          to="/boardings"
          icon={<ArchiveIcon />}
          label={t("Boardings")}
        />
        <SidebarLink to="/orders" icon={<DocumentIcon />} label={t("Orders")} />
        <SidebarLink
          to="/inventory"
          icon={<BeakerIcon />}
          label={t("Inventory")}
        />
        <SidebarLink
          to="/grooming"
          icon={<SmileyIcon />}
          label={t("Grooming")}
        />
        <SidebarLink
          to="/loyalty"
          icon={<StarredIcon />}
          label={t("Loyalty")}
        />
        <SidebarLink
          to="/whatsapp"
          icon={<EmailIcon />}
          label={t("WhatsApp")}
        />
        <SidebarLink
          to="/accounting"
          icon={<MathIcon />}
          label={t("Accounting")}
        />
        <SidebarLink
          to="/products"
          icon={<ShapesIcon />}
          label={t("Products")}
        />
        <SidebarLink
          to="/customers"
          icon={<UserIcon />}
          label={t("Customers")}
        />
        <SidebarLink to="/staff" icon={<TeamIcon />} label={t("Staff")} />
        <SidebarLink
          to="/branches"
          icon={<BranchIcon />}
          label={t("Branches")}
        />
      </Header>
    </Relative>
  );
}
