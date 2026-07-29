import bcrypt from "bcryptjs";
import { z } from "zod";

const SALT_ROUNDS = 12;

// bcrypt игнорирует всё после 72 байт — длиннее не имеет смысла разрешать.
// Единая схема для регистрации (T11) и сброса/смены пароля (T44+), чтобы правило
// не разъезжалось между формами при будущих изменениях (длина, сложность и т.п.).
export const passwordFieldSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[a-zA-Z]/, "password_no_letter")
  .regex(/[0-9]/, "password_no_digit");

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
