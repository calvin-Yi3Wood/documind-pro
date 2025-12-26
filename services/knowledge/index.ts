/**
 * Knowledge Service - 知识库服务
 *
 * 使用 IndexedDB 进行本地持久化存储
 * 支持文件上传、文本内容、URL 导入
 */

/**
 * 知识源类型
 */
export interface KnowledgeSource {
  id: string;
  name: string;
  type: 'file' | 'text' | 'url';
  content: string;
  enabled: boolean;
  size?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 存储的知识源格式（JSON 可序列化）
 */
interface StoredKnowledgeSource {
  id: string;
  name: string;
  type: 'file' | 'text' | 'url';
  content: string;
  enabled: boolean;
  size?: number;
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = 'documind_knowledge';
const DB_VERSION = 1;
const STORE_NAME = 'sources';

/**
 * 知识库服务类
 */
class KnowledgeService {
  private db: IDBDatabase | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (typeof indexedDB === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open knowledge database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('enabled', 'enabled', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not available');
    }
    return this.db;
  }

  /**
   * 获取所有知识源
   */
  async getSources(): Promise<KnowledgeSource[]> {
    try {
      const db = await this.ensureDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const stored = request.result as StoredKnowledgeSource[];
          const sources = stored.map((s) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          }));
          resolve(sources);
        };

        request.onerror = () => reject(request.error);
      });
    } catch {
      console.warn('IndexedDB not available, returning empty array');
      return [];
    }
  }

  /**
   * 添加知识源
   */
  async addSource(
    name: string,
    type: 'file' | 'text' | 'url',
    content: string
  ): Promise<KnowledgeSource> {
    const db = await this.ensureDb();

    const id = `ks_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    const source: KnowledgeSource = {
      id,
      name,
      type,
      content,
      enabled: true,
      size: content.length,
      createdAt: now,
      updatedAt: now,
    };

    const stored: StoredKnowledgeSource = {
      ...source,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(stored);

      request.onsuccess = () => resolve(source);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 从文件添加知识源
   */
  async addFileSource(file: File): Promise<KnowledgeSource> {
    const content = await this.readFileContent(file);
    return this.addSource(file.name, 'file', content);
  }

  /**
   * 读取文件内容
   */
  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          resolve('');
        }
      };

      reader.onerror = () => reject(reader.error);

      // 根据文件类型选择读取方式
      if (file.type === 'application/pdf') {
        // PDF 需要特殊处理，这里暂时作为 base64
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  /**
   * 删除知识源
   */
  async removeSource(id: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 切换知识源启用状态
   */
  async toggleSource(id: string): Promise<KnowledgeSource | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const stored = getRequest.result as StoredKnowledgeSource | undefined;
        if (!stored) {
          resolve(null);
          return;
        }

        stored.enabled = !stored.enabled;
        stored.updatedAt = new Date().toISOString();

        const putRequest = store.put(stored);
        putRequest.onsuccess = () => {
          resolve({
            ...stored,
            createdAt: new Date(stored.createdAt),
            updatedAt: new Date(stored.updatedAt),
          });
        };
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * 获取启用的知识源内容（用于 AI 上下文）
   */
  async getEnabledContent(): Promise<string> {
    const sources = await this.getSources();
    const enabled = sources.filter((s) => s.enabled);

    if (enabled.length === 0) {
      return '';
    }

    return enabled
      .map((s) => `--- ${s.name} ---\n${s.content}`)
      .join('\n\n');
  }

  /**
   * 清空所有知识源
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// 导出单例
export const knowledgeService = new KnowledgeService();

// 导出便捷函数
export const getSources = () => knowledgeService.getSources();
export const addSource = (name: string, type: 'file' | 'text' | 'url', content: string) =>
  knowledgeService.addSource(name, type, content);
export const addFileSource = (file: File) => knowledgeService.addFileSource(file);
export const removeSource = (id: string) => knowledgeService.removeSource(id);
export const toggleSource = (id: string) => knowledgeService.toggleSource(id);
export const getEnabledContent = () => knowledgeService.getEnabledContent();
export const clearAllSources = () => knowledgeService.clearAll();
