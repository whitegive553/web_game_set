/**
 * User Store - Manages user accounts
 */

import path from 'path';
import { UserInternal } from '@survival-game/shared';
import { JsonStore } from '../utils/JsonStore';

interface UsersData {
  users: UserInternal[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

class UserStore {
  private store: JsonStore<UsersData>;

  constructor() {
    this.store = new JsonStore<UsersData>(USERS_FILE);
  }

  /**
   * Get all users
   */
  async getAll(): Promise<UserInternal[]> {
    const data = await this.store.load({ users: [] });
    return data.users;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserInternal | null> {
    const users = await this.getAll();
    return users.find(u => u.id === id) || null;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<UserInternal | null> {
    const users = await this.getAll();
    return users.find(u => u.username === username) || null;
  }

  /**
   * Create new user
   */
  async create(user: UserInternal): Promise<UserInternal> {
    await this.store.update({ users: [] }, data => ({
      users: [...data.users, user]
    }));
    return user;
  }

  /**
   * Update user
   */
  async update(id: string, updates: Partial<UserInternal>): Promise<UserInternal | null> {
    const updated = await this.store.update({ users: [] }, data => {
      const index = data.users.findIndex(u => u.id === id);
      if (index === -1) return data;

      data.users[index] = { ...data.users[index], ...updates };
      return data;
    });

    return updated.users.find(u => u.id === id) || null;
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    const updated = await this.store.update({ users: [] }, data => ({
      users: data.users.filter(u => u.id !== id)
    }));

    return updated.users.length < (await this.getAll()).length;
  }
}

// Singleton instance
export const userStore = new UserStore();
