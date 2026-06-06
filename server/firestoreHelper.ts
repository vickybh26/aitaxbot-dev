import { getFirestore } from "./firebase";
import { randomUUID } from "crypto";

export interface QueryFilter {
  field: string;
  operator: FirebaseFirestore.WhereFilterOp;
  value: any;
}

export interface QueryOptions {
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
}

export class FirestoreCollection<T extends { id: string }> {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  private get db() {
    return getFirestore();
  }

  private get collection() {
    return this.db.collection(this.collectionName);
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      const id = randomUUID();
      const now = new Date();
      const document = {
        id,
        ...data,
        createdAt: now,
        updatedAt: now
      } as unknown as T;
      
      await this.collection.doc(id).set(document);
      return document;
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw error;
    }
  }

  async getById(id: string): Promise<T | undefined> {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as T;
    } catch (error) {
      console.error(`Error getting ${this.collectionName} by id:`, error);
      return undefined;
    }
  }

  async getAll(options?: QueryOptions): Promise<T[]> {
    try {
      let query: FirebaseFirestore.Query = this.collection;
      
      if (options?.orderBy) {
        query = query.orderBy(options.orderBy.field, options.orderBy.direction);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      console.error(`Error getting all ${this.collectionName}:`, error);
      return [];
    }
  }

  async query(filters: QueryFilter[], options?: QueryOptions): Promise<T[]> {
    try {
      let query: FirebaseFirestore.Query = this.collection;
      
      for (const filter of filters) {
        query = query.where(filter.field, filter.operator, filter.value);
      }
      
      if (options?.orderBy) {
        query = query.orderBy(options.orderBy.field, options.orderBy.direction);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      console.error(`Error querying ${this.collectionName}:`, error);
      return [];
    }
  }

  async queryOne(filters: QueryFilter[]): Promise<T | undefined> {
    const results = await this.query(filters, { limit: 1 });
    return results[0];
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T> {
    try {
      const docRef = this.collection.doc(id);
      const updateData = {
        ...data,
        updatedAt: new Date()
      };
      
      await docRef.update(updateData);
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() } as T;
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.collection.doc(id).delete();
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  async upsert(id: string, data: Omit<T, 'id'>): Promise<T> {
    try {
      const existing = await this.getById(id);
      if (existing) {
        return await this.update(id, data as Partial<Omit<T, 'id' | 'createdAt'>>);
      } else {
        const now = new Date();
        const document = {
          id,
          ...data,
          createdAt: now,
          updatedAt: now
        } as unknown as T;
        await this.collection.doc(id).set(document);
        return document;
      }
    } catch (error) {
      console.error(`Error upserting ${this.collectionName}:`, error);
      throw error;
    }
  }

  async count(filters?: QueryFilter[]): Promise<number> {
    try {
      let query: FirebaseFirestore.Query = this.collection;
      
      if (filters) {
        for (const filter of filters) {
          query = query.where(filter.field, filter.operator, filter.value);
        }
      }
      
      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch (error) {
      console.error(`Error counting ${this.collectionName}:`, error);
      return 0;
    }
  }

  async deleteMany(filters: QueryFilter[]): Promise<number> {
    try {
      const docs = await this.query(filters);
      const batch = this.db.batch();
      
      for (const doc of docs) {
        batch.delete(this.collection.doc(doc.id));
      }
      
      await batch.commit();
      return docs.length;
    } catch (error) {
      console.error(`Error deleting many ${this.collectionName}:`, error);
      return 0;
    }
  }
}

export const COLLECTIONS = {
  USERS: 'users',
  USER_PROFILE_LOGS: 'userProfileLogs',
  TAX_PROFILES: 'taxProfiles',
  TAX_RATES: 'taxRates',
  TAX_CALCULATION_HISTORY: 'taxCalculationHistory',
  CRYPTO_TRANSACTIONS: 'cryptoTransactions',
  TAX_DOCUMENTS: 'taxDocuments',
  EXTRACTED_TAX_DATA: 'extractedTaxData',
  FIRMS: 'firms',
  CLIENTS: 'clients',
  INVOICES: 'invoices',
  INVOICE_ITEMS: 'invoiceItems',
  SALES_REGISTER: 'salesRegister',
  PURCHASE_REGISTER: 'purchaseRegister',
  CONTACT_INQUIRIES: 'contactInquiries',
  MUTUAL_FUNDS: 'mutualFunds',
  MARKET_DATA: 'marketData',
  NEWS_ARTICLES: 'newsArticles',
  IPO_DATA: 'ipoData',
  CA_PROFILES: 'caProfiles',
  CA_CONTACT_REQUESTS: 'caContactRequests'
} as const;
