import { NewDocumentIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import { DURATION_BY_DATE_FILTER } from "@shared/helpers/FilterHelper";
import { StatusFilter } from "@shared/types";
import { Avatar, AvatarSize } from "~/components/Avatar";
import type { TFilterOption } from "~/components/FilterOptions";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import type { PaginatedItem } from "~/components/PaginatedList";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type { FetchPageParams } from "~/stores/base/Store";

/** The options a filter picks from, and how to load more of them. */
export interface FilterOptionSource {
  /** The options to pick from. */
  options: TFilterOption[];
  /** Loads more options from the server as the user types. */
  fetchQuery?: (options: FetchPageParams) => Promise<PaginatedItem[]>;
  /** Extra parameters to send with fetchQuery. */
  fetchQueryOptions?: Record<string, string>;
  /** Whether to show the filter input even for a short list. */
  showFilter?: boolean;
}

const userFetchQueryOptions = { sort: "name", direction: "ASC" };

/**
 * Options for each collection the user can see.
 *
 * @returns the collection options.
 */
export function useCollectionOptions(): FilterOptionSource {
  const { collections } = useStores();

  return useMemo(
    () => ({
      options: collections.orderedData.map((collection) => ({
        key: collection.id,
        label: collection.displayName,
        icon: <CollectionIcon collection={collection} size={24} />,
      })),
      showFilter: true,
    }),
    [collections.orderedData]
  );
}

/**
 * Options for each user in the workspace, loaded from the server as needed.
 *
 * @returns the user options.
 */
export function useUserOptions(): FilterOptionSource {
  const { users } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const fetchQuery = can.listUsers ? users.fetchPage : undefined;

  return useMemo(
    () => ({
      options: users.all.map((user) => ({
        key: user.id,
        label: user.name,
        icon: <StyledAvatar model={user} size={AvatarSize.Small} />,
      })),
      fetchQuery,
      fetchQueryOptions: userFetchQueryOptions,
      showFilter: true,
    }),
    [users.all, fetchQuery]
  );
}

/**
 * Options for each template, loaded from the server as needed.
 *
 * @returns the template options.
 */
export function useTemplateOptions(): FilterOptionSource {
  const { templates } = useStores();

  return useMemo(
    () => ({
      options: templates.all.map((template) => ({
        key: template.id,
        label: template.displayTitle,
        icon: template.icon ? (
          <Icon
            value={template.icon}
            initial={template.initial}
            color={template.color ?? undefined}
          />
        ) : (
          <NewDocumentIcon />
        ),
      })),
      fetchQuery: templates.fetchPage,
      showFilter: true,
    }),
    [templates.all, templates.fetchPage]
  );
}

/**
 * Options for a relative date range, from the past day to the past year.
 *
 * @returns the date options.
 */
export function useDateOptions(): FilterOptionSource {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      options: [
        { key: "day", label: t("Past day") },
        { key: "week", label: t("Past week") },
        { key: "month", label: t("Past month") },
        { key: "year", label: t("Past year") },
      ],
    }),
    [t]
  );
}

/**
 * Options for a relative date range, keyed by the ISO 8601 duration that the
 * API accepts as a lower bound.
 *
 * @returns the relative date options.
 */
export function useRelativeDateOptions(): FilterOptionSource {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      options: [
        { key: DURATION_BY_DATE_FILTER.day, label: t("Past day") },
        { key: DURATION_BY_DATE_FILTER.week, label: t("Past week") },
        { key: DURATION_BY_DATE_FILTER.month, label: t("Past month") },
        { key: DURATION_BY_DATE_FILTER.year, label: t("Past year") },
      ],
    }),
    [t]
  );
}

/**
 * Options for the status of a document.
 *
 * @returns the status options.
 */
export function useStatusOptions(): FilterOptionSource {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      options: [
        { key: StatusFilter.Published, label: t("Published") },
        { key: StatusFilter.Archived, label: t("Archived") },
        { key: StatusFilter.Draft, label: t("Drafts") },
      ],
    }),
    [t]
  );
}

const StyledAvatar = styled(Avatar)`
  margin: 2px;
`;
