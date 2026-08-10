import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppPage } from "~/components/AppPage";
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

  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [openBranch, setOpenBranch] = useState<string | undefined>();
  const [editing, setEditing] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();

  const resetForm = () => {
    setOpenBranch(undefined);
    setEditing(undefined);
  };

  const handleCreate = async (branch: string, values: FormValues) => {
    await createRoom({
      name: values.name.trim(),
      branch,
      capacity: Number(values.capacity) || 1,
      type: values.type,
    });
    resetForm();
  };

  const handleSave = async (id: string, values: FormValues) => {
    await updateRoom(id, {
      name: values.name.trim() || undefined,
      capacity: Number(values.capacity) || 1,
      type: values.type,
    });
    resetForm();
  };

  const handleDelete = async (id: string, roomName: string) => {
    const deleted = await deleteRoom(id);
    setNotice(
      deleted
        ? t("{{name}} removed.", { name: roomName })
        : t("{{name}} still has a guest in it, so it was kept.", {
            name: roomName,
          })
    );
  };

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
        <Button onClick={() => setIsAddingBranch(true)}>
          {t("New branch")}
        </Button>
      }
    >
      {isAddingBranch ? (
        <>
          <Subheading>{t("New branch")}</Subheading>
          <SchemaForm
            doctype={BranchDocType}
            submitLabel="Add branch"
            onSubmit={(values) => {
              void saveBranch({
                name: values.name ?? "",
                address: values.address ?? "",
                phone: values.phone ?? "",
                manager: values.manager ?? "",
              }).then((result) => {
                if (result?.saved) {
                  setIsAddingBranch(false);
                } else {
                  setNotice(t("A branch needs a name."));
                }
              });
            }}
            onCancel={() => setIsAddingBranch(false)}
          />
        </>
      ) : null}
      {notice ? (
        <Text as="p" type="secondary" data-testid="branches-notice">
          {notice}
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
                onClick={() =>
                  void deleteBranch(branch.id).then((result) => {
                    if (!result?.removed) {
                      setNotice(
                        t(
                          "{{name}} still has rooms or staff, so it was kept.",
                          { name: branch.name }
                        )
                      );
                    }
                  })
                }
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
                    submitLabel="Close that day"
                    onSubmit={(values) => {
                      setNotice(undefined);
                      void addHoliday({
                        branch: branch.name,
                        date: values.date ?? "",
                        reason: values.reason ?? "",
                      }).then((result) => {
                        if (!result?.saved) {
                          setNotice(
                            result?.reason === "has_guests"
                              ? t(
                                  "Guests are booked in that day, so it was left open."
                                )
                              : result?.reason === "duplicate"
                                ? t("That day is already closed.")
                                : t("Give a day to close.")
                          );
                        }
                      });
                    }}
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
                        onClick={() => {
                          // The form takes its starting values from the room
                          // itself, so nothing has to be copied out first.
                          setEditing(room.id);
                          setOpenBranch(undefined);
                        }}
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
                  onClick={() => {
                    resetForm();
                    setOpenBranch(branch.id);
                  }}
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
