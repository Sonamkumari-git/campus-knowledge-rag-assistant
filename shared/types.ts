/**
 * Unified shared application types.
 * User records are persisted in MongoDB and intentionally kept independent of any ORM.
 */
export type UserRole = "user" | "admin";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export type InsertUser = Partial<Omit<User, "id" | "createdAt" | "updatedAt">> & {
  openId: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export * from "./_core/errors";
