import { useState } from "react";
import { useShop } from "~/stores/shop";
import { AppPage } from "~/components/AppPage";

const ROOM_TYPES = ["standard", "deluxe", "suite"] as const;

/**
 * Branches and the rooms in each, with room management.
 *
 * A room that currently has a guest in it cannot be removed, which the mock
 * enforces and this page surfaces.
 *
 * @returns the rendered branches page.
 */
function Branches() {
  const branches = useShop((state) => state.branches);
  const rooms = useShop((state) => state.rooms);
  const createRoom = useShop((state) => state.createRoom);
  const updateRoom = useShop((state) => state.updateRoom);
  const deleteRoom = useShop((state) => state.deleteRoom);

  const [draftBranch, setDraftBranch] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(2);
  const [type, setType] = useState<string>("standard");
  const [notice, setNotice] = useState<string | undefined>();

  const handleCreate = async (branch: string) => {
    if (!name.trim()) {
      return;
    }
    await createRoom({ name: name.trim(), branch, capacity, type });
    setName("");
    setCapacity(2);
    setType("standard");
    setDraftBranch(undefined);
  };

  const handleDelete = async (id: string, roomName: string) => {
    const deleted = await deleteRoom(id);
    setNotice(
      deleted
        ? `${roomName} removed.`
        : `${roomName} still has a guest in it, so it was kept.`
    );
  };

  return (
    <AppPage
      title="Branches"
      description="Locations and the rooms available at each."
    >
      {notice ? (
        <p
          data-testid="branches-notice"
          className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800"
        >
          {notice}
        </p>
      ) : null}

      {branches.map((branch) => {
        const branchRooms = rooms.filter((room) => room.branch === branch.name);
        const capacityTotal = branchRooms.reduce(
          (total, room) => total + room.capacity,
          0
        );

        return (
          <section
            key={branch.id}
            className="mb-8 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200"
          >
            <div className="border-b border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {branch.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">{branch.address}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {branch.phone} · Manager {branch.manager}
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {branchRooms.length} rooms · {capacityTotal} spaces
                </span>
              </div>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Room", "Type", "Capacity", "In use", ""].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {branchRooms.map((room) => (
                  <tr key={room.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {room.name}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={room.type}
                        aria-label={`Type of ${room.name}`}
                        onChange={(event) =>
                          void updateRoom(room.id, {
                            type: event.target.value,
                          })
                        }
                        className="rounded-md border-0 py-1 text-sm capitalize text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
                      >
                        {ROOM_TYPES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        value={room.capacity}
                        aria-label={`Capacity of ${room.name}`}
                        onChange={(event) =>
                          void updateRoom(room.id, {
                            capacity: Number(event.target.value),
                          })
                        }
                        className="w-20 rounded-md border-0 py-1 text-sm text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {room.occupied}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDelete(room.id, room.name)}
                        className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {branchRooms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-sm text-gray-500">
                      No rooms at this branch yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            <div className="border-t border-gray-100 p-4">
              {draftBranch === branch.id ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label
                      htmlFor={`room-name-${branch.id}`}
                      className="block text-xs font-medium text-gray-700"
                    >
                      Room name
                    </label>
                    <input
                      id={`room-name-${branch.id}`}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="mt-1 rounded-md border-0 py-1.5 text-sm text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`room-capacity-${branch.id}`}
                      className="block text-xs font-medium text-gray-700"
                    >
                      Capacity
                    </label>
                    <input
                      id={`room-capacity-${branch.id}`}
                      type="number"
                      min={1}
                      value={capacity}
                      onChange={(event) =>
                        setCapacity(Number(event.target.value))
                      }
                      className="mt-1 w-20 rounded-md border-0 py-1.5 text-sm text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`room-type-${branch.id}`}
                      className="block text-xs font-medium text-gray-700"
                    >
                      Type
                    </label>
                    <select
                      id={`room-type-${branch.id}`}
                      value={type}
                      onChange={(event) => setType(event.target.value)}
                      className="mt-1 rounded-md border-0 py-1.5 text-sm capitalize text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
                    >
                      {ROOM_TYPES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCreate(branch.name)}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
                  >
                    Add room
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftBranch(undefined)}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDraftBranch(branch.id)}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Add a room
                </button>
              )}
            </div>
          </section>
        );
      })}

      {branches.length === 0 ? (
        <p className="text-sm text-gray-500">No branches configured.</p>
      ) : null}
    </AppPage>
  );
}

export default Branches;
