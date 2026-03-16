// IndexedDB wrapper for offline storage
import { safeUUID } from './uuid';

const DB_NAME = 'autosFormentera';
const DB_VERSION = 1;

export interface PendingOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Store for pending sync operations
      if (!database.objectStoreNames.contains('pendingOperations')) {
        const store = database.createObjectStore('pendingOperations', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('table', 'table', { unique: false });
      }

      // Cache stores for each table
      const tables = ['time_logs', 'vehicles', 'vehicle_messages', 'parts', 'vehicle_anomalies', 'attendance_logs'];
      tables.forEach(table => {
        if (!database.objectStoreNames.contains(table)) {
          database.createObjectStore(table, { keyPath: 'id' });
        }
      });
    };
  });
}

export async function addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retries'>): Promise<string> {
  const database = await initDB();
  const id = crypto.randomUUID();
  const pendingOp: PendingOperation = {
    ...operation,
    id,
    timestamp: Date.now(),
    retries: 0,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('pendingOperations', 'readwrite');
    const store = transaction.objectStore('pendingOperations');
    const request = store.add(pendingOp);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingOperations(): Promise<PendingOperation[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('pendingOperations', 'readonly');
    const store = transaction.objectStore('pendingOperations');
    const index = store.index('timestamp');
    const request = index.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingOperation(id: string): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('pendingOperations', 'readwrite');
    const store = transaction.objectStore('pendingOperations');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updatePendingOperationRetries(id: string, retries: number): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('pendingOperations', 'readwrite');
    const store = transaction.objectStore('pendingOperations');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const op = getRequest.result;
      if (op) {
        op.retries = retries;
        store.put(op);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function cacheData<T extends { id: string }>(table: string, data: T[]): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(table, 'readwrite');
    const store = transaction.objectStore(table);

    // Clear existing data
    store.clear();

    // Add new data
    data.forEach(item => store.add(item));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getCachedData<T>(table: string): Promise<T[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(table, 'readonly');
    const store = transaction.objectStore(table);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addToCachedData<T extends { id: string }>(table: string, item: T): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(table, 'readwrite');
    const store = transaction.objectStore(table);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const operations = await getPendingOperations();
  return operations.length;
}
