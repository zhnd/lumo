
import { invoke } from '@tauri-apps/api/core'
import { CreateUserDto, UpdateUserDto, User } from '../generated/typeshare-types';
/**
 * User Bridge - Frontend interface for user operations
 *
 * This class wraps Tauri IPC calls to interact with the Rust backend
 */
export class UserBridge {
  /**
   * Get all users
   */
  static async getAllUsers(): Promise<User[]> {
    return await invoke<User[]>('get_all_users');
  }

  /**
   * Get a user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    return await invoke<User | null>('get_user_by_id', { id });
  }

  /**
   * Create a new user
   */
  static async createUser(dto: CreateUserDto): Promise<User> {
    return await invoke<User>('create_user', { dto });
  }

  /**
   * Update an existing user
   */
  static async updateUser(dto: UpdateUserDto): Promise<User> {
    return await invoke<User>('update_user', { dto });
  }

  /**
   * Delete a user
   */
  static async deleteUser(id: string): Promise<void> {
    return await invoke<void>('delete_user', { id });
  }
}
