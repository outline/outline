import {
  HomeIcon,
  ArchiveIcon,
  ShapesIcon,
  UserIcon,
  BuildingBlocksIcon,
  TableIcon,
} from "outline-icons";
import { useTranslation } from "react-i18next";
import Header from "./Header";
import Relative from "./Relative";
import SidebarLink from "./SidebarLink";

/**
 * Navigation for the pet store pages.
 *
 * Kept in its own section so the wiki navigation above it is untouched.
 *
 * @returns the rendered sidebar section.
 */
export function PetStoreLinks() {
  const { t } = useTranslation();

  return (
    <Relative>
      <Header id="store" title={t("Store")}>
        <SidebarLink
          to="/store"
          icon={<HomeIcon />}
          exact
          label={t("Dashboard")}
        />
        <SidebarLink
          to="/store/pos"
          icon={<TableIcon />}
          label={t("Point of sale")}
        />
        <SidebarLink
          to="/store/occupancy"
          icon={<BuildingBlocksIcon />}
          label={t("Occupancy")}
        />
        <SidebarLink
          to="/store/boardings"
          icon={<ArchiveIcon />}
          label={t("Boardings")}
        />
        <SidebarLink
          to="/store/products"
          icon={<ShapesIcon />}
          label={t("Products")}
        />
        <SidebarLink
          to="/store/customers"
          icon={<UserIcon />}
          label={t("Customers")}
        />
      </Header>
    </Relative>
  );
}
