/**
 * Constants for Global Filters
 * Business-meaningful labels for marketing channels and device types
 */

export const CHANNEL_LABELS: Record<number, string> = {
  0: "Organic Search",
  1: "Paid Search",
  2: "Social Media",
  3: "Email",
  4: "Referral",
  5: "Direct",
};

export const DEVICE_LABELS: Record<number, string> = {
  0: "Desktop",
  1: "Mobile",
  2: "Tablet",
};

/**
 * Maps userType filter values to dimension table values
 * null means "all" (no filtering)
 */
export const USER_TYPE_MAP: Record<"all" | "new" | "returning", string | null> = {
  all: null,
  new: "New",
  returning: "Returning",
};

/**
 * Default filter values
 */
export const DEFAULT_CHANNELS = [0, 1, 2, 3, 4, 5];
export const DEFAULT_DEVICES = [0, 1, 2];
