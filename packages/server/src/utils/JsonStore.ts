/**
 * JsonStore - Atomic JSON file storage with concurrency control
 *
 * Features:
 * - Atomic writes (temp file + rename)
 * - Process-level mutex for concurrent write safety
 * - Backup on corruption
 * - Type-safe operations
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const rename = promisify(fs.rename);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

/**
 * Simple mutex implementation for process-level locking
 */
class Mutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }

    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }
}

export class JsonStore<T> {
  private filePath: string;
  private mutex: Mutex;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.mutex = new Mutex();
  }

  /**
   * Load data from JSON file
   * Returns defaultValue if file doesn't exist
   */
  async load(defaultValue: T): Promise<T> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      await mkdir(dir, { recursive: true });

      // Check if file exists
      if (!fs.existsSync(this.filePath)) {
        return defaultValue;
      }

      const content = await readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      console.error(`[JsonStore] Failed to load ${this.filePath}:`, error);

      // Try to create backup if file is corrupted
      if (fs.existsSync(this.filePath)) {
        const backupPath = `${this.filePath}.backup.${Date.now()}`;
        try {
          fs.copyFileSync(this.filePath, backupPath);
          console.log(`[JsonStore] Created backup at ${backupPath}`);
        } catch (backupError) {
          console.error('[JsonStore] Failed to create backup:', backupError);
        }
      }

      return defaultValue;
    }
  }

  /**
   * Save data to JSON file atomically (without acquiring lock)
   * Uses temp file + rename to prevent corruption
   * INTERNAL USE ONLY - lock must be held by caller
   */
  private async saveUnlocked(data: T): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      await mkdir(dir, { recursive: true });

      // Write to temporary file
      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      const content = JSON.stringify(data, null, 2);
      await writeFile(tempPath, content, 'utf-8');

      // Atomic rename (overwrites target)
      await rename(tempPath, this.filePath);
    } catch (error) {
      console.error(`[JsonStore] Failed to save ${this.filePath}:`, error);
      throw error;
    }
  }

  /**
   * Save data to JSON file atomically
   * Uses temp file + rename to prevent corruption
   */
  async save(data: T): Promise<void> {
    await this.mutex.acquire();

    try {
      await this.saveUnlocked(data);
    } finally {
      this.mutex.release();
    }
  }

  /**
   * Update data using a transform function
   * Loads, transforms, and saves atomically
   */
  async update(
    defaultValue: T,
    transform: (current: T) => T
  ): Promise<T> {
    await this.mutex.acquire();

    try {
      const current = await this.load(defaultValue);
      const updated = transform(current);
      await this.saveUnlocked(updated);
      return updated;
    } finally {
      this.mutex.release();
    }
  }

  /**
   * Delete the file
   */
  async delete(): Promise<void> {
    await this.mutex.acquire();

    try {
      if (fs.existsSync(this.filePath)) {
        await unlink(this.filePath);
      }
    } finally {
      this.mutex.release();
    }
  }

  /**
   * Check if file exists
   */
  exists(): boolean {
    return fs.existsSync(this.filePath);
  }
}
