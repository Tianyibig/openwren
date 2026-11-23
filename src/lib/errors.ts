/**
 * What the engine says when something failed.
 *
 * A failure arrives as `{ kind, message }`: the message is the detail (still in the
 * engine's own words, meant for whoever wants to read it), the kind is what the
 * interface needs to say what it means and what to do next.
 */

export const ERROR_KINDS = ["auth", "tls", "network", "notFound", "quota", "server", "other"] as const;

export type ErrorKind = (typeof ERROR_KINDS)[number];

/** The category of a failure, when the engine named one. */
export function errorKind(error: unknown): ErrorKind | null {
  const kind = (error as { kind?: unknown } | null | undefined)?.kind;
  return typeof kind === "string" && (ERROR_KINDS as readonly string[]).includes(kind) ? (kind as ErrorKind) : null;
}

/** The message to show for a failure. */
export function errorText(error: unknown): string {
  if (typeof error === "string") return error;
  const message = (error as { message?: unknown } | null | undefined)?.message;
  if (typeof message === "string" && message !== "") return message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
