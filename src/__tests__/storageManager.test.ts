import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

let tmpDir: string;
let StorageManager: any;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rc-test-'));
  vi.resetModules();
  
  // Mock electron app
  vi.doMock('electron', () => ({ 
    app: { getPath: () => tmpDir } 
  }));
  
  // Mock the logger utility
  vi.doMock('@utils/logger', () => ({
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }
  }));

  const mod = await import('../core/storage/storageManager');
  StorageManager = mod.StorageManager;
  // clear singleton if any
  StorageManager.clearInstanceForTests && StorageManager.clearInstanceForTests();
});

afterEach(async () => {
  vi.resetAllMocks();
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('StorageManager', () => {
  it('saves and loads an entry', async () => {
    const storage = StorageManager.getInstance();
    const entry = { date: '2026-01-01', text: 'hello', timestamp: new Date().toISOString(), committed: true };

    await storage.saveEntry('2026-01-01', entry);
    const loaded = await storage.loadEntry('2026-01-01');

    expect(loaded).toBeTruthy();
    expect((loaded as any).text).toBe('hello');
  });

  it('creates backup and prunes old backups', async () => {
    const storage = StorageManager.getInstance();

    // create an entry
    const entry = { date: '2026-01-02', text: 'b', timestamp: new Date().toISOString(), committed: true };
    await storage.saveEntry('2026-01-02', entry);

    // create several backups
    for (let i = 0; i < 5; i++) {
      // small delay to ensure different timestamps
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 10));
      await storage.createBackup(2);
    }

    // check backups dir contains at most 2 backups
    const info = storage.getStorageInfo();
    const files = await fs.readdir(info.backupsDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    expect(jsonFiles.length).toBeLessThanOrEqual(2);
  });
});