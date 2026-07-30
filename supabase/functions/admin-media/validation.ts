export const postgresUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requirePostgresUuid(value: FormDataEntryValue | null, label: string) {
  const id = typeof value === "string" ? value : "";
  if (!postgresUuidPattern.test(id)) throw new Error(`${label} ist ungültig.`);
  return id;
}
