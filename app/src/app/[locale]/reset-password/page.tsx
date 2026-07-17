import { peekVerificationToken } from "@/lib/verification-token";
import { ResetPasswordView } from "./ResetPasswordView";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = token ? await peekVerificationToken(token, "PASSWORD_RESET") : false;

  return <ResetPasswordView token={token} valid={valid} />;
}
