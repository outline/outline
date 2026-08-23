import { useTranslation } from "react-i18next";
import { AppPage } from "~/components/AppPage";
import { usePanel } from "~/hooks/usePanel";
import { useSubmit } from "~/hooks/useSubmit";
import { Capitalize } from "~/components/Surface";
import { formatDate } from "~/utils/format";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import { SchemaForm } from "~/components/SchemaForm";
import type { FormValues } from "~/utils/formSchema";
import { BranchDocType, RoomDocType } from "~/utils/doctypes";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";
/**
 * Branches and the rooms at each.
 *
 * Rooms are list items rather than a table: a room is a thing with a name and
 * a state, not a row of figures. Editing happens in a small form that opens
 * under the branch, so the list stays readable rather than being a grid of
 * inputs.
 *
 * A room with a guest in it cannot be removed – the mock refuses and the page
 * says so rather than silently doing nothing.
 *
 * @returns the rendered branches page.
 */
function Branches() {
  const { t } = useTranslation();
  const branches = useShop((state) => state.branches);
  const rooms = useShop((state) => state.rooms);
  const createRoom = useShop((state) => state.createRoom);
  const saveBranch = useShop((state) => state.saveBranch);
  const deleteBranch = useShop((state) => state.deleteBranch);
  const branchHolidays = useShop((state) => state.branchHolidays);
  const addHoliday = useShop((state) => state.addHoliday);
  const removeHoliday = useShop((state) => state.removeHoliday);
  const updateRoom = useShop((state) => state.updateRoom);
  const deleteRoom = useShop((state) => state.deleteRoom);
  const panels = usePanel();
  // Two of the three panels carry which record they are for, so the panel is
  // named after it.
  const openBranch = panels.current?.startsWith("room:")
    ? panels.current.slice("room:".length)
    : undefined;
  const editing = panels.current?.startsWith("edit:")
    ? panels.current.slice("edit:".length)
    : undefined;
  const submission = useSubmit();
  const handleAddBranch = (values: FormValues) =>
    submission.run(async () => {
      const result = await saveBranch({
        name: values.name ?? "",
        address: values.address ?? "",
        phone: values.phone ?? "",
        manager: values.manager ?? "",
      });
      if (result?.saved) {
        panels.close();
        return undefined;
      }
      return t("A branch needs a name.");
    });
  const handleDeleteBranch = (id: string, name: string) =>
    submission.run(async () => {
      const result = await deleteBranch(id);
      return result?.removed
        ? undefined
        : t("{{name}} still has rooms or staff, so it was kept.", { name });
    });
  const handleCloseDay = (branchName: string, values: FormValues) =>
    submission.run(async () => {
      const result = await addHoliday({
        branch: branchName,
        date: values.date ?? "",
        reason: values.reason ?? "",
      });
      if (result?.saved) {
        return undefined;
      }
      return result?.reason === "has_guests"
        ? t("Guests are booked in that day, so it was left open.")
        : result?.reason === "duplicate"
          ? t("That day is already closed.")
          : t("Give a day to close.");
    });
  const resetForm = () => panels.close();
  const handleCreate = async (branch: string, values: FormValues) => {
    await createRoom({
      name: values.name.trim(),
      branch,
      capacity: Number(values.capacity) || 1,
      type: values.type,
      dailyRate: Number(values.dailyRate) || 0,
    });
    resetForm();
  };
  const handleSave = async (id: string, values: FormValues) => {
    await updateRoom(id, {
      name: values.name.trim() || undefined,
      capacity: Number(values.capacity) || 1,
      type: values.type,
      dailyRate: Number(values.dailyRate) || 0,
    });
    resetForm();
  };
  const handleDelete = (id: string, roomName: string) =>
    submission.run(async () => {
      const deleted = await deleteRoom(id);
      return deleted
        ? t("{{name}} removed.", { name: roomName })
        : t("{{name}} still has a guest in it, so it was kept.", {
            name: roomName,
          });
    });
  // The room form is built from its DocType, so what appears on screen and
  // what counts as valid come from one description.
  const form = (
    onSubmit: (values: FormValues) => void,
    submitLabel: string,
    initial?: FormValues
  ) => (
    <SchemaForm
      doctype={RoomDocType}
      initial={initial}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      onCancel={resetForm}
    />
  );
  return (
    <AppPage
      title={t("Branches")}
      description={t("Locations and the rooms available at each.")}
      actions={
        <Button onClick={() => panels.open("addBranch")}>
          {t("New branch")}
        </Button>
      }
    >
      {panels.isOpen("addBranch") ? (
        <>
          <Subheading>{t("New branch")}</Subheading>
          <SchemaForm
            doctype={BranchDocType}
            submitLabel={t("Add branch")}
            onSubmit={(values) => void handleAddBranch(values)}
            onCancel={panels.close}
          />
        </>
      ) : null}
      {submission.notice ? (
        <Text as="p" type="secondary" data-testid="branches-notice">
          {submission.notice}
        </Text>
      ) : null}

      {branches.map((branch) => {
        const branchRooms = rooms.filter((room) => room.branch === branch.name);
        const spaces = branchRooms.reduce(
          (total, room) => total + room.capacity,
          0
        );
        return (
          <Flex column key={branch.id}>
            <Flex align="center" justify="space-between">
              <Subheading>{branch.name}</Subheading>
              <Button
                neutral
                borderOnHover
                onClick={() => void handleDeleteBranch(branch.id, branch.name)}
              >
                {t("Remove branch")}
              </Button>
            </Flex>
            <Text type="tertiary" size="small" as="p">
              {branch.address} · {branch.phone} · {t("Manager")}{" "}
              {branch.manager} ·{" "}
              {t("{{ count }} rooms", { count: branchRooms.length })},{" "}
              {t("{{ count }} spaces", { count: spaces })}
            </Text>

            {(() => {
              const closures = branchHolidays.filter(
                (holiday) => holiday.branch === branch.name
              );
              return (
                <>
                  <Text type="tertiary" size="small" as="p">
                    {closures.length === 0
                      ? t("Open every day.")
                      : `${t("Closed")}: ${closures
                          .map((holiday) => formatDate(holiday.date))
                          .join(", ")}`}
                  </Text>
                  {closures.map((holiday) => (
                    <ListItem
                      key={holiday.id}
                      title={formatDate(holiday.date)}
                      subtitle={holiday.reason || t("Closed")}
                      actions={
                        <Button
                          neutral
                          borderOnHover
                          onClick={() => void removeHoliday(holiday.id)}
                        >
                          {t("Open again")}
                        </Button>
                      }
                      border
                    />
                  ))}
                  <SchemaForm
                    doctype={{
                      name: "Holiday",
                      title: "Holiday",
                      fields: [
                        {
                          fieldname: "date",
                          label: "Closed on",
                          fieldtype: "text",
                          required: true,
                          placeholder: "2026-12-25",
                          short: true,
                        },
                        {
                          fieldname: "reason",
                          label: "Why",
                          fieldtype: "text",
                        },
                      ],
                    }}
                    submitLabel={t("Close that day")}
                    onSubmit={(values) =>
                      void handleCloseDay(branch.name, values)
                    }
                  />
                </>
              );
            })()}

            {branchRooms.map((room) =>
              editing === room.id ? (
                <div key={room.id}>
                  {form(
                    (values) => void handleSave(room.id, values),
                    t("Save"),
                    {
                      name: room.name,
                      type: room.type,
                      capacity: String(room.capacity),
                      dailyRate: String(room.dailyRate),
                    }
                  )}
                </div>
              ) : (
                <ListItem
                  key={room.id}
                  title={room.name}
                  subtitle={
                    <>
                      <Capitalize>{room.type}</Capitalize> · {room.occupied} /{" "}
                      {room.capacity} {t("in use")}
                    </>
                  }
                  actions={
                    <Flex align="center" gap={8}>
                      <Button
                        neutral
                        borderOnHover
                        // The form takes its starting values from the room
                        // itself, so nothing has to be copied out first.
                        onClick={() => panels.open(`edit:${room.id}`)}
                      >
                        {t("Edit")}
                      </Button>
                      <Button
                        neutral
                        borderOnHover
                        onClick={() => void handleDelete(room.id, room.name)}
                      >
                        {t("Remove")}
                      </Button>
                    </Flex>
                  }
                  border
                />
              )
            )}

            {branchRooms.length === 0 ? (
              <Empty>{t("No rooms at this branch yet.")}</Empty>
            ) : null}

            {openBranch === branch.id ? (
              form(
                (values) => void handleCreate(branch.name, values),
                t("Add room")
              )
            ) : (
              <Flex style={{ padding: "8px 0 16px" }}>
                <Button
                  neutral
                  borderOnHover
                  onClick={() => panels.open(`room:${branch.id}`)}
                >
                  {t("Add a room")}
                </Button>
              </Flex>
            )}
          </Flex>
        );
      })}

      {branches.length === 0 ? (
        <Empty>{t("No branches configured.")}</Empty>
      ) : null}
    </AppPage>
  );
}
export default Branches;
