export const SUCCESS_MESSAGES = {
  DEFAULT: "All set.",
  LIST: "Loaded successfully.",
  CREATED: "Saved successfully.",
  UPDATED: "Changes saved.",
  DELETED: "Removed successfully.",
  SIGNED_IN: "You're signed in.",
  SIGNED_OUT: "You're signed out.",
  REGISTERED: "Your account is ready.",
  SESSION_REFRESHED: "Your session was refreshed.",
  INVITE_ACCEPTED: "Welcome — you're in.",
} as const;

export type SuccessMessageKey = keyof typeof SUCCESS_MESSAGES;
