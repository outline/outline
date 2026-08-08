import { usePetStore } from "~/stores/petstore";
import { PetStoreScene } from "./components/PetStoreScene";

/** Badge classes per employment status. */
function staffBadge(status: string): string {
  const tones: Record<string, string> = {
    active: "bg-green-50 text-green-700 ring-green-600/20",
    on_leave: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
    inactive: "bg-gray-50 text-gray-600 ring-gray-500/10",
  };
  return `inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset ${
    tones[status] ?? "bg-gray-50 text-gray-600 ring-gray-500/10"
  }`;
}

/**
 * The team, grouped by branch, with the commission rate each is on and a
 * control to put someone on leave or bring them back.
 *
 * @returns the rendered staff page.
 */
function PetStoreStaff() {
  const staff = usePetStore((state) => state.staff);
  const setStaffStatus = usePetStore((state) => state.setStaffStatus);

  const branches = [...new Set(staff.map((member) => member.branch))];
  const active = staff.filter((member) => member.status === "active").length;

  return (
    <PetStoreScene
      title="Staff"
      description="Who works where, and on what commission."
      actions={
        <span className="text-sm text-gray-500">
          {active} of {staff.length} active
        </span>
      }
    >
      {branches.map((branch) => (
        <section key={branch} className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            {branch}
          </h2>
          <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Name", "Role", "Phone", "Commission", "Status", ""].map(
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
              <tbody className="divide-y divide-gray-100">
                {staff
                  .filter((member) => member.branch === branch)
                  .map((member) => (
                    <tr key={member.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {member.name}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize text-gray-700">
                        {member.role}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {member.phone}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {member.commissionRate}%
                      </td>
                      <td className="px-4 py-3">
                        <span className={staffBadge(member.status)}>
                          {member.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            void setStaffStatus(
                              member.id,
                              member.status === "active" ? "on_leave" : "active"
                            )
                          }
                          className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                          {member.status === "active"
                            ? "Set on leave"
                            : "Set active"}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {staff.length === 0 ? (
        <p className="text-sm text-gray-500">No staff yet.</p>
      ) : null}
    </PetStoreScene>
  );
}

export default PetStoreStaff;
