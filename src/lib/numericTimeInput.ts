export function appendTimeKey(value: string, key: string) {
  if (key === "back") return value.slice(0, -1);
  const normalizedKey = key === "." ? "," : key;
  if (normalizedKey === ",") return value && !value.includes(",") ? `${value},` : value;
  if (!/^\d$/.test(normalizedKey)) return value;
  const [whole, decimals = ""] = value.split(",");
  if (decimals.length >= 2 || (!value.includes(",") && whole.length >= 3)) return value;
  return `${value}${normalizedKey}`;
}
