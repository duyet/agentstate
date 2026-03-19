import type { ReactNode } from "react";

export interface EmptyConfig {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

interface MergedEmptyConfig {
  icon: ReactNode | undefined;
  title: string;
  description: string;
  action: { label: string; onClick: () => void } | undefined;
}

const DEFAULT_EMPTY = {
  title: "No data",
  description: "There are no items to display",
};

/**
 * Merge user-provided empty/error config with defaults
 * Returns an object with title and description always defined
 */
export function mergeEmptyConfig(userConfig?: EmptyConfig): MergedEmptyConfig {
  return {
    icon: userConfig?.icon,
    title: userConfig?.title ?? DEFAULT_EMPTY.title,
    description: userConfig?.description ?? DEFAULT_EMPTY.description,
    action: userConfig?.action,
  };
}
