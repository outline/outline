import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppPage } from "~/components/AppPage";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import { InputSelect } from "~/components/InputSelect";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";

const ROOM_TYPES = ["standard", "deluxe", "suite"];

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
  const updateRoom = useShop((state) => state.updateRoom);
  const deleteRoom = useShop((state) => state.deleteRoom);

  const [openBranch, setOpenBranch] = useState<string | undefined>();
  const [editing, setEditing] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("2");
  const [type, setType] = useState("standard");
  const [notice, setNotice] = useState<string | undefined>();

  const resetForm = () => {
    setName("");
    setCapacity("2");
    setType("standard");
    setOpenBranch(undefined);
    setEditing(undefined);
  };

  const handleCreate = async (branch: string) => {
    if (!name.trim()) {
      return;
    }
    await createRoom({
      name: name.trim(),
      branch,
      capacity: Number(capacity) || 1,
      type,
    });
    resetForm();
  };

  const handleSave = async (id: string) => {
    await updateRoom(id, {
      name: name.trim() || undefined,
      capacity: Number(capacity) || 1,
      type,
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

  const form = (onSubmit: () => void, submitLabel: string) => (
    <Flex align="flex-end" gap={8} style={{ padding: "8px 0 16px" }}>
      <Input
        label={t("Room name")}
        value={name}
        onChange={(event) => setName(event.target.value)}
        short
      />
      <Input
        label={t("Capacity")}
        value={capacity}
        onChange={(event) => setCapacity(event.target.value)}
        short
      />
      <InputSelect
        label={t("Type")}
        value={type}
        onChange={setType}
        options={ROOM_TYPES.map((option) => ({
          type: "item",
          label: t(option),
          value: option,
        }))}
      />
      <Button onClick={onSubmit}>{submitLabel}</Button>
      <Button neutral borderOnHover onClick={resetForm}>
        {t("Cancel")}
      </Button>
    </Flex>
  );

  return (
    <AppPage
      title={t("Branches")}
      description={t("Locations and the rooms available at each.")}
    >
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
            <Subheading>{branch.name}</Subheading>
            <Text type="tertiary" size="small" as="p">
              {branch.address} · {branch.phone} · {t("Manager")}{" "}
              {branch.manager} · {branchRooms.length} {t("rooms")}, {spaces}{" "}
              {t("spaces")}
            </Text>

            {branchRooms.map((room) =>
              editing === room.id ? (
                <div key={room.id}>
                  {form(() => void handleSave(room.id), t("Save"))}
                </div>
              ) : (
                <ListItem
                  key={room.id}
                  title={room.name}
                  subtitle={
                    <>
                      <span style={{ textTransform: "capitalize" }}>
                        {room.type}
                      </span>{" "}
                      · {room.occupied} / {room.capacity} {t("in use")}
                    </>
                  }
                  actions={
                    <Flex align="center" gap={8}>
                      <Button
                        neutral
                        borderOnHover
                        onClick={() => {
                          setEditing(room.id);
                          setOpenBranch(undefined);
                          setName(room.name);
                          setCapacity(String(room.capacity));
                          setType(room.type);
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
              form(() => void handleCreate(branch.name), t("Add room"))
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
