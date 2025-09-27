export function makeChannels<T extends readonly string[]>(
  feature: string,
  actions: T
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
} as const;

export type Channel = (typeof CHANNELS.PROJECT)[keyof typeof CHANNELS.PROJECT];
