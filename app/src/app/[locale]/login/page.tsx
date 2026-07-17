import { LoginView } from "./LoginView";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return <LoginView callbackUrl={callbackUrl} />;
}
