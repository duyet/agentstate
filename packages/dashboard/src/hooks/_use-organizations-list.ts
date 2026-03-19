import { useOrganizationList } from "@clerk/react";

export interface UseOrganizationsListParams {
  userMemberships?: {
    infinite?: boolean;
    limit?: number;
  };
}

export interface UseOrganizationsListResult {
  organizations: NonNullable<
    NonNullable<
      ReturnType<typeof useOrganizationList>["userMemberships"]["data"]
    >[number]["organization"]
  >[];
  isLoaded: boolean;
  setActive: ReturnType<typeof useOrganizationList>["setActive"];
}

/**
 * Custom hook that extracts and filters organizations from user memberships.
 * Handles filtering out null/undefined organizations and provides loading state.
 *
 * @example
 * ```tsx
 * const { organizations, isLoaded } = useOrganizationsList();
 * ```
 */
export function useOrganizationsList(
  params: UseOrganizationsListParams = {},
): UseOrganizationsListResult {
  const { isLoaded, userMemberships, setActive } = useOrganizationList({
    userMemberships: {
      infinite: true,
      ...params.userMemberships,
    },
  });

  const organizations =
    userMemberships?.data
      ?.map((m) => m.organization)
      .filter((org): org is NonNullable<typeof org> => org != null) ?? [];

  return { organizations, isLoaded, setActive };
}
