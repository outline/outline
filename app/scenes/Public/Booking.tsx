import { useEffect, useState } from "react";
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
 * A booking made here creates a real reservation, so it appears on the
 * boardings board inside the app – this is the one place an outsider writes
 * into the business's data.
 *
 * @returns the rendered booking page.
 */
function Booking() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [petName, setPetName] = useState("");
  const [roomType, setRoomType] = useState("");
  const [branchId, setBranchId] = useState<string>();
  const [rooms, setRooms] = useState<
    readonly { roomType: string; name: string; dailyRate: number }[]
  >([]);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    return tomorrow.toISOString().slice(0, 16);
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
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      petsoClient.public.rooms(businessSlug ?? ""),
      petsoClient.public.branches(businessSlug ?? ""),
    ])
      .then(([loadedRooms, branches]) => {
        if (cancelled) {
          return;
        }
        setRooms(
          loadedRooms.map((room) => ({
            roomType: room.roomType,
            name: room.name,
            dailyRate: room.dailyRate,
          })),
        );
        setRoomType(loadedRooms[0]?.roomType ?? "");
        setBranchId(branches[0]?.id);
      })
      .catch(() => {
        if (!cancelled) {
          setRooms([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [businessSlug]);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const response = await petsoClient.public.createBooking(
        businessSlug ?? "",
        {
          customerName,
          customerPhone,
          petName,
          scheduledAt: new Date(scheduledAt).toISOString(),
          ...(branchId ? { branchId } : {}),
          notes: roomType ? `Room type requested: ${roomType}` : undefined,
        },
      );
      setResult({ created: response.created, code: response.code });
      if (response.created) {
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
        Tell us about your pet and we&rsquo;ll hold a room.
      </p>

      {result?.created ? (
        <p
          data-testid="booking-result"
          className="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-800"
        >
          Booked — reference {result.code}, room {result.room}. We&rsquo;ll be
          in touch to confirm.
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
                key={option.roomType || option.name}
                className="flex items-center gap-3 rounded-md border border-gray-200 p-3 text-sm"
              >
                <input
                  type="radio"
                  name="roomType"
                  value={option.roomType}
                  checked={roomType === option.roomType}
                  onChange={() => setRoomType(option.roomType)}
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span className="font-medium text-gray-900">
                  {option.roomType || option.name}
                </span>
                <span className="text-gray-500">
                  from {money(option.dailyRate)} / night
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSaving ? "Sending…" : "Request booking"}
        </button>
      </form>
    </BusinessLayout>
  );
}
export default Booking;
