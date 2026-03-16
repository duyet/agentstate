/**
 * Unified role styling for message badges across the dashboard.
 * Uses explicit dark mode classes for consistent appearance.
 */
export const ROLE_STYLES: Record<string, string> = {
  user: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  assistant: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  system: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  tool: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};
