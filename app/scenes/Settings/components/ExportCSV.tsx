import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Button from "~/components/Button";
import type { Filter } from "@shared/helpers/FilterHelper";
import { CSVHelper } from "@shared/utils/csv";
import { download } from "~/utils/download";
import useStores from "~/hooks/useStores";
import usePolicy from "~/hooks/usePolicy";
import useCurrentTeam from "~/hooks/useCurrentTeam";

type Props = {
  /** Request parameters for filtering users */
  reqParams: {
    query?: string;
    filters?: Filter[];
    sort?: string;
    direction?: "ASC" | "DESC";
  };
};

/**
 * A button that exports all users to a CSV file.
 */
export function ExportCSV({ reqParams }: Props) {
  const { t } = useTranslation();
  const { users } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      const allUsers = await users.fetchAll({
        ...reqParams,
        limit: 100,
      });

      // Convert to CSV format with formatted dates
      const csvData = allUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email || "",
        role: user.role,
        lastActiveAt: user.lastActiveAt
          ? new Date(user.lastActiveAt).toISOString()
          : "",
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : "",
      }));

      const headers: (keyof (typeof csvData)[0])[] = [
        "id",
        "name",
        "email",
        "role",
        "lastActiveAt",
        "createdAt",
      ];
      const csv = CSVHelper.convertToCSV(csvData, headers);

      // Trigger download
      download(csv, "users.csv", "text/csv");
      toast.success(t("Users exported successfully"));
    } catch {
      toast.error(t("Failed to export users"));
    } finally {
      setIsExporting(false);
    }
  }, [users, reqParams, t]);

  if (!can.createExport) {
    return null;
  }

  return (
    <Button
      type="button"
      onClick={handleExportCSV}
      disabled={isExporting}
      neutral
    >
      {isExporting ? t("Exporting") + "…" : t("Download CSV")}
    </Button>
  );
}
