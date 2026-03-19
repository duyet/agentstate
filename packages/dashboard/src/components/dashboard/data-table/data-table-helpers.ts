import type { ReactNode } from "react";

export interface EmptyConfig {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

const DEFAULT_EMPTY: EmptyConfig = {
  title: "No data",
  description: "There are no items to display",
};

/**
 * Merge user-provided empty/error config with defaults
 */
export function mergeEmptyConfig(userConfig?: EmptyConfig): Required<EmptyConfig> {
  return {
    icon: undefined,
    description: undefined,
    action: undefined,
    ...DEFAULT_EMPTY,
    ...userConfig,
  };
}
