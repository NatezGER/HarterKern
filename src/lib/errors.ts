export class ConfigurationError extends Error {
  constructor() {
    super("Supabase ist noch nicht konfiguriert.");
    this.name = "ConfigurationError";
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Ein unerwarteter Fehler ist aufgetreten.";
}
