import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    isAdmin?: boolean;
    isOperator?: boolean;
    isFinAdmin?: boolean;
  }

  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      isOperator: boolean;
      isFinAdmin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
    isOperator?: boolean;
    isFinAdmin?: boolean;
  }
}
