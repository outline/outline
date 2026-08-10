import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { SchemaForm } from "~/components/SchemaForm";
import { staffDocType } from "~/utils/doctypes";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";
import { currentBranch } from "../../src/mocks/shop";
import { AppPage } from "~/components/AppPage";
import { Capitalize } from "~/components/Surface";
import { StatusChip } from "~/components/StatusChip";

/**
 * The team, as a directory rather than a table – a person reads better with
 * their face, role and branch than as a row of cells.
 *
 * @returns the rendered staff page.
 */
const ROLES = ["owner", "manager", "cashier", "groomer", "caretaker"];

function Staff() {
  const { t } = useTranslation();
  const history = useHistory();
  const allStaff = useShop((state) => state.staff);
  const scope = currentBranch();
  const staff = scope
    ? allStaff.filter((member) => member.branch === scope)
    : allStaff;
  const branchRecords = useShop((state) => state.branches);
  const setStaffStatus = useShop((state) => state.setStaffStatus);
  const onShift = useShop((state) => state.onShift);
  const saveStaff = useShop((state) => state.saveStaff);
  const deleteStaff = useShop((state) => state.deleteStaff);
  const staffInvites = useShop((state) => state.staffInvites);
  const inviteStaff = useShop((state) => state.inviteStaff);
  const acceptInvite = useShop((state) => state.acceptInvite);
  const withdrawInvite = useShop((state) => state.withdrawInvite);

  const [isAdding, setIsAdding] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [notice, setNotice] = useState<string | undefined>();

  const handleSave = async (values: Record<string, string>) => {
    setNotice(undefined);
    const result = await saveStaff({
      name: values.name ?? "",
      email: values.email ?? "",
      role: values.role ?? "caretaker",
      branch: values.branch ?? branchRecords[0]?.name ?? "",
      phone: values.phone ?? "",
      commissionRate: Number(values.commissionRate) || 0,
    });

    if (result?.saved) {
      setIsAdding(false);
      return;
    }
    setNotice(
      result?.reason === "duplicate_email"
        ? t("Someone already signs in with that address.")
        : t("A staff member needs a name and an address to sign in with.")
    );
  };

  const handleDelete = async (id: string, name: string) => {
    setNotice(undefined);
    const result = await deleteStaff(id);
    if (!result?.removed) {
      setNotice(
        t("{{name}} still owes an advance, so they were kept.", { name })
      );
    }
  };

  const branches = [...new Set(staff.map((member) => member.branch))];
  const active = staff.filter((member) => member.status === "active").length;

  return (
    <AppPage
      title={t("Staff")}
      description={t("Who works where, and on what commission.")}
      actions={
        <Flex align="center" gap={8}>
          <Text type="tertiary" size="small">
            {active} / {staff.length} active · {onShift.length} {t("on shift")}
          </Text>
          <Button neutral borderOnHover onClick={() => setIsInviting(true)}>
            {t("Invite")}
          </Button>
          <Button onClick={() => setIsAdding(true)}>{t("New staff")}</Button>
        </Flex>
      }
    >
      {notice ? (
        <Text as="p" type="secondary" data-testid="staff-list-notice">
          {notice}
        </Text>
      ) : null}

      {(() => {
        const pending = staffInvites.filter(
          (invite) => invite.status === "pending"
        );
        return pending.length === 0 ? null : (
          <>
            <Subheading>
              {t("Invited, not started")} · {pending.length}
            </Subheading>
            {pending.map((invite) => (
              <ListItem
                key={invite.id}
                title={invite.name || invite.email}
                subtitle={`${t(invite.role)} · ${invite.branch} · ${invite.email}`}
                actions={
                  <Flex align="center" gap={8}>
                    <Button
                      neutral
                      borderOnHover
                      onClick={() => void acceptInvite(invite.id)}
                    >
                      {t("They have started")}
                    </Button>
                    <Button
                      neutral
                      borderOnHover
                      onClick={() => void withdrawInvite(invite.id)}
                    >
                      {t("Withdraw")}
                    </Button>
                  </Flex>
                }
                border
              />
            ))}
          </>
        );
      })()}

      {isInviting ? (
        <>
          <Subheading>{t("Invite someone")}</Subheading>
          <SchemaForm
            doctype={{
              name: "Invite",
              title: "Invite",
              fields: [
                { fieldname: "name", label: "Name", fieldtype: "text" },
                {
                  fieldname: "email",
                  label: "Email",
                  fieldtype: "email",
                  required: true,
                },
                {
                  fieldname: "role",
                  label: "Role",
                  fieldtype: "select",
                  required: true,
                  defaultValue: "caretaker",
                  options: ROLES.map((value) => ({ label: value, value })),
                },
                {
                  fieldname: "branch",
                  label: "Branch",
                  fieldtype: "select",
                  required: true,
                  defaultValue: branchRecords[0]?.name ?? "",
                  options: branchRecords.map((branch) => ({
                    label: branch.name,
                    value: branch.name,
                  })),
                },
              ],
            }}
            submitLabel="Send invitation"
            onSubmit={(values) => {
              setNotice(undefined);
              void inviteStaff({
                email: values.email ?? "",
                name: values.name ?? "",
                role: values.role ?? "caretaker",
                branch: values.branch ?? branchRecords[0]?.name ?? "",
              }).then((result) => {
                if (result?.sent) {
                  setIsInviting(false);
                } else {
                  setNotice(
                    result?.reason === "already_staff"
                      ? t("They already work here.")
                      : result?.reason === "already_invited"
                        ? t("They have already been invited.")
                        : t("An invitation needs an address and a branch.")
                  );
                }
              });
            }}
            onCancel={() => setIsInviting(false)}
          />
        </>
      ) : null}

      {isAdding ? (
        <>
          <Subheading>{t("New staff")}</Subheading>
          <SchemaForm
            doctype={staffDocType(branchRecords.map((branch) => branch.name))}
            submitLabel="Add staff"
            onSubmit={(values) => void handleSave(values)}
            onCancel={() => setIsAdding(false)}
          />
        </>
      ) : null}

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
                    <Capitalize>{member.role}</Capitalize> · {member.phone}
                    {onShift.some((entry) => entry.staffId === member.id)
                      ? ` · ${t("on shift")}`
                      : ""}
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
                      onClick={() => history.push(`/staff/${member.id}`)}
                    >
                      {t("Open")}
                    </Button>
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
                    <Button
                      neutral
                      borderOnHover
                      onClick={() => void handleDelete(member.id, member.name)}
                    >
                      {t("Remove")}
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
