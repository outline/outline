import { useShop } from "~/stores/shop";
import { AppPage } from "~/components/AppPage";
import { formatDate } from "~/utils/format";

/**
 * Room-by-room occupancy for today, derived from the boardings that overlap
 * the current date.
 *
 * @returns the rendered occupancy board.
 */
function Occupancy() {
  const rooms = useShop((state) => state.rooms);

  const capacity = rooms.reduce((total, room) => total + room.capacity, 0);
  const occupied = rooms.reduce((total, room) => total + room.occupied, 0);
  const roomsInUse = rooms.filter((room) => room.occupied > 0).length;
  const rate = capacity ? Math.round((occupied / capacity) * 100) : 0;

  const branches = [...new Set(rooms.map((room) => room.branch))];

  const summary = [
    {
      name: "Occupancy",
      value: `${rate}%`,
      hint: `${occupied} of ${capacity} spaces`,
    },
    {
      name: "Rooms in use",
      value: `${roomsInUse}`,
      hint: `of ${rooms.length} rooms`,
    },
    {
      name: "Free spaces",
      value: `${Math.max(0, capacity - occupied)}`,
      hint: "available today",
    },
  ];

  return (
    <AppPage
      title="Occupancy"
      description="Which rooms are in use today, and who is in them."
    >
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {summary.map((stat) => (
          <div
            key={stat.name}
            className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow-sm ring-1 ring-gray-200 sm:p-6"
          >
            <dt className="truncate text-sm font-medium text-gray-500">
              {stat.name}
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {stat.value}
            </dd>
            <p className="mt-1 text-sm text-gray-500">{stat.hint}</p>
          </div>
        ))}
      </dl>

      {branches.map((branch) => (
        <section key={branch} className="mt-8">
          <h2 className="text-base font-semibold text-gray-900">{branch}</h2>
          <ul
            role="list"
            className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {rooms
              .filter((room) => room.branch === branch)
              .map((room) => (
                <li
                  key={room.id}
                  className={`rounded-lg bg-white p-4 shadow-sm ring-1 ${
                    room.isFull ? "ring-red-200" : "ring-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {room.name}
                      </p>
                      <p className="text-xs capitalize text-gray-500">
                        {room.type}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        room.isFull
                          ? "bg-red-50 text-red-700 ring-red-600/10"
                          : room.occupied > 0
                            ? "bg-blue-50 text-blue-700 ring-blue-700/10"
                            : "bg-green-50 text-green-700 ring-green-600/20"
                      }`}
                    >
                      {room.isFull
                        ? "Full"
                        : room.occupied > 0
                          ? "Partial"
                          : "Free"}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {room.occupied} / {room.capacity}
                      </span>
                      <span>
                        {Math.round((room.occupied / room.capacity) * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full ${
                          room.isFull ? "bg-red-500" : "bg-indigo-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (room.occupied / room.capacity) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1">
                    {room.guests.map((guest) => (
                      <li key={guest.id} className="text-xs text-gray-700">
                        <span className="font-medium text-gray-900">
                          {guest.petName}
                        </span>{" "}
                        · {guest.customerName} · out{" "}
                        {formatDate(guest.checkOut)}
                      </li>
                    ))}
                    {room.guests.length === 0 ? (
                      <li className="text-xs text-gray-400">Empty</li>
                    ) : null}
                  </ul>
                </li>
              ))}
          </ul>
        </section>
      ))}

      {rooms.length === 0 ? (
        <p className="text-sm text-gray-500">No rooms configured.</p>
      ) : null}
    </AppPage>
  );
}

export default Occupancy;
