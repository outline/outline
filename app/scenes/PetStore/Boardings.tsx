import { usePetStore } from "~/stores/petstore";
import { PetStoreScene } from "./components/PetStoreScene";
import { formatCurrency, formatDate, statusBadge } from "./format";

/** Nights between two dates, minimum one. */
function nights(checkIn: string, checkOut: string): number {
  const span = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(span / 86400000));
}

/**
 * Boarding reservations, with check-in and check-out from the same row.
 *
 * @returns the rendered boardings page.
 */
function PetStoreBoardings() {
  const boardings = usePetStore((state) => state.boardings);
  const setBoardingStatus = usePetStore((state) => state.setBoardingStatus);

  return (
    <PetStoreScene
      title="Boardings"
      description="Reservations across every branch, and who is in which room."
    >
      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Booking", "Guest", "Room", "Dates", "Total", "Status", ""].map(
                (heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {boardings.map((boarding) => (
              <tr key={boarding.id}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {boarding.code}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <span className="font-medium text-gray-900">
                    {boarding.petName}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {boarding.customerName}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {boarding.roomName}
                  <span className="block text-xs text-gray-500">
                    {boarding.branch}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatDate(boarding.checkIn)} –{" "}
                  {formatDate(boarding.checkOut)}
                  <span className="block text-xs text-gray-500">
                    {nights(boarding.checkIn, boarding.checkOut)} nights
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatCurrency(
                    boarding.ratePerNight *
                      nights(boarding.checkIn, boarding.checkOut)
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={statusBadge(boarding.status)}>
                    {boarding.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {boarding.status === "booked" ? (
                    <button
                      type="button"
                      onClick={() =>
                        void setBoardingStatus(boarding.id, "checked_in")
                      }
                      className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
                    >
                      Check in
                    </button>
                  ) : null}
                  {boarding.status === "checked_in" ? (
                    <button
                      type="button"
                      onClick={() =>
                        void setBoardingStatus(boarding.id, "checked_out")
                      }
                      className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Check out
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {boardings.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No reservations.</p>
        ) : null}
      </div>
    </PetStoreScene>
  );
}

export default PetStoreBoardings;
