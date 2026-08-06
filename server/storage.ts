import { getFirestore } from "./firebase";
import { randomUUID } from "crypto";
import { FirestoreCollection, COLLECTIONS } from "./firestoreHelper";
import type {
  User,
  UpsertUser,
  TaxProfile,
  InsertTaxProfile,
  CryptoTransaction,
  InsertCryptoTransaction,
  MutualFund,
  InsertMutualFund,
  MarketData,
  InsertMarketData,
  NewsArticle,
  InsertNewsArticle,
  IPOData,
  InsertIPOData,
  TaxDocument,
  InsertTaxDocument,
  ExtractedTaxData,
  InsertExtractedTaxData,
  TaxCalculationHistory,
  InsertTaxCalculationHistory,
  Firm,
  InsertFirm,
  Client,
  InsertClient,
  Invoice,
  InsertInvoice,
  InvoiceItem,
  InsertInvoiceItem,
  SalesRegister,
  InsertSalesRegister,
  PurchaseRegister,
  InsertPurchaseRegister,
  UserProfileLog,
  InsertUserProfileLog,
  TaxRates,
  InsertTaxRates
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUserByUsername(username: string): Promise<User | undefined>;
  getUser(id: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  
  // User Profile Log operations
  createProfileLog(log: InsertUserProfileLog): Promise<UserProfileLog>;
  getProfileLogs(userId: string): Promise<UserProfileLog[]>;
  
  // Tax Rates operations
  getTaxRates(assessmentYear: string, regime: string, ageGroup: string): Promise<TaxRates | undefined>;
  getAllTaxRates(): Promise<TaxRates[]>;
  createTaxRates(rates: InsertTaxRates): Promise<TaxRates>;
  updateTaxRates(id: string, rates: Partial<InsertTaxRates>): Promise<TaxRates>;
  
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
  
  getMutualFunds(): Promise<MutualFund[]>;
  getMutualFundByCode(schemeCode: string): Promise<MutualFund | undefined>;
  createMutualFund(fund: InsertMutualFund): Promise<MutualFund>;
  updateMutualFund(id: string, fund: Partial<InsertMutualFund>): Promise<MutualFund | undefined>;
  
  getMarketData(): Promise<MarketData[]>;
  getMarketDataBySymbol(symbol: string): Promise<MarketData | undefined>;
  createMarketData(data: InsertMarketData): Promise<MarketData>;
  updateMarketData(id: string, data: Partial<InsertMarketData>): Promise<MarketData | undefined>;
  
  getNewsArticles(category?: string): Promise<NewsArticle[]>;
  createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  
  getIPOData(): Promise<IPOData[]>;
  createIPOData(ipo: InsertIPOData): Promise<IPOData>;
  
  // Tax Document operations
  getTaxDocuments(userId: string): Promise<TaxDocument[]>;
  getTaxDocumentsByUserId(userId: string): Promise<TaxDocument[]>;
  getTaxDocument(id: string): Promise<TaxDocument | undefined>;
  createTaxDocument(document: InsertTaxDocument): Promise<TaxDocument>;
  updateTaxDocument(id: string, data: Partial<InsertTaxDocument>): Promise<TaxDocument | undefined>;
  deleteTaxDocument(id: string): Promise<boolean>;
  
  // Extracted Tax Data operations
  getExtractedTaxData(documentId: string): Promise<ExtractedTaxData | undefined>;
  createExtractedTaxData(data: InsertExtractedTaxData): Promise<ExtractedTaxData>;
  updateExtractedTaxData(id: string, data: Partial<InsertExtractedTaxData>): Promise<ExtractedTaxData | undefined>;
  
  // Accounting Module Operations
  // Firm operations
  getFirms(userId: string): Promise<Firm[]>;
  getFirm(id: string): Promise<Firm | undefined>;
  createFirm(firm: InsertFirm): Promise<Firm>;
  updateFirm(id: string, firm: Partial<InsertFirm>): Promise<Firm>;
  deleteFirm(id: string): Promise<void>;
  
  // Client operations
  getClients(firmId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  
  // Invoice operations
  getInvoices(firmId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
  
  // Invoice Item operations
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: string, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem>;
  deleteInvoiceItem(id: string): Promise<void>;
  
  // Sales Register operations
  getSalesRegister(firmId: string, month: string): Promise<SalesRegister | undefined>;
  getAllSalesRegisters(firmId: string): Promise<SalesRegister[]>;
  updateSalesRegister(firmId: string, month: string, data: Partial<InsertSalesRegister>): Promise<SalesRegister>;
  
  // Purchase Register operations
  getPurchaseRegister(firmId: string, month: string): Promise<PurchaseRegister | undefined>;
  getAllPurchaseRegisters(firmId: string): Promise<PurchaseRegister[]>;
  updatePurchaseRegister(firmId: string, month: string, data: Partial<InsertPurchaseRegister>): Promise<PurchaseRegister>;
  
  // Tax Calculation History operations
  getTaxCalculationHistory(userId: string): Promise<TaxCalculationHistory[]>;
  getTaxCalculationById(id: string): Promise<TaxCalculationHistory | undefined>;
  createTaxCalculation(data: InsertTaxCalculationHistory): Promise<TaxCalculationHistory>;
  deleteTaxCalculation(id: string): Promise<void>;
  deleteExpiredTaxCalculations(userId: string): Promise<number>;
}

// Initialize collection helpers for cleaner code
const userProfileLogsCollection = new FirestoreCollection<UserProfileLog & { id: string }>(COLLECTIONS.USER_PROFILE_LOGS);
const taxRatesCollection = new FirestoreCollection<TaxRates & { id: string }>(COLLECTIONS.TAX_RATES);

export class FirestoreStorage implements IStorage {
  private get db() {
    return getFirestore();
  }

  // ==========================================
  // USER OPERATIONS
  // ==========================================

  async getUser(id: string): Promise<User | undefined> {
    try {
      const doc = await this.db.collection('users').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as unknown as User;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const userId = userData.id || randomUUID();
    const docRef = this.db.collection('users').doc(userId);
    const existingDoc = await docRef.get();

    if (existingDoc.exists) {
      // User already exists — only update fields managed by the auth provider.
      // NEVER overwrite user-edited fields (firstName, lastName, mobile, gender,
      // occupation, city, state, isProfileComplete) so profile edits are preserved.
      const authUpdate: Partial<User> & { updatedAt: Date } = {
        email: userData.email || (existingDoc.data()! as any).email,
        profileImageUrl: userData.profileImageUrl || (existingDoc.data()! as any).profileImageUrl,
        authProvider: (userData as any).authProvider || (existingDoc.data()! as any).authProvider || 'google',
        updatedAt: new Date(),
      };
      await docRef.update(authUpdate);
      return { id: userId, ...existingDoc.data(), ...authUpdate } as unknown as User;
    }

    // New user — initialise all fields from the auth token payload.
    const user: User = {
      id: userId,
      email: userData.email ?? '',
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      mobile: (userData as any).mobile || null,
      gender: (userData as any).gender || null,
      occupation: (userData as any).occupation || null,
      city: (userData as any).city || null,
      state: (userData as any).state || null,
      authProvider: (userData as any).authProvider || 'google',
      isProfileComplete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await docRef.set(user);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const snapshot = await this.db.collection('users')
        .where('email', '==', username)
        .limit(1)
        .get();
      
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as unknown as User;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: any): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id,
      email: insertUser.email || insertUser.username,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profileImageUrl: null,
      mobile: insertUser.mobile || null,
      gender: insertUser.gender || null,
      occupation: insertUser.occupation || null,
      city: insertUser.city || null,
      state: insertUser.state || null,
      authProvider: insertUser.authProvider || 'email',
      isProfileComplete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await this.db.collection('users').doc(id).set(user);
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    try {
      const currentUser = await this.getUser(id);
      if (!currentUser) {
        throw new Error('User not found');
      }

      const fieldsToTrack = ['firstName', 'lastName', 'mobile', 'gender', 'occupation', 'city', 'state', 'email'];

      for (const field of fieldsToTrack) {
        const oldValue = (currentUser as any)[field];
        const newValue = (data as any)[field];

        if (newValue !== undefined && oldValue !== newValue) {
          // Non-fatal — audit log failure must never block the actual profile update
          this.createProfileLog({
            userId: id,
            fieldChanged: field,
            oldValue: oldValue?.toString() || null,
            newValue: newValue?.toString() || null,
          }).catch(err => console.warn('[Storage] Profile log write failed (non-fatal):', err));
        }
      }

      const updateData = {
        ...data,
        updatedAt: new Date()
      };
      
      await this.db.collection('users').doc(id).update(updateData);
      const doc = await this.db.collection('users').doc(id).get();
      return { id: doc.id, ...doc.data() } as unknown as User;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // ==========================================
  // USER PROFILE LOG OPERATIONS
  // ==========================================

  async createProfileLog(log: InsertUserProfileLog): Promise<UserProfileLog> {
    return await userProfileLogsCollection.create(log as any) as unknown as UserProfileLog;
  }

  async getProfileLogs(userId: string): Promise<UserProfileLog[]> {
    return await userProfileLogsCollection.query(
      [{ field: 'userId', operator: '==', value: userId }],
      { orderBy: { field: 'changedAt', direction: 'desc' } }
    ) as unknown as UserProfileLog[];
  }

  // ==========================================
  // TAX RATES OPERATIONS
  // ==========================================

  async getTaxRates(assessmentYear: string, regime: string, ageGroup: string): Promise<TaxRates | undefined> {
    const result = await taxRatesCollection.queryOne([
      { field: 'assessmentYear', operator: '==', value: assessmentYear },
      { field: 'regime', operator: '==', value: regime },
      { field: 'ageGroup', operator: '==', value: ageGroup },
      { field: 'isActive', operator: '==', value: true }
    ]);
    return result as unknown as TaxRates | undefined;
  }

  async getAllTaxRates(): Promise<TaxRates[]> {
    // Simple query without composite index requirement
    // We'll sort in-memory instead
    const rates = await taxRatesCollection.getAll() as unknown as TaxRates[];
    return rates.sort((a, b) => (b.assessmentYear || '').localeCompare(a.assessmentYear || ''));
  }

  async createTaxRates(rates: InsertTaxRates): Promise<TaxRates> {
    return await taxRatesCollection.create(rates as any) as unknown as TaxRates;
  }

  async updateTaxRates(id: string, rates: Partial<InsertTaxRates>): Promise<TaxRates> {
    return await taxRatesCollection.update(id, rates as any) as unknown as TaxRates;
  }

  // ==========================================
  // TAX PROFILE OPERATIONS
  // ==========================================

  async getTaxProfile(userId: string, assessmentYear: string): Promise<TaxProfile | undefined> {
    try {
      const snapshot = await this.db.collection('taxProfiles')
        .where('userId', '==', userId)
        .where('assessmentYear', '==', assessmentYear)
        .limit(1)
        .get();
      
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as unknown as TaxProfile;
    } catch (error) {
      console.error('Error getting tax profile:', error);
      return undefined;
    }
  }

  async createTaxProfile(profileData: InsertTaxProfile): Promise<TaxProfile> {
    const id = randomUUID();
    const profile: TaxProfile = {
      id,
      ...profileData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as TaxProfile;
    
    await this.db.collection('taxProfiles').doc(id).set(profile);
    return profile;
  }

  async updateTaxProfile(id: string, profileData: Partial<InsertTaxProfile>): Promise<TaxProfile> {
    const docRef = this.db.collection('taxProfiles').doc(id);
    const updateData = {
      ...profileData,
      updatedAt: new Date(),
    };
    await docRef.update(updateData);
    
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as TaxProfile;
  }

  async getUserTaxProfiles(userId: string): Promise<TaxProfile[]> {
    // Equality filter only, then sort in memory — the same pattern used
    // throughout this codebase to avoid composite indexes.
    //
    // This previously chained .orderBy('assessmentYear') (ASC) onto the
    // .where('userId'), which needs a `userId ASC + assessmentYear ASC`
    // composite index. firestore.indexes.json only declares the DESC variant,
    // which does not serve an ASC sort, so this threw a missing-index error
    // every time it ran. The caller swallowed it with `.catch(() => [])`, so
    // the dashboard just showed 0 and nobody noticed.
    const snapshot = await this.db.collection('taxProfiles')
      .where('userId', '==', userId)
      .get();

    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as unknown as TaxProfile))
      .sort((a: any, b: any) =>
        String(a.assessmentYear ?? '').localeCompare(String(b.assessmentYear ?? ''))
      );
  }

  // ==========================================
  // CRYPTO TRANSACTION OPERATIONS
  // ==========================================

  async createCryptoTransaction(transactionData: InsertCryptoTransaction): Promise<CryptoTransaction> {
    const id = randomUUID();
    const transaction: CryptoTransaction = {
      id,
      ...transactionData,
      createdAt: new Date(),
    } as unknown as CryptoTransaction;
    
    await this.db.collection('cryptoTransactions').doc(id).set(transaction);
    return transaction;
  }

  async getCryptoTransactions(userId: string, taxProfileId?: string): Promise<CryptoTransaction[]> {
    let query = this.db.collection('cryptoTransactions').where('userId', '==', userId);
    
    if (taxProfileId) {
      query = query.where('taxProfileId', '==', taxProfileId);
    }
    
    const snapshot = await query.orderBy('transactionDate').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as CryptoTransaction));
  }

  async updateCryptoTransaction(id: string, transactionData: Partial<InsertCryptoTransaction>): Promise<CryptoTransaction> {
    const docRef = this.db.collection('cryptoTransactions').doc(id);
    await docRef.update(transactionData);
    
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as CryptoTransaction;
  }

  async deleteCryptoTransaction(id: string): Promise<void> {
    await this.db.collection('cryptoTransactions').doc(id).delete();
  }

  // ==========================================
  // LEGACY/STUB OPERATIONS
  // ==========================================

  async getMutualFunds(): Promise<MutualFund[]> {
    const snapshot = await this.db.collection('mutualFunds').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as MutualFund));
  }

  async getMutualFundByCode(schemeCode: string): Promise<MutualFund | undefined> {
    const snapshot = await this.db.collection('mutualFunds')
      .where('schemeCode', '==', schemeCode)
      .limit(1)
      .get();
    
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as unknown as MutualFund;
  }

  async createMutualFund(insertFund: InsertMutualFund): Promise<MutualFund> {
    const id = randomUUID();
    const fund: MutualFund = {
      id,
      ...insertFund,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as MutualFund;
    
    await this.db.collection('mutualFunds').doc(id).set(fund);
    return fund;
  }

  async updateMutualFund(id: string, updateData: Partial<InsertMutualFund>): Promise<MutualFund | undefined> {
    try {
      const docRef = this.db.collection('mutualFunds').doc(id);
      await docRef.update({ ...updateData, updatedAt: new Date() });
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() } as unknown as MutualFund;
    } catch (error) {
      return undefined;
    }
  }

  async getMarketData(): Promise<MarketData[]> {
    const snapshot = await this.db.collection('marketData').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as MarketData));
  }

  async getMarketDataBySymbol(symbol: string): Promise<MarketData | undefined> {
    const snapshot = await this.db.collection('marketData')
      .where('symbol', '==', symbol)
      .limit(1)
      .get();
    
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as unknown as MarketData;
  }

  async createMarketData(insertData: InsertMarketData): Promise<MarketData> {
    const id = randomUUID();
    const data: MarketData = {
      id,
      ...insertData,
      updatedAt: new Date()
    } as unknown as MarketData;
    
    await this.db.collection('marketData').doc(id).set(data);
    return data;
  }

  async updateMarketData(id: string, updateData: Partial<InsertMarketData>): Promise<MarketData | undefined> {
    try {
      const docRef = this.db.collection('marketData').doc(id);
      await docRef.update({ ...updateData, updatedAt: new Date() });
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() } as unknown as MarketData;
    } catch (error) {
      return undefined;
    }
  }

  async getNewsArticles(category?: string): Promise<NewsArticle[]> {
    let query = this.db.collection('newsArticles');
    
    if (category && category !== 'all') {
      query = query.where('category', '==', category) as any;
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as NewsArticle));
  }

  async createNewsArticle(insertArticle: InsertNewsArticle): Promise<NewsArticle> {
    const id = randomUUID();
    const article: NewsArticle = {
      id,
      ...insertArticle,
      createdAt: new Date()
    } as unknown as NewsArticle;
    
    await this.db.collection('newsArticles').doc(id).set(article);
    return article;
  }

  async getIPOData(): Promise<IPOData[]> {
    const snapshot = await this.db.collection('ipoData').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as IPOData));
  }

  async createIPOData(insertIPO: InsertIPOData): Promise<IPOData> {
    const id = randomUUID();
    const ipo: IPOData = {
      id,
      ...insertIPO,
      createdAt: new Date()
    } as unknown as IPOData;
    
    await this.db.collection('ipoData').doc(id).set(ipo);
    return ipo;
  }

  // ==========================================
  // TAX DOCUMENT OPERATIONS
  // ==========================================

  async getTaxDocuments(userId: string): Promise<TaxDocument[]> {
    try {
      const snapshot = await this.db.collection('taxDocuments')
        .where('userId', '==', userId)
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TaxDocument));
    } catch (error) {
      console.error('Error getting tax documents:', error);
      return [];
    }
  }

  async getTaxDocumentsByUserId(userId: string): Promise<TaxDocument[]> {
    return this.getTaxDocuments(userId);
  }

  async getTaxDocument(id: string): Promise<TaxDocument | undefined> {
    try {
      const doc = await this.db.collection('taxDocuments').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as unknown as TaxDocument;
    } catch (error) {
      console.error('Error getting tax document:', error);
      return undefined;
    }
  }

  async createTaxDocument(insertDocument: InsertTaxDocument): Promise<TaxDocument> {
    try {
      const id = randomUUID();
      const document: TaxDocument = {
        id,
        userId: insertDocument.userId,
        documentType: insertDocument.documentType,
        fileName: insertDocument.fileName,
        filePath: insertDocument.filePath,
        firebaseFileId: insertDocument.firebaseFileId || null,
        downloadUrl: insertDocument.downloadUrl || null,
        fileSize: insertDocument.fileSize || null,
        expiresAt: insertDocument.expiresAt || null,
        uploadedAt: new Date(),
        isProcessed: false,
        processingStatus: insertDocument.processingStatus || 'pending',
        extractedData: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date()
      } as unknown as TaxDocument;
      
      await this.db.collection('taxDocuments').doc(id).set(document);
      return document;
    } catch (error) {
      console.error('Error creating tax document:', error);
      throw error;
    }
  }

  async updateTaxDocument(id: string, updateData: Partial<InsertTaxDocument>): Promise<TaxDocument | undefined> {
    try {
      const docRef = this.db.collection('taxDocuments').doc(id);
      await docRef.update({ ...updateData, updatedAt: new Date() });
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() } as unknown as TaxDocument;
    } catch (error) {
      console.error('Error updating tax document:', error);
      return undefined;
    }
  }

  async deleteTaxDocument(id: string): Promise<boolean> {
    try {
      await this.db.collection('taxDocuments').doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting tax document:', error);
      return false;
    }
  }

  // ==========================================
  // EXTRACTED TAX DATA OPERATIONS
  // ==========================================

  async getExtractedTaxData(documentId: string): Promise<ExtractedTaxData | undefined> {
    try {
      const snapshot = await this.db.collection('extractedTaxData')
        .where('documentId', '==', documentId)
        .limit(1)
        .get();
      
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as unknown as ExtractedTaxData;
    } catch (error) {
      console.error('Error getting extracted tax data:', error);
      return undefined;
    }
  }

  async createExtractedTaxData(insertData: InsertExtractedTaxData): Promise<ExtractedTaxData> {
    try {
      const id = randomUUID();
      const data: ExtractedTaxData = {
        id,
        ...insertData,
        extractedAt: new Date(),
        createdAt: new Date()
      } as unknown as ExtractedTaxData;
      
      await this.db.collection('extractedTaxData').doc(id).set(data);
      return data;
    } catch (error) {
      console.error('Error creating extracted tax data:', error);
      throw error;
    }
  }

  async updateExtractedTaxData(id: string, updateData: Partial<InsertExtractedTaxData>): Promise<ExtractedTaxData | undefined> {
    try {
      const docRef = this.db.collection('extractedTaxData').doc(id);
      await docRef.update(updateData);
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() } as unknown as ExtractedTaxData;
    } catch (error) {
      console.error('Error updating extracted tax data:', error);
      return undefined;
    }
  }

  // ==========================================
  // ACCOUNTING MODULE - FIRM OPERATIONS
  // ==========================================

  async getFirms(userId: string): Promise<Firm[]> {
    try {
      const snapshot = await this.db.collection('firms')
        .where('userId', '==', userId)
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Firm));
    } catch (error) {
      console.error('Error getting firms:', error);
      return [];
    }
  }

  async getFirm(id: string): Promise<Firm | undefined> {
    try {
      const doc = await this.db.collection('firms').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as unknown as Firm;
    } catch (error) {
      console.error('Error getting firm:', error);
      return undefined;
    }
  }

  async createFirm(firmData: InsertFirm): Promise<Firm> {
    const id = randomUUID();
    const firm: Firm = {
      id,
      ...firmData,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as Firm;
    
    await this.db.collection('firms').doc(id).set(firm);
    return firm;
  }

  async updateFirm(id: string, firmData: Partial<InsertFirm>): Promise<Firm> {
    const docRef = this.db.collection('firms').doc(id);
    await docRef.update({ ...firmData, updatedAt: new Date() });
    
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as Firm;
  }

  async deleteFirm(id: string): Promise<void> {
    await this.db.collection('firms').doc(id).delete();
  }

  // ==========================================
  // ACCOUNTING MODULE - CLIENT OPERATIONS
  // ==========================================

  async getClients(firmId: string): Promise<Client[]> {
    try {
      const snapshot = await this.db.collection('clients')
        .where('firmId', '==', firmId)
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Client));
    } catch (error) {
      console.error('Error getting clients:', error);
      return [];
    }
  }

  async getClient(id: string): Promise<Client | undefined> {
    try {
      const doc = await this.db.collection('clients').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as unknown as Client;
    } catch (error) {
      console.error('Error getting client:', error);
      return undefined;
    }
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = {
      id,
      ...clientData,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as Client;
    
    await this.db.collection('clients').doc(id).set(client);
    return client;
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client> {
    const docRef = this.db.collection('clients').doc(id);
    await docRef.update({ ...clientData, updatedAt: new Date() });
    
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as Client;
  }

  async deleteClient(id: string): Promise<void> {
    await this.db.collection('clients').doc(id).delete();
  }

  // ==========================================
  // ACCOUNTING MODULE - INVOICE OPERATIONS
  // ==========================================

  async getInvoices(firmId: string): Promise<Invoice[]> {
    try {
      const snapshot = await this.db.collection('invoices')
        .where('firmId', '==', firmId)
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Invoice));
    } catch (error) {
      console.error('Error getting invoices:', error);
      return [];
    }
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    try {
      const doc = await this.db.collection('invoices').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as unknown as Invoice;
    } catch (error) {
      console.error('Error getting invoice:', error);
      return undefined;
    }
  }

  async createInvoice(invoiceData: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const invoice: Invoice = {
      id,
      ...invoiceData,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as Invoice;
    
    await this.db.collection('invoices').doc(id).set(invoice);
    return invoice;
  }

  async updateInvoice(id: string, invoiceData: Partial<InsertInvoice>): Promise<Invoice> {
    const docRef = this.db.collection('invoices').doc(id);
    await docRef.update({ ...invoiceData, updatedAt: new Date() });
    
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as Invoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    await this.db.collection('invoices').doc(id).delete();
  }

  // ==========================================
  // ACCOUNTING MODULE - INVOICE ITEM OPERATIONS
  // ==========================================

  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    try {
      const snapshot = await this.db.collection('invoiceItems')
        .where('invoiceId', '==', invoiceId)
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as InvoiceItem));
    } catch (error) {
      console.error('Error getting invoice items:', error);
      return [];
    }
  }

  async createInvoiceItem(itemData: InsertInvoiceItem): Promise<InvoiceItem> {
    const id = randomUUID();
    const item: InvoiceItem = {
      id,
      ...itemData,
      createdAt: new Date()
    } as unknown as InvoiceItem;
    
    await this.db.collection('invoiceItems').doc(id).set(item);
    return item;
  }

  async updateInvoiceItem(id: string, itemData: Partial<InsertInvoiceItem>): Promise<InvoiceItem> {
    const docRef = this.db.collection('invoiceItems').doc(id);
    await docRef.update(itemData);
    
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as InvoiceItem;
  }

  async deleteInvoiceItem(id: string): Promise<void> {
    await this.db.collection('invoiceItems').doc(id).delete();
  }

  // ==========================================
  // ACCOUNTING MODULE - SALES REGISTER OPERATIONS
  // ==========================================

  async getSalesRegister(firmId: string, month: string): Promise<SalesRegister | undefined> {
    try {
      const snapshot = await this.db.collection('salesRegister')
        .where('firmId', '==', firmId)
        .where('month', '==', month)
        .limit(1)
        .get();
      
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as unknown as SalesRegister;
    } catch (error) {
      console.error('Error getting sales register:', error);
      return undefined;
    }
  }

  async updateSalesRegister(firmId: string, month: string, data: Partial<InsertSalesRegister>): Promise<SalesRegister> {
    try {
      const existing = await this.getSalesRegister(firmId, month);
      
      if (existing) {
        const docRef = this.db.collection('salesRegister').doc(existing.id);
        await docRef.update({ ...data, updatedAt: new Date() });
        const doc = await docRef.get();
        return { id: doc.id, ...doc.data() } as unknown as SalesRegister;
      } else {
        const id = randomUUID();
        const register: SalesRegister = {
          id,
          firmId,
          month,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        } as unknown as SalesRegister;
        
        await this.db.collection('salesRegister').doc(id).set(register);
        return register;
      }
    } catch (error) {
      console.error('Error updating sales register:', error);
      throw error;
    }
  }

  async getAllSalesRegisters(firmId: string): Promise<SalesRegister[]> {
    try {
      const snapshot = await this.db.collection('salesRegister')
        .where('firmId', '==', firmId)
        .orderBy('month', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as SalesRegister));
    } catch (error) {
      console.error('Error getting all sales registers:', error);
      return [];
    }
  }

  // ==========================================
  // ACCOUNTING MODULE - PURCHASE REGISTER OPERATIONS
  // ==========================================

  async getPurchaseRegister(firmId: string, month: string): Promise<PurchaseRegister | undefined> {
    try {
      const snapshot = await this.db.collection('purchaseRegister')
        .where('firmId', '==', firmId)
        .where('month', '==', month)
        .limit(1)
        .get();
      
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as unknown as PurchaseRegister;
    } catch (error) {
      console.error('Error getting purchase register:', error);
      return undefined;
    }
  }

  async getAllPurchaseRegisters(firmId: string): Promise<PurchaseRegister[]> {
    try {
      const snapshot = await this.db.collection('purchaseRegister')
        .where('firmId', '==', firmId)
        .orderBy('month', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as PurchaseRegister));
    } catch (error) {
      console.error('Error getting all purchase registers:', error);
      return [];
    }
  }

  async updatePurchaseRegister(firmId: string, month: string, data: Partial<InsertPurchaseRegister>): Promise<PurchaseRegister> {
    try {
      const existing = await this.getPurchaseRegister(firmId, month);
      
      if (existing) {
        const docRef = this.db.collection('purchaseRegister').doc(existing.id);
        await docRef.update({ ...data, updatedAt: new Date() });
        const doc = await docRef.get();
        return { id: doc.id, ...doc.data() } as unknown as PurchaseRegister;
      } else {
        const id = randomUUID();
        const register: PurchaseRegister = {
          id,
          firmId,
          month,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        } as unknown as PurchaseRegister;
        
        await this.db.collection('purchaseRegister').doc(id).set(register);
        return register;
      }
    } catch (error) {
      console.error('Error updating purchase register:', error);
      throw error;
    }
  }

  // ==========================================
  // TAX CALCULATION HISTORY OPERATIONS
  // ==========================================

  async getTaxCalculationHistory(userId: string): Promise<TaxCalculationHistory[]> {
    try {
      await this.deleteExpiredTaxCalculations(userId);
      
      const snapshot = await this.db.collection('taxCalculationHistory')
        .where('userId', '==', userId)
        .get();
      
      const results = snapshot.docs.map(doc => {
        const data = doc.data() as Record<string, any>;
        return {
          id: doc.id,
          ...data,
          createdAt: data['createdAt']?.toDate?.() || data['createdAt'],
          expiresAt: data['expiresAt']?.toDate?.() || data['expiresAt'],
        } as unknown as TaxCalculationHistory;
      });

      return results
        .sort((a, b) => new Date(b.calculatedAt as string).getTime() - new Date(a.calculatedAt as string).getTime())
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting tax calculation history:', error);
      return [];
    }
  }

  async getTaxCalculationById(id: string): Promise<TaxCalculationHistory | undefined> {
    try {
      const doc = await this.db.collection('taxCalculationHistory').doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data() as Record<string, any>;
      return {
        id: doc.id,
        ...data,
        createdAt: data?.['createdAt']?.toDate?.() || data?.['createdAt'],
        expiresAt: data?.['expiresAt']?.toDate?.() || data?.['expiresAt'],
      } as unknown as TaxCalculationHistory;
    } catch (error) {
      console.error('Error getting tax calculation:', error);
      return undefined;
    }
  }

  async createTaxCalculation(data: InsertTaxCalculationHistory): Promise<TaxCalculationHistory> {
    try {
      const existingCalcs = await this.db.collection('taxCalculationHistory')
        .where('userId', '==', data.userId)
        .get();
      
      if (existingCalcs.docs.length >= 10) {
        const sortedDocs = existingCalcs.docs
          .map(doc => ({ doc, data: doc.data() as Record<string, any> }))
          .sort((a, b) => {
            const dateA = a.data['createdAt']?.toDate?.() || new Date(a.data['createdAt']);
            const dateB = b.data['createdAt']?.toDate?.() || new Date(b.data['createdAt']);
            return dateB.getTime() - dateA.getTime();
          });
        
        const toDelete = sortedDocs.slice(9);
        for (const item of toDelete) {
          await item.doc.ref.delete();
        }
      }
      
      const id = randomUUID();
      const calculation: TaxCalculationHistory = {
        id,
        ...data,
        createdAt: new Date(),
      } as unknown as TaxCalculationHistory;
      
      await this.db.collection('taxCalculationHistory').doc(id).set(calculation);
      return calculation;
    } catch (error) {
      console.error('Error creating tax calculation:', error);
      throw error;
    }
  }

  async deleteTaxCalculation(id: string): Promise<void> {
    try {
      await this.db.collection('taxCalculationHistory').doc(id).delete();
    } catch (error) {
      console.error('Error deleting tax calculation:', error);
      throw error;
    }
  }

  async deleteExpiredTaxCalculations(userId: string): Promise<number> {
    try {
      const now = new Date();
      const snapshot = await this.db.collection('taxCalculationHistory')
        .where('userId', '==', userId)
        .where('expiresAt', '<', now)
        .get();
      
      let deleted = 0;
      for (const doc of snapshot.docs) {
        await doc.ref.delete();
        deleted++;
      }
      
      if (deleted > 0) {
        console.log(`Deleted ${deleted} expired tax calculations for user ${userId}`);
      }
      
      return deleted;
    } catch (error) {
      console.error('Error deleting expired tax calculations:', error);
      return 0;
    }
  }
}

export const storage = new FirestoreStorage();
