export function buildAppUrl(path: string) {
  return `${process.env.APP_URL ?? "http://localhost:3000"}${path}`;
}
