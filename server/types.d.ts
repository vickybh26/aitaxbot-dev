/**
 * Ambient type declarations for server-side packages without .d.ts files.
 */

// ── firebase-admin ─────────────────────────────────────────────────────────
// (types provided by the package's own lib/index.d.ts stub — see node_modules)

// ── @getbrevo/brevo ────────────────────────────────────────────────────────
declare module '@getbrevo/brevo' {
  export class TransactionalEmailsApi {
    setApiKey(keyId: number, apiKey: string): void;
    sendTransacEmail(sendSmtpEmail: SendSmtpEmail): Promise<{ response: unknown; body: { messageId?: string } }>;
  }
  export class SendSmtpEmail {
    to?: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    sender?: { email: string; name?: string };
    replyTo?: { email: string; name?: string };
    subject?: string;
    htmlContent?: string;
    textContent?: string;
    attachment?: Array<{ name: string; content: string }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: Record<string, any>;
  }
  export enum TransactionalEmailsApiApiKeys {
    apiKey = 0,
  }
  export class AccountApi {
    setApiKey(keyId: number, apiKey: string): void;
    getAccount(): Promise<{ response: unknown; body: unknown }>;
  }
  export enum AccountApiApiKeys {
    apiKey = 0,
  }
}

// ── @google/genai ──────────────────────────────────────────────────────────
declare module '@google/genai' {
  interface GenerationConfig {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    stopSequences?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  interface GenerateContentParams {
    model: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contents: any;
    config?: GenerationConfig;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    systemInstruction?: any;
  }
  export class GoogleGenAI {
    constructor(config: { apiKey: string } | string);
    models: {
      generateContent(params: GenerateContentParams): Promise<{ text: string; candidates?: unknown[] }>;
    };
    getGenerativeModel(params: { model: string; generationConfig?: GenerationConfig }): GenerativeModel;
  }
  export class GenerativeModel {
    generateContent(request: string | { contents: unknown[]; generationConfig?: GenerationConfig }): Promise<GenerateContentResult>;
    startChat(params?: { history?: unknown[]; generationConfig?: GenerationConfig }): ChatSession;
  }
  interface ContentPart {
    text?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  interface Content {
    parts?: ContentPart[];
    role?: string;
  }
  interface Candidate {
    content?: Content;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  export interface GenerateContentResult {
    text?: string;
    candidates?: Candidate[];
    response: { text(): string; candidates?: Candidate[] };
  }
  export interface ChatSession {
    sendMessage(message: string): Promise<GenerateContentResult>;
  }
  export function genai(config: { apiKey: string }): GoogleGenAI;
}

// ── FirebaseFirestore namespace (used by server code) ──────────────────────
declare namespace FirebaseFirestore {
  type WhereFilterOp =
    | '<' | '<=' | '==' | '!=' | '>=' | '>'
    | 'array-contains' | 'in' | 'array-contains-any' | 'not-in';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface DocumentData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [field: string]: any;
  }
  interface DocumentSnapshot<T = DocumentData> {
    id: string;
    exists: boolean;
    data(): T | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(fieldPath: string): any;
    ref: DocumentReference<T>;
  }
  interface QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<T> {
    data(): T;
    ref: DocumentReference<T>;
  }
  interface QuerySnapshot<T = DocumentData> {
    docs: QueryDocumentSnapshot<T>[];
    empty: boolean;
    size: number;
    forEach(callback: (doc: QueryDocumentSnapshot<T>) => void): void;
  }
  interface CollectionReference<T = DocumentData> extends Query<T> {
    id: string;
    path: string;
    doc(documentPath?: string): DocumentReference<T>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    add(data: any): Promise<DocumentReference<T>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select(...fields: string[]): Query<any>;
  }
  interface DocumentReference<T = DocumentData> {
    id: string;
    path: string;
    get(): Promise<DocumentSnapshot<T>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set(data: any, options?: { merge?: boolean }): Promise<WriteResult>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update(data: any): Promise<WriteResult>;
    delete(): Promise<WriteResult>;
    collection(collectionPath: string): CollectionReference;
  }
  interface AggregateQuerySnapshot {
    data(): { count: number };
  }
  interface AggregateQuery {
    get(): Promise<AggregateQuerySnapshot>;
  }
  interface Query<T = DocumentData> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where(fieldPath: string, opStr: WhereFilterOp | string, value: any): Query<T>;
    orderBy(fieldPath: string, directionStr?: 'asc' | 'desc'): Query<T>;
    limit(limit: number): Query<T>;
    offset(offset: number): Query<T>;
    get(): Promise<QuerySnapshot<T>>;
    count(): AggregateQuery;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select(...fields: string[]): Query<any>;
  }
  interface Firestore {
    collection(collectionPath: string): CollectionReference;
    doc(documentPath: string): DocumentReference;
    batch(): WriteBatch;
    runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T>;
  }
  interface WriteBatch {
    set(ref: DocumentReference, data: object, options?: object): WriteBatch;
    update(ref: DocumentReference, data: object): WriteBatch;
    delete(ref: DocumentReference): WriteBatch;
    commit(): Promise<WriteResult[]>;
  }
  interface Transaction {
    get(ref: DocumentReference): Promise<DocumentSnapshot>;
    set(ref: DocumentReference, data: object): Transaction;
    update(ref: DocumentReference, data: object): Transaction;
    delete(ref: DocumentReference): Transaction;
  }
  interface WriteResult {
    writeTime: unknown;
  }
  type FieldValue = unknown;
  const FieldValue: {
    serverTimestamp(): FieldValue;
    delete(): FieldValue;
    arrayUnion(...elements: unknown[]): FieldValue;
    arrayRemove(...elements: unknown[]): FieldValue;
    increment(n: number): FieldValue;
  };
  interface Timestamp {
    toDate(): Date;
    toMillis(): number;
    seconds: number;
    nanoseconds: number;
  }
  const Timestamp: {
    now(): Timestamp;
    fromDate(date: Date): Timestamp;
    fromMillis(milliseconds: number): Timestamp;
  };
}
