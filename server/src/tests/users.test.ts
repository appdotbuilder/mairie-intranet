import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UserRole } from '../schema';
import { getAllUsers, getUsersByRole, getUsersByDepartment, updateUserStatus } from '../handlers/users';
import { eq } from 'drizzle-orm';

// Test data setup
const createTestUser = async (email: string, role: UserRole, department: string | null = null, isActive = true) => {
  const result = await db.insert(usersTable)
    .values({
      email,
      password_hash: 'hashed_password_123',
      first_name: 'Test',
      last_name: 'User',
      role,
      department,
      is_active: isActive
    })
    .returning()
    .execute();

  return result[0];
};

describe('User Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getAllUsers', () => {
    it('should return empty array when no users exist', async () => {
      const result = await getAllUsers();
      expect(result).toEqual([]);
    });

    it('should return all users', async () => {
      // Create test users
      await createTestUser('user1@city.fr', 'Mayor', 'Administration');
      await createTestUser('user2@city.fr', 'Secretary', 'Finance');
      await createTestUser('user3@city.fr', 'Department Head', 'Public Works');

      const result = await getAllUsers();

      expect(result).toHaveLength(3);
      expect(result[0].email).toEqual('user1@city.fr');
      expect(result[0].role).toEqual('Mayor');
      expect(result[0].department).toEqual('Administration');
      expect(result[1].email).toEqual('user2@city.fr');
      expect(result[2].email).toEqual('user3@city.fr');
    });

    it('should include inactive users in results', async () => {
      await createTestUser('active@city.fr', 'Secretary', 'HR', true);
      await createTestUser('inactive@city.fr', 'Secretary', 'HR', false);

      const result = await getAllUsers();

      expect(result).toHaveLength(2);
      expect(result.find(u => u.email === 'active@city.fr')?.is_active).toBe(true);
      expect(result.find(u => u.email === 'inactive@city.fr')?.is_active).toBe(false);
    });

    it('should return users with all required fields', async () => {
      await createTestUser('complete@city.fr', 'Mayor', 'Administration');

      const result = await getAllUsers();
      const user = result[0];

      expect(user.id).toBeDefined();
      expect(user.email).toEqual('complete@city.fr');
      expect(user.password_hash).toBeDefined();
      expect(user.first_name).toEqual('Test');
      expect(user.last_name).toEqual('User');
      expect(user.role).toEqual('Mayor');
      expect(user.department).toEqual('Administration');
      expect(typeof user.is_active).toBe('boolean');
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getUsersByRole', () => {
    beforeEach(async () => {
      // Create users with different roles
      await createTestUser('mayor@city.fr', 'Mayor', 'Administration');
      await createTestUser('secretary1@city.fr', 'Secretary', 'Finance');
      await createTestUser('secretary2@city.fr', 'Secretary', 'HR');
      await createTestUser('head1@city.fr', 'Department Head', 'Public Works');
      await createTestUser('head2@city.fr', 'Department Head', 'Social Services');
    });

    it('should return users with Mayor role', async () => {
      const result = await getUsersByRole('Mayor');

      expect(result).toHaveLength(1);
      expect(result[0].email).toEqual('mayor@city.fr');
      expect(result[0].role).toEqual('Mayor');
    });

    it('should return users with Secretary role', async () => {
      const result = await getUsersByRole('Secretary');

      expect(result).toHaveLength(2);
      expect(result.every(u => u.role === 'Secretary')).toBe(true);
      const emails = result.map(u => u.email).sort();
      expect(emails).toEqual(['secretary1@city.fr', 'secretary2@city.fr']);
    });

    it('should return users with Department Head role', async () => {
      const result = await getUsersByRole('Department Head');

      expect(result).toHaveLength(2);
      expect(result.every(u => u.role === 'Department Head')).toBe(true);
    });

    it('should return empty array for role with no users', async () => {
      // Clear all users and create only Mayor
      await db.delete(usersTable).execute();
      await createTestUser('only-mayor@city.fr', 'Mayor', 'Administration');

      const result = await getUsersByRole('Secretary');
      expect(result).toEqual([]);
    });

    it('should include inactive users in role filtering', async () => {
      await createTestUser('inactive-secretary@city.fr', 'Secretary', 'Finance', false);

      const result = await getUsersByRole('Secretary');

      expect(result).toHaveLength(3); // 2 active + 1 inactive
      expect(result.some(u => u.email === 'inactive-secretary@city.fr' && !u.is_active)).toBe(true);
    });
  });

  describe('getUsersByDepartment', () => {
    beforeEach(async () => {
      // Create users in different departments
      await createTestUser('admin1@city.fr', 'Mayor', 'Administration');
      await createTestUser('admin2@city.fr', 'Secretary', 'Administration');
      await createTestUser('finance1@city.fr', 'Secretary', 'Finance');
      await createTestUser('finance2@city.fr', 'Department Head', 'Finance');
      await createTestUser('works@city.fr', 'Department Head', 'Public Works');
      await createTestUser('no-dept@city.fr', 'Secretary', null);
    });

    it('should return users from Administration department', async () => {
      const result = await getUsersByDepartment('Administration');

      expect(result).toHaveLength(2);
      expect(result.every(u => u.department === 'Administration')).toBe(true);
      const emails = result.map(u => u.email).sort();
      expect(emails).toEqual(['admin1@city.fr', 'admin2@city.fr']);
    });

    it('should return users from Finance department', async () => {
      const result = await getUsersByDepartment('Finance');

      expect(result).toHaveLength(2);
      expect(result.every(u => u.department === 'Finance')).toBe(true);
    });

    it('should return users from Public Works department', async () => {
      const result = await getUsersByDepartment('Public Works');

      expect(result).toHaveLength(1);
      expect(result[0].email).toEqual('works@city.fr');
      expect(result[0].department).toEqual('Public Works');
    });

    it('should return empty array for non-existent department', async () => {
      const result = await getUsersByDepartment('Non-Existent Department');
      expect(result).toEqual([]);
    });

    it('should handle null department query correctly', async () => {
      // Note: This tests the specific case where department is null
      // In PostgreSQL, eq(column, null) won't work as expected for NULL comparison
      // but this test verifies the current behavior
      const result = await getUsersByDepartment('null');
      expect(result).toEqual([]);
    });

    it('should include users with different roles in same department', async () => {
      const result = await getUsersByDepartment('Finance');

      const roles = result.map(u => u.role);
      expect(roles).toContain('Secretary');
      expect(roles).toContain('Department Head');
    });
  });

  describe('updateUserStatus', () => {
    let testUserId: number;

    beforeEach(async () => {
      const user = await createTestUser('test-update@city.fr', 'Secretary', 'HR', true);
      testUserId = user.id;
    });

    it('should activate inactive user', async () => {
      // First make user inactive
      await updateUserStatus(testUserId, false);
      
      // Then activate
      const result = await updateUserStatus(testUserId, true);

      expect(result.id).toEqual(testUserId);
      expect(result.is_active).toBe(true);
      expect(result.updated_at).toBeInstanceOf(Date);

      // Verify in database
      const dbUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, testUserId))
        .execute();
      
      expect(dbUser[0].is_active).toBe(true);
    });

    it('should deactivate active user', async () => {
      const result = await updateUserStatus(testUserId, false);

      expect(result.id).toEqual(testUserId);
      expect(result.is_active).toBe(false);
      expect(result.updated_at).toBeInstanceOf(Date);

      // Verify in database
      const dbUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, testUserId))
        .execute();
      
      expect(dbUser[0].is_active).toBe(false);
    });

    it('should update timestamp when changing status', async () => {
      const originalUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, testUserId))
        .execute();

      const originalUpdatedAt = originalUser[0].updated_at;

      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await updateUserStatus(testUserId, false);

      expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should preserve all other user data when updating status', async () => {
      const result = await updateUserStatus(testUserId, false);

      expect(result.email).toEqual('test-update@city.fr');
      expect(result.first_name).toEqual('Test');
      expect(result.last_name).toEqual('User');
      expect(result.role).toEqual('Secretary');
      expect(result.department).toEqual('HR');
      expect(result.password_hash).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent user', async () => {
      const nonExistentId = 99999;

      await expect(updateUserStatus(nonExistentId, true))
        .rejects.toThrow(/User with id 99999 not found/);
    });

    it('should handle setting same status twice', async () => {
      // Set to false twice
      await updateUserStatus(testUserId, false);
      const result = await updateUserStatus(testUserId, false);

      expect(result.is_active).toBe(false);
      expect(result.id).toEqual(testUserId);
    });
  });
});