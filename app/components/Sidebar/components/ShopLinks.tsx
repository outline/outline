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
  BillingIcon,
  GlobeIcon,
} from "outline-icons";
import { useTranslation } from "react-i18next";
import Header from "./Header";
import Relative from "./Relative";
import SidebarLink from "./SidebarLink";
import { canAccessRoute } from "../../../../src/mocks/access";
import { currentRole } from "../../../../src/mocks/shop";
import { BranchSwitcher } from "~/components/BranchSwitcher";

/** Every shop destination, in the order the sidebar lists them. */
const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: <HomeIcon />, exact: true },
  { to: "/pos", label: "Point of sale", icon: <TableIcon /> },
  { to: "/occupancy", label: "Occupancy", icon: <BuildingBlocksIcon /> },
  { to: "/boardings", label: "Boardings", icon: <ArchiveIcon /> },
  { to: "/orders", label: "Orders", icon: <DocumentIcon /> },
  { to: "/invoices", label: "Invoices", icon: <BillingIcon /> },
  { to: "/returns", label: "Returns", icon: <ArchiveIcon /> },
  { to: "/inventory", label: "Inventory", icon: <BeakerIcon /> },
  { to: "/grooming", label: "Grooming", icon: <SmileyIcon /> },
  { to: "/loyalty", label: "Loyalty", icon: <StarredIcon /> },
  { to: "/whatsapp", label: "WhatsApp", icon: <EmailIcon /> },
  { to: "/accounting", label: "Accounting", icon: <MathIcon /> },
  { to: "/products", label: "Products", icon: <ShapesIcon /> },
  { to: "/customers", label: "Customers", icon: <UserIcon /> },
  { to: "/staff", label: "Staff", icon: <TeamIcon /> },
  { to: "/branches", label: "Branches", icon: <BranchIcon /> },
  { to: "/portal", label: "Portal", icon: <GlobeIcon /> },
];

/**
 * Navigation for the shop pages.
 *
 * Kept in its own section so the wiki navigation above it is untouched. Only
 * the destinations this person's role can open are offered, so the sidebar is
 * not a list of doors that turn them away.
 *
 * @returns the rendered sidebar section.
 */
export function ShopLinks() {
  const { t } = useTranslation();
  const role = currentRole();

  const links = LINKS.filter((link) => role && canAccessRoute(role, link.to));

  if (links.length === 0) {
    return null;
  }

  return (
    <Relative>
      <Header id="store" title={t("Store")}>
        <BranchSwitcher />
        {links.map((link) => (
          <SidebarLink
            key={link.to}
            to={link.to}
            icon={link.icon}
            exact={link.exact}
            label={t(link.label)}
          />
        ))}
      </Header>
    </Relative>
  );
}
