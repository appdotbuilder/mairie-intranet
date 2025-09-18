import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput } from '../schema';
import { loginUser, registerUser, getCurrentUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';


// Test user data
const testUserInput: CreateUserInput = {
  email: 'test@city.fr',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'Secretary',
  department: 'Administration'
};

const mayorInput: CreateUserInput = {
  email: 'mayor@city.fr',
  password: 'securepass456',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'Mayor',
  department: null
};

describe('Authentication Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('registerUser', () => {
    it('should create a new user with hashed password', async () => {
      const result = await registerUser(testUserInput);

      expect(result.email).toBe('test@city.fr');
      expect(result.first_name).toBe('John');
      expect(result.last_name).toBe('Doe');
      expect(result.role).toBe('Secretary');
      expect(result.department).toBe('Administration');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toBe('password123'); // Should be hashed
    });

    it('should save user to database with correct values', async () => {
      const result = await registerUser(testUserInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      const savedUser = users[0];
      expect(savedUser.email).toBe('test@city.fr');
      expect(savedUser.first_name).toBe('John');
      expect(savedUser.last_name).toBe('Doe');
      expect(savedUser.role).toBe('Secretary');
      expect(savedUser.department).toBe('Administration');
      expect(savedUser.is_active).toBe(true);
      expect(savedUser.password_hash).toBeDefined();
      expect(savedUser.password_hash.length).toBeGreaterThan(20); // Hashed passwords are long
    });

    it('should create Mayor user with null department', async () => {
      const result = await registerUser(mayorInput);

      expect(result.role).toBe('Mayor');
      expect(result.department).toBe(null);
      expect(result.email).toBe('mayor@city.fr');
    });

    it('should reject duplicate email addresses', async () => {
      await registerUser(testUserInput);

      await expect(registerUser(testUserInput))
        .rejects.toThrow(/already exists/i);
    });

    it('should handle different user roles correctly', async () => {
      const deptHeadInput: CreateUserInput = {
        email: 'head@city.fr',
        password: 'password789',
        first_name: 'Bob',
        last_name: 'Johnson',
        role: 'Department Head',
        department: 'Public Works'
      };

      const result = await registerUser(deptHeadInput);
      expect(result.role).toBe('Department Head');
      expect(result.department).toBe('Public Works');
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      // Create test users for login tests
      await registerUser(testUserInput);
      await registerUser(mayorInput);
    });

    it('should authenticate user with correct credentials', async () => {
      const loginInput: LoginInput = {
        email: 'test@city.fr',
        password: 'password123'
      };

      const result = await loginUser(loginInput);

      expect(result.user.email).toBe('test@city.fr');
      expect(result.user.first_name).toBe('John');
      expect(result.user.role).toBe('Secretary');
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(10);
    });

    it('should generate valid JWT token', async () => {
      const loginInput: LoginInput = {
        email: 'test@city.fr',
        password: 'password123'
      };

      const result = await loginUser(loginInput);
      
      // Verify JWT token structure (header.payload.signature)
      const tokenParts = result.token.split('.');
      expect(tokenParts).toHaveLength(3);
      
      // Decode payload to verify user ID
      const payloadDecoded = JSON.parse(atob(tokenParts[1]));
      expect(payloadDecoded.userId).toBe(result.user.id);
      expect(payloadDecoded.exp).toBeDefined(); // Should have expiration
      expect(payloadDecoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000)); // Should be in the future
    });

    it('should reject invalid email', async () => {
      const loginInput: LoginInput = {
        email: 'nonexistent@city.fr',
        password: 'password123'
      };

      await expect(loginUser(loginInput))
        .rejects.toThrow(/invalid email or password/i);
    });

    it('should reject incorrect password', async () => {
      const loginInput: LoginInput = {
        email: 'test@city.fr',
        password: 'wrongpassword'
      };

      await expect(loginUser(loginInput))
        .rejects.toThrow(/invalid email or password/i);
    });

    it('should reject inactive users', async () => {
      // First create and then deactivate a user
      const user = await registerUser({
        email: 'inactive@city.fr',
        password: 'password123',
        first_name: 'Inactive',
        last_name: 'User',
        role: 'Secretary',
        department: 'Test'
      });

      // Deactivate the user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.id, user.id))
        .execute();

      const loginInput: LoginInput = {
        email: 'inactive@city.fr',
        password: 'password123'
      };

      await expect(loginUser(loginInput))
        .rejects.toThrow(/account is inactive/i);
    });

    it('should authenticate Mayor user', async () => {
      const loginInput: LoginInput = {
        email: 'mayor@city.fr',
        password: 'securepass456'
      };

      const result = await loginUser(loginInput);

      expect(result.user.role).toBe('Mayor');
      expect(result.user.first_name).toBe('Jane');
      expect(result.token).toBeDefined();
    });
  });

  describe('getCurrentUser', () => {
    let testUserId: number;

    beforeEach(async () => {
      const user = await registerUser(testUserInput);
      testUserId = user.id;
    });

    it('should return user by valid ID', async () => {
      const result = await getCurrentUser(testUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testUserId);
      expect(result?.email).toBe('test@city.fr');
      expect(result?.first_name).toBe('John');
      expect(result?.role).toBe('Secretary');
      expect(result?.is_active).toBe(true);
    });

    it('should return null for non-existent user ID', async () => {
      const result = await getCurrentUser(99999);

      expect(result).toBe(null);
    });

    it('should return null for inactive user', async () => {
      // Deactivate the user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.id, testUserId))
        .execute();

      const result = await getCurrentUser(testUserId);

      expect(result).toBe(null);
    });

    it('should return user with all fields populated', async () => {
      const result = await getCurrentUser(testUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testUserId);
      expect(result?.email).toBe('test@city.fr');
      expect(result?.password_hash).toBeDefined();
      expect(result?.first_name).toBe('John');
      expect(result?.last_name).toBe('Doe');
      expect(result?.role).toBe('Secretary');
      expect(result?.department).toBe('Administration');
      expect(result?.is_active).toBe(true);
      expect(result?.created_at).toBeInstanceOf(Date);
      expect(result?.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('Password Security', () => {
    it('should hash passwords securely', async () => {
      const user1 = await registerUser({
        email: 'user1@city.fr',
        password: 'samepassword',
        first_name: 'User',
        last_name: 'One',
        role: 'Secretary',
        department: 'Test'
      });

      const user2 = await registerUser({
        email: 'user2@city.fr',
        password: 'samepassword',
        first_name: 'User',
        last_name: 'Two',
        role: 'Secretary',
        department: 'Test'
      });

      // Same passwords should produce different hashes (due to salt)
      expect(user1.password_hash).not.toBe(user2.password_hash);
      expect(user1.password_hash).not.toBe('samepassword');
      expect(user2.password_hash).not.toBe('samepassword');
    });

    it('should verify passwords correctly after hashing', async () => {
      await registerUser(testUserInput);

      const loginResult = await loginUser({
        email: 'test@city.fr',
        password: 'password123'
      });

      expect(loginResult.user.email).toBe('test@city.fr');
      expect(loginResult.token).toBeDefined();
    });
  });
});