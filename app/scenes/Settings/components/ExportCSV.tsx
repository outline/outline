import { DownloadIcon } from "outline-icons";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import User from "~/models/User";
import UsersStore from "~/stores/UsersStore";
import Button from "~/components/Button";
import { convertToCSV } from "~/utils/csv";
import download from "~/utils/download";

type Props = {
  /** The users store */
  users: UsersStore;
  /** Request parameters for filtering users */
  reqParams: {
    query?: string;
    filter?: string;
    role?: string;
    sort?: string;
    direction?: "ASC" | "DESC";
  };
};

// Maximum number of pages to fetch to prevent infinite loops
const MAX_EXPORT_PAGES = 1000;
// Number of users to fetch per page
const USERS_PER_PAGE = 100;

/**
 * A button that exports all members to a CSV file.
 */
export function ExportCSV({ users, reqParams }: Props) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      const allUsers: User[] = [];
      let offset = 0;
      let hasMore = true;
      let pagesProcessed = 0;

      // Fetch all users with pagination
      while (hasMore && pagesProcessed < MAX_EXPORT_PAGES) {
        try {
          const response = await users.fetchPage({
            ...reqParams,
            offset,
            limit: USERS_PER_PAGE,
          });

          if (response.length === 0) {
            hasMore = false;
            break;
          }

          allUsers.push(...response);

          // Check if there are more pages
          if (response.length < USERS_PER_PAGE) {
            hasMore = false;
          } else {
            offset += USERS_PER_PAGE;
          }

          pagesProcessed++;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`Error fetching page at offset ${offset}:`, err);
          throw new Error(`Failed to fetch users at page ${pagesProcessed + 1}: ${errorMessage}`);
        }
      }

      // Convert to CSV format with formatted dates
      const csvData = allUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email || "",
        role: user.role,
        lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : "",
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : "",
      }));

      const headers = [
        "id",
        "name",
        "email",
        "role",
        "lastActiveAt",
        "createdAt",
      ] as const;
      const csv = convertToCSV(csvData, headers);

      // Trigger download
      download(csv, "members.csv", "text/csv");
      toast.success(t("Members exported successfully"));
    } catch (err) {
      toast.error(t("Failed to export members"));
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  }, [users, reqParams, t]);

  return (
    <Button
      type="button"
      icon={<DownloadIcon />}
      onClick={handleExportCSV}
      disabled={isExporting}
      neutral
    >
      {isExporting ? t("Exporting") + "…" : t("Export CSV")}
    </Button>
  );
}
