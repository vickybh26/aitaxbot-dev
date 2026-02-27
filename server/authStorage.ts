import {
  users,
  taxProfiles,
  cryptoTransactions,
  type User,
  type UpsertUser,
  type TaxProfile,
  type InsertTaxProfile,
  type CryptoTransaction,
  type InsertCryptoTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IAuthStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Tax profile operations
  getTaxProfile(userId: string, assessmentYear: string): Promise<TaxProfile | undefined>;
  createTaxProfile(profile: InsertTaxProfile): Promise<TaxProfile>;
  updateTaxProfile(id: string, profile: Partial<InsertTaxProfile>): Promise<TaxProfile>;
  getUserTaxProfiles(userId: string): Promise<TaxProfile[]>;
  
  // Crypto transaction operations
  createCryptoTransaction(transaction: InsertCryptoTransaction): Promise<CryptoTransaction>;
  getCryptoTransactions(userId: string, taxProfileId?: string): Promise<CryptoTransaction[]>;
  updateCryptoTransaction(id: string, transaction: Partial<InsertCryptoTransaction>): Promise<CryptoTransaction>;
  deleteCryptoTransaction(id: string): Promise<void>;
}

export class AuthDatabaseStorage implements IAuthStorage {
  // User operations for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Tax profile operations
  async getTaxProfile(userId: string, assessmentYear: string): Promise<TaxProfile | undefined> {
    try {
      const [profile] = await db
        .select()
        .from(taxProfiles)
        .where(eq(taxProfiles.userId, userId));
      return profile;
    } catch (error) {
      console.error('Error getting tax profile:', error);
      return undefined;
    }
  }

  async createTaxProfile(profileData: InsertTaxProfile): Promise<TaxProfile> {
    const [profile] = await db
      .insert(taxProfiles)
      .values(profileData)
      .returning();
    return profile;
  }

  async updateTaxProfile(id: string, profileData: Partial<InsertTaxProfile>): Promise<TaxProfile> {
    const [profile] = await db
      .update(taxProfiles)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(taxProfiles.id, id))
      .returning();
    return profile;
  }

  async getUserTaxProfiles(userId: string): Promise<TaxProfile[]> {
    return await db
      .select()
      .from(taxProfiles)
      .where(eq(taxProfiles.userId, userId))
      .orderBy(taxProfiles.assessmentYear);
  }

  // Crypto transaction operations
  async createCryptoTransaction(transactionData: InsertCryptoTransaction): Promise<CryptoTransaction> {
    const [transaction] = await db
      .insert(cryptoTransactions)
      .values(transactionData)
      .returning();
    return transaction;
  }

  async getCryptoTransactions(userId: string, taxProfileId?: string): Promise<CryptoTransaction[]> {
    return await db
      .select()
      .from(cryptoTransactions)
      .where(eq(cryptoTransactions.userId, userId))
      .orderBy(cryptoTransactions.transactionDate);
  }

  async updateCryptoTransaction(id: string, transactionData: Partial<InsertCryptoTransaction>): Promise<CryptoTransaction> {
    const [transaction] = await db
      .update(cryptoTransactions)
      .set(transactionData)
      .where(eq(cryptoTransactions.id, id))
      .returning();
    return transaction;
  }

  async deleteCryptoTransaction(id: string): Promise<void> {
    await db
      .delete(cryptoTransactions)
      .where(eq(cryptoTransactions.id, id));
  }
}

export const authStorage = new AuthDatabaseStorage();