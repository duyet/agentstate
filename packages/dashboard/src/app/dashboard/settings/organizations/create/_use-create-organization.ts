import { toast } from "sonner";

interface CreateOrganizationParams {
  name: string;
}

interface CreateOrganizationResult {
  id: string;
}

interface UseCreateOrganizationOptions {
  createOrganization?:
    | ((params: CreateOrganizationParams) => Promise<CreateOrganizationResult>)
    | undefined;
  setActive?: ((params: { organization: string }) => Promise<void>) | undefined;
  onSuccess?: () => void;
}

interface UseCreateOrganizationReturn {
  createOrganizationByName: (
    organizationName: string,
  ) => Promise<{ success: boolean; organizationId?: string; error?: string }>;
}

export function useCreateOrganization({
  createOrganization,
  setActive,
  onSuccess,
}: UseCreateOrganizationOptions): UseCreateOrganizationReturn {
  const createOrganizationByName = async (
    organizationName: string,
  ): Promise<{ success: boolean; organizationId?: string; error?: string }> => {
    if (!organizationName.trim()) {
      return { success: false, error: "Organization name is required" };
    }

    try {
      const newOrganization = await createOrganization?.({
        name: organizationName.trim(),
      });

      if (newOrganization) {
        await setActive?.({ organization: newOrganization.id });
        toast.success("Organization created successfully");
        onSuccess?.();
        return { success: true, organizationId: newOrganization.id };
      }

      return { success: false, error: "Failed to create organization" };
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ message?: string }> };
      const message = error?.errors?.[0]?.message ?? "Failed to create organization";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  return { createOrganizationByName };
}
