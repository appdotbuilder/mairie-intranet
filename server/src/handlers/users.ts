import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User, type UserRole } from '../schema';
import { eq } from 'drizzle-orm';

export async function getAllUsers(): Promise<User[]> {
  try {
    const results = await db.select()
      .from(usersTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch all users:', error);
    throw error;
  }
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, role))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch users by role:', error);
    throw error;
  }
}

export async function getUsersByDepartment(department: string): Promise<User[]> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.department, department))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch users by department:', error);
    throw error;
  }
}

export async function updateUserStatus(userId: number, isActive: boolean): Promise<User> {
  try {
    const results = await db.update(usersTable)
      .set({ 
        is_active: isActive,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    return results[0];
  } catch (error) {
    console.error('Failed to update user status:', error);
    throw error;
  }
}