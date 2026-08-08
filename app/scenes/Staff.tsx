import { useTranslation } from "react-i18next";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";
import { AppPage } from "~/components/AppPage";
import { StatusChip } from "~/components/StatusChip";

/**
 * The team, as a directory rather than a table – a person reads better with
 * their face, role and branch than as a row of cells.
 *
 * @returns the rendered staff page.
 */
function Staff() {
  const { t } = useTranslation();
  const staff = useShop((state) => state.staff);
  const setStaffStatus = useShop((state) => state.setStaffStatus);

  const branches = [...new Set(staff.map((member) => member.branch))];
  const active = staff.filter((member) => member.status === "active").length;

  return (
    <AppPage
      title={t("Staff")}
      description={t("Who works where, and on what commission.")}
      actions={
        <Text type="tertiary" size="small">
          {active} / {staff.length} active
        </Text>
      }
    >
      {branches.map((branch) => (
        <Flex column key={branch}>
          <Subheading>{branch}</Subheading>
          {staff
            .filter((member) => member.branch === branch)
            .map((member) => (
              <ListItem
                key={member.id}
                image={
                  <Avatar
                    model={{
                      id: member.id,
                      avatarUrl: null,
                      initial: member.name.charAt(0),
                      color: "#4E5BA6",
                    }}
                    size={AvatarSize.Large}
                  />
                }
                title={member.name}
                subtitle={
                  <>
                    <span className="capitalize">{member.role}</span> ·{" "}
                    {member.phone}
                    {member.commissionRate > 0
                      ? ` · ${member.commissionRate}% commission`
                      : null}
                  </>
                }
                actions={
                  <Flex align="center" gap={8}>
                    <StatusChip status={member.status} />
                    <Button
                      neutral
                      borderOnHover
                      onClick={() =>
                        void setStaffStatus(
                          member.id,
                          member.status === "active" ? "on_leave" : "active"
                        )
                      }
                    >
                      {member.status === "active"
                        ? t("Set on leave")
                        : t("Set active")}
                    </Button>
                  </Flex>
                }
                border
              />
            ))}
        </Flex>
      ))}

      {staff.length === 0 ? <Empty>{t("No staff yet.")}</Empty> : null}
    </AppPage>
  );
}

export default Staff;
