export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

export function sortDatesDesc(a: string, b: string) {
  return b.localeCompare(a);
}
