export const reviewModerationStatuses = ["pending", "published", "rejected", "hidden"] as const;
export type ReviewModerationStatus = (typeof reviewModerationStatuses)[number];
