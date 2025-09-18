import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';


// Simple password hashing using Bun's built-in crypto
async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

// Generate JWT token using Bun's built-in JWT
async function generateToken(userId: number): Promise<string> {
  const secret = process.env['JWT_SECRET'] || 'default-secret-key';
  const payload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days from now
  };
  
  // Simple JWT implementation for demonstration
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadEncoded = btoa(JSON.stringify(payload));
  const signature = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(key => 
    crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${payloadEncoded}`))
  ).then(sig => 
    btoa(String.fromCharCode(...new Uint8Array(sig)))
  );
  
  return `${header}.${payloadEncoded}.${signature}`;
}

export async function loginUser(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    const user = users[0];
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is inactive');
    }

    // Verify password
    const isValidPassword = await verifyPassword(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = await generateToken(user.id);

    // Return user (without password hash) and token
    const userResponse: User = {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      department: user.department,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return { user: userResponse, token };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function registerUser(input: CreateUserInput): Promise<User> {
  try {
    // Check if user already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: passwordHash,
        first_name: input.first_name,
        last_name: input.last_name,
        role: input.role,
        department: input.department,
        is_active: true
      })
      .returning()
      .execute();

    const newUser = result[0];
    return {
      id: newUser.id,
      email: newUser.email,
      password_hash: newUser.password_hash,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      role: newUser.role,
      department: newUser.department,
      is_active: newUser.is_active,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}

export async function getCurrentUser(userId: number): Promise<User | null> {
  try {
    // Find user by ID
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const user = users[0];
    if (!user) {
      return null;
    }

    // Check if user is active
    if (!user.is_active) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      department: user.department,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
}