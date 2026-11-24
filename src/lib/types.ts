export type ActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export function fieldError(state: ActionState | undefined, name: string) {
  return state?.fieldErrors?.[name]?.[0];
}
