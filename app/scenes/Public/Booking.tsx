import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { petsoClient } from "~/utils/petsoClient";
import { BusinessLayout } from "./BusinessLayout";
/** Formats rupiah for the public pages. */
const money = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
/**
 * Public booking request.
 *
 * A booking made here creates a real portal booking for the business to
 * confirm. It is the one place an outsider writes into the business's data.
 *
 * @returns the rendered booking page.
 */
function Booking() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [petName, setPetName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [rooms, setRooms] = useState<
    readonly {
      id: string;
      branchId: string | null;
      roomType: string;
      name: string;
      dailyRate: number;
      available: number;
    }[]
  >([]);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    return tomorrow.toISOString().slice(0, 16);
  });
  const [estimatedCheckOutAt, setEstimatedCheckOutAt] = useState(() => {
    const checkout = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    checkout.setMinutes(checkout.getMinutes() - checkout.getTimezoneOffset());
    return checkout.toISOString().slice(0, 16);
  });
  const [result, setResult] = useState<
    | {
        created: boolean;
        code?: string;
        room?: string;
        reason?: string;
      }
    | undefined
  >();
  const [isSaving, setIsSaving] = useState(false);
  const idempotency = useRef<
    | {
        fingerprint: string;
        key: string;
      }
    | undefined
  >(undefined);
  useEffect(() => {
    let cancelled = false;
    void petsoClient.public
      .rooms(businessSlug ?? "", new Date(scheduledAt).toISOString())
      .then((loadedRooms) => {
        if (cancelled) {
          return;
        }
        setRooms(
          loadedRooms.map((room) => ({
            id: room.id,
            branchId: room.branchId,
            roomType: room.roomType,
            name: room.name,
            dailyRate: room.dailyRate,
            available: room.available,
          }))
        );
        setRoomId(loadedRooms.find((room) => room.available > 0)?.id ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setRooms([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [businessSlug, scheduledAt]);
  const selectedRoom = rooms.find((room) => room.id === roomId);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRoom?.branchId) {
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        customerName,
        customerPhone,
        petName,
        scheduledAt: new Date(scheduledAt).toISOString(),
        estimatedCheckOutAt: new Date(estimatedCheckOutAt).toISOString(),
        branchId: selectedRoom.branchId,
        roomId,
      };
      const fingerprint = JSON.stringify(payload);
      if (
        !idempotency.current ||
        idempotency.current.fingerprint !== fingerprint
      ) {
        idempotency.current = {
          fingerprint,
          key: window.crypto.randomUUID(),
        };
      }
      const response = await petsoClient.public.createBooking(
        businessSlug ?? "",
        {
          ...payload,
          idempotencyKey: idempotency.current.key,
        }
      );
      setResult({ created: response.created, code: response.code });
      if (response.created) {
        idempotency.current = {
          fingerprint,
          key: window.crypto.randomUUID(),
        };
        setCustomerName("");
        setCustomerPhone("");
        setPetName("");
      }
    } catch {
      setResult({ created: false, reason: "invalid" });
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <BusinessLayout current="booking">
      <h2 className="text-lg font-semibold text-gray-900">Request a stay</h2>
      <p className="mt-1 text-sm text-gray-600">
        Tell us about your pet and we&rsquo;ll contact you to confirm the stay.
      </p>

      {result?.created ? (
        <p
          data-testid="booking-result"
          className="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-800"
        >
          Request received — reference {result.code}. We&rsquo;ll be in touch to
          confirm the stay.
        </p>
      ) : null}

      {result && !result.created ? (
        <p
          data-testid="booking-result"
          className="mt-6 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800"
        >
          {result.reason === "no_room"
            ? "Every room of that type is full for those dates."
            : "Please give us your name and your pet's name."}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-900"
          >
            Phone number
          </label>
          <input
            id="phone"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="estimated-checkout-at"
            className="block text-sm font-medium text-gray-900"
          >
            Check-out date
          </label>
          <input
            id="estimated-checkout-at"
            type="datetime-local"
            value={estimatedCheckOutAt}
            min={scheduledAt}
            onChange={(event) => setEstimatedCheckOutAt(event.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
            required
          />
        </div>

        <div>
          <label
            htmlFor="owner"
            className="block text-sm font-medium text-gray-900"
          >
            Your name
          </label>
          <input
            id="owner"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="scheduled-at"
            className="block text-sm font-medium text-gray-900"
          >
            Check-in date
          </label>
          <input
            id="scheduled-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="pet"
            className="block text-sm font-medium text-gray-900"
          >
            Pet&rsquo;s name
          </label>
          <input
            id="pet"
            value={petName}
            onChange={(event) => setPetName(event.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-gray-900">Room</legend>
          <div className="mt-2 space-y-2">
            {rooms.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-3 rounded-md border border-gray-200 p-3 text-sm"
              >
                <input
                  type="radio"
                  name="roomId"
                  value={option.id}
                  checked={roomId === option.id}
                  onChange={() => setRoomId(option.id)}
                  disabled={option.available === 0}
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span className="font-medium text-gray-900">
                  {option.roomType || option.name}
                </span>
                <span className="text-gray-500">
                  from {money(option.dailyRate)} / night
                </span>
                <span className="ml-auto text-xs text-gray-500">
                  {option.available > 0
                    ? `${option.available} available`
                    : "Full"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isSaving || !selectedRoom?.branchId}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSaving ? "Sending…" : "Request booking"}
        </button>
      </form>
    </BusinessLayout>
  );
}
export default Booking;
