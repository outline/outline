import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { petsoClient } from "~/utils/petsoClient";
import { BusinessLayout } from "./BusinessLayout";
/** Room availability as a visitor sees it. */
interface Availability {
  type: string;
  free: number;
  total: number;
  from: number;
}
const money = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
/**
 * What boarding is like here, and what is free right now.
 *
 * Room capacity and rates come from the business catalog.
 *
 * @returns the rendered boarding page.
 */
function Boarding() {
  const { businessSlug } = useParams<{
    businessSlug: string;
  }>();
  const [availability, setAvailability] = useState<Availability[]>([]);
  useEffect(() => {
    let cancelled = false;
    void petsoClient.public.rooms(businessSlug ?? "").then((response) => {
      if (!cancelled) {
        setAvailability(
          response.map((room) => ({
            type: room.roomType || room.name,
            free: room.capacity,
            total: room.capacity,
            from: room.dailyRate,
          })),
        );
      }
    }).catch(() => {
      if (!cancelled) {
        setAvailability([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [businessSlug]);
  return (
    <BusinessLayout current="boarding">
      <h2 className="text-lg font-semibold text-gray-900">Boarding</h2>
      <p className="mt-1 text-sm text-gray-600">
        Your pet gets its own room, daily walks and a photo update every
        evening.
      </p>

      <ul role="list" className="mt-8 space-y-3">
        {availability.map((room) => (
          <li
            key={room.type}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
          >
            <div>
              <p className="text-sm font-medium capitalize text-gray-900">
                {room.type}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Capacity: {room.total} spaces
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                from {money(room.from)}
              </p>
              <p className="text-xs text-gray-500">per night</p>
            </div>
          </li>
        ))}
        {availability.length === 0 ? (
          <li className="text-sm text-gray-500">
            Availability is not published right now.
          </li>
        ) : null}
      </ul>

      <Link
        to={`/p/${businessSlug}/booking`}
        className="mt-8 inline-block rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
      >
        Request a stay
      </Link>
    </BusinessLayout>
  );
}
export default Boarding;
