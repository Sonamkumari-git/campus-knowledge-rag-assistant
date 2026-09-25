import { createHash } from "node:crypto";
import { MongoClient, type Collection, type Db } from "mongodb";
import type { InsertUser, User, UserRole } from "../shared/types";
import { ENV } from "./_core/env";

type MongoUserDocument = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

let client: MongoClient | null = null;
let database: Db | null = null;
let usersCollection: Collection<MongoUserDocument> | null = null;
let indexesReady: Promise<void> | null = null;

function stableNumericId(openId: string) {
  const id = createHash("sha256").update(openId).digest().readUInt32BE(0);
  return id || 1;
}

async function getUsersCollection() {
  if (!ENV.mongodbUri) return null;
  if (!client) {
    client = new MongoClient(ENV.mongodbUri, { serverSelectionTimeoutMS: 5000 });
    try {
      await client.connect();
      database = client.db(ENV.mongodbDbName || "campus_knowledge_ai");
      usersCollection = database.collection<MongoUserDocument>("users");
      indexesReady = usersCollection.createIndex({ openId: 1 }, { unique: true }).then(() => undefined);
    } catch (error) {
      console.warn("[MongoDB] Failed to connect:", error);
      client = null;
      database = null;
      usersCollection = null;
      indexesReady = null;
    }
  }
  if (indexesReady) await indexesReady;
  return usersCollection;
}

export async function getDb() {
  const collection = await getUsersCollection();
  return collection ? database : null;
}

function toUser(document: MongoUserDocument): User {
  return {
    id: stableNumericId(document.openId),
    openId: document.openId,
    name: document.name ?? null,
    email: document.email ?? null,
    loginMethod: document.loginMethod ?? null,
    role: document.role ?? "user",
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    lastSignedIn: document.lastSignedIn,
  };
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const collection = await getUsersCollection();
  if (!collection) {
    console.warn("[MongoDB] MONGODB_URI is not configured; user was not persisted");
    return;
  }

  const now = new Date();
  const set: Partial<MongoUserDocument> = { updatedAt: now };
  for (const field of ["name", "email", "loginMethod", "lastSignedIn"] as const) {
    if (user[field] !== undefined) set[field] = user[field] as never;
  }
  if (user.role !== undefined) set.role = user.role;
  else if (user.openId === ENV.ownerOpenId) set.role = "admin";

  await collection.updateOne(
    { openId: user.openId },
    {
      $set: set,
      $setOnInsert: {
        openId: user.openId,
        createdAt: user.createdAt ?? now,
        lastSignedIn: user.lastSignedIn ?? now,
        role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
      },
    },
    { upsert: true },
  );
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const collection = await getUsersCollection();
  if (!collection) {
    console.warn("[MongoDB] MONGODB_URI is not configured; user lookup unavailable");
    return undefined;
  }
  const document = await collection.findOne({ openId });
  return document ? toUser(document) : undefined;
}
