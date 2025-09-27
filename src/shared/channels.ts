export function makeChannels<T extends readonly string[]>(
  feature: string,
  actions: T,
) {
  type Action = T[number];
  const out = {} as Record<Action, string>;

  for (const action of actions as readonly Action[]) {
    const kebab = action.toLowerCase().replace(/_/g, "-");
    out[action] = `${feature}:${kebab}`;
  }
  return out;
}

export const CHANNELS = {
  PROJECT: makeChannels("example", ["EXAMPLE_ONE", "EXAMPLE_TWO"] as const),
  DASHBOARD: makeChannels(
    "dashboard",
    ["GET_LAYOUT", "SAVE_LAYOUT", "GET_SYSTEM_METRICS"] as const,
  ),
  CLIPBOARD: makeChannels(
    "clipboard",
    ["GET_HISTORY", "COPY", "DELETE", "UPSERT", "OCR_IMAGE", "SET_TAGS"] as const,
  ),
  POMODORO: makeChannels(
    "pomodoro",
    [
      "GET_STATE",
      "UPDATE_SETTINGS",
      "CONTROL",
      "GET_HISTORY",
      "CLEAR_HISTORY",
      "STATE_EVENT",
    ] as const,
  ),
  FLOATING_TIMER: makeChannels(
    "floating-timer",
    ["GET_STATE", "UPDATE_SETTINGS", "CONTROL", "STATE_EVENT"] as const,
  ),
} as const;

type ValueOf<T> = T[keyof T];
export type Channel = ValueOf<{
  [K in keyof typeof CHANNELS]: ValueOf<(typeof CHANNELS)[K]>;
}>;
