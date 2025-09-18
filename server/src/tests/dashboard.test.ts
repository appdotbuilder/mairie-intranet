import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, announcementsTable, tasksTable, documentsTable } from '../db/schema';
import { getDashboardData, getQuickStats } from '../handlers/dashboard';

// Test user data
const testUser = {
  email: 'secretary@city.fr',
  password_hash: '$2b$10$hashedpassword123',
  first_name: 'Jane',
  last_name: 'Secretary',
  role: 'Secretary' as const,
  department: 'Administration',
  is_active: true
};

const testMayor = {
  email: 'mayor@city.fr',
  password_hash: '$2b$10$hashedpassword456',
  first_name: 'John',
  last_name: 'Mayor',
  role: 'Mayor' as const,
  department: 'Executive',
  is_active: true
};

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get complete dashboard data for user', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser, testMayor])
      .returning()
      .execute();

    const secretary = users.find(u => u.role === 'Secretary')!;
    const mayor = users.find(u => u.role === 'Mayor')!;

    // Create test announcement
    await db.insert(announcementsTable)
      .values({
        title: 'Department Meeting',
        content: 'Monthly department meeting scheduled',
        author_id: mayor.id,
        target_roles: JSON.stringify(['Secretary']),
        is_urgent: false,
        is_active: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      })
      .execute();

    // Create test task
    await db.insert(tasksTable)
      .values({
        title: 'Review Documents',
        description: 'Review monthly reports',
        assignee_id: secretary.id,
        assigned_by: mayor.id,
        status: 'Pending',
        priority: 'Medium',
        department: 'Administration'
      })
      .execute();

    // Create test document
    await db.insert(documentsTable)
      .values({
        title: 'Public Policy',
        description: 'New public policy document',
        file_name: 'policy.pdf',
        file_path: '/uploads/policy.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf',
        category: 'Administrative',
        uploaded_by: mayor.id,
        is_public: true
      })
      .execute();

    const result = await getDashboardData(secretary.id);

    // Verify user data
    expect(result.user.id).toBe(secretary.id);
    expect(result.user.first_name).toBe('Jane');
    expect(result.user.role).toBe('Secretary');

    // Verify announcements
    expect(result.announcements).toHaveLength(1);
    expect(result.announcements[0].title).toBe('Department Meeting');
    expect(result.announcements[0].target_roles).toEqual(['Secretary']);

    // Verify tasks
    expect(result.pending_tasks).toHaveLength(1);
    expect(result.pending_tasks[0].title).toBe('Review Documents');
    expect(result.pending_tasks[0].status).toBe('Pending');

    // Verify documents
    expect(result.recent_documents).toHaveLength(1);
    expect(result.recent_documents[0].title).toBe('Public Policy');
    expect(result.recent_documents[0].is_public).toBe(true);

    // Verify task summary
    expect(result.task_summary.total).toBe(1);
    expect(result.task_summary.pending).toBe(1);
    expect(result.task_summary.in_progress).toBe(0);
    expect(result.task_summary.completed).toBe(0);
  });

  it('should filter announcements by user role', async () => {
    const users = await db.insert(usersTable)
      .values([testUser, testMayor])
      .returning()
      .execute();

    const secretary = users.find(u => u.role === 'Secretary')!;
    const mayor = users.find(u => u.role === 'Mayor')!;

    // Create announcements with different target roles
    await db.insert(announcementsTable)
      .values([
        {
          title: 'Secretary Only',
          content: 'For secretaries only',
          author_id: mayor.id,
          target_roles: JSON.stringify(['Secretary']),
          is_active: true
        },
        {
          title: 'Mayor Only',
          content: 'For mayors only',
          author_id: mayor.id,
          target_roles: JSON.stringify(['Mayor']),
          is_active: true
        },
        {
          title: 'All Roles',
          content: 'For everyone',
          author_id: mayor.id,
          target_roles: null, // null means all roles
          is_active: true
        }
      ])
      .execute();

    const result = await getDashboardData(secretary.id);

    // Should see Secretary-specific and all-roles announcements
    expect(result.announcements).toHaveLength(2);
    const titles = result.announcements.map(a => a.title);
    expect(titles).toContain('Secretary Only');
    expect(titles).toContain('All Roles');
    expect(titles).not.toContain('Mayor Only');
  });

  it('should exclude expired announcements', async () => {
    const users = await db.insert(usersTable)
      .values([testUser])
      .returning()
      .execute();

    const secretary = users[0];

    // Create expired and active announcements
    await db.insert(announcementsTable)
      .values([
        {
          title: 'Expired Announcement',
          content: 'This is expired',
          author_id: secretary.id,
          target_roles: JSON.stringify(['Secretary']),
          is_active: true,
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        },
        {
          title: 'Active Announcement',
          content: 'This is active',
          author_id: secretary.id,
          target_roles: JSON.stringify(['Secretary']),
          is_active: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        }
      ])
      .execute();

    const result = await getDashboardData(secretary.id);

    expect(result.announcements).toHaveLength(1);
    expect(result.announcements[0].title).toBe('Active Announcement');
  });

  it('should include both public documents and user-uploaded documents', async () => {
    const users = await db.insert(usersTable)
      .values([testUser, testMayor])
      .returning()
      .execute();

    const secretary = users.find(u => u.role === 'Secretary')!;
    const mayor = users.find(u => u.role === 'Mayor')!;

    // Create different types of documents
    await db.insert(documentsTable)
      .values([
        {
          title: 'Public Document',
          file_name: 'public.pdf',
          file_path: '/uploads/public.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          category: 'Administrative',
          uploaded_by: mayor.id,
          is_public: true
        },
        {
          title: 'Secretary Private Document',
          file_name: 'private.pdf',
          file_path: '/uploads/private.pdf',
          file_size: 2048,
          mime_type: 'application/pdf',
          category: 'Administrative',
          uploaded_by: secretary.id,
          is_public: false
        },
        {
          title: 'Other Private Document',
          file_name: 'other.pdf',
          file_path: '/uploads/other.pdf',
          file_size: 3072,
          mime_type: 'application/pdf',
          category: 'Administrative',
          uploaded_by: mayor.id,
          is_public: false
        }
      ])
      .execute();

    const result = await getDashboardData(secretary.id);

    // Should see public document and own private document
    expect(result.recent_documents).toHaveLength(2);
    const titles = result.recent_documents.map(d => d.title);
    expect(titles).toContain('Public Document');
    expect(titles).toContain('Secretary Private Document');
    expect(titles).not.toContain('Other Private Document');
  });

  it('should calculate task summary correctly', async () => {
    const users = await db.insert(usersTable)
      .values([testUser, testMayor])
      .returning()
      .execute();

    const secretary = users.find(u => u.role === 'Secretary')!;
    const mayor = users.find(u => u.role === 'Mayor')!;

    // Create tasks with different statuses
    await db.insert(tasksTable)
      .values([
        {
          title: 'Pending Task 1',
          assignee_id: secretary.id,
          assigned_by: mayor.id,
          status: 'Pending',
          priority: 'Medium'
        },
        {
          title: 'Pending Task 2',
          assignee_id: secretary.id,
          assigned_by: mayor.id,
          status: 'Pending',
          priority: 'High'
        },
        {
          title: 'In Progress Task',
          assignee_id: secretary.id,
          assigned_by: mayor.id,
          status: 'In Progress',
          priority: 'Medium'
        },
        {
          title: 'Completed Task',
          assignee_id: secretary.id,
          assigned_by: mayor.id,
          status: 'Completed',
          priority: 'Low'
        }
      ])
      .execute();

    const result = await getDashboardData(secretary.id);

    expect(result.task_summary.total).toBe(4);
    expect(result.task_summary.pending).toBe(2);
    expect(result.task_summary.in_progress).toBe(1);
    expect(result.task_summary.completed).toBe(1);
  });

  it('should throw error for non-existent user', async () => {
    expect(getDashboardData(999)).rejects.toThrow(/User not found/i);
  });
});

describe('getQuickStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get quick stats for user', async () => {
    const users = await db.insert(usersTable)
      .values([testUser, testMayor])
      .returning()
      .execute();

    const secretary = users.find(u => u.role === 'Secretary')!;
    const mayor = users.find(u => u.role === 'Mayor')!;

    // Create tasks with different statuses and due dates
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await db.insert(tasksTable)
      .values([
        {
          title: 'Current Pending',
          assignee_id: secretary.id,
          assigned_by: mayor.id,
          status: 'Pending',
          priority: 'Medium',
          due_date: tomorrow
        },
        {
          title: 'Overdue Task',
          assignee_id: secretary.id,
          assigned_by: mayor.id,
          status: 'In Progress',
          priority: 'High',
          due_date: yesterday
        },
        {
          title: 'Completed Task',
          assignee_id: secretary.id,
          assigned_by: mayor.id,
          status: 'Completed',
          priority: 'Low'
        }
      ])
      .execute();

    // Create urgent announcement
    await db.insert(announcementsTable)
      .values({
        title: 'Urgent Meeting',
        content: 'Emergency meeting called',
        author_id: mayor.id,
        target_roles: JSON.stringify(['Secretary']),
        is_urgent: true,
        is_active: true
      })
      .execute();

    const result = await getQuickStats(secretary.id);

    expect(result.totalTasks).toBe(3);
    expect(result.pendingTasks).toBe(1);
    expect(result.overdueFiles).toBe(1); // One overdue in-progress task
    expect(result.urgentAnnouncements).toBe(1);
  });

  it('should return zero stats for user with no data', async () => {
    const users = await db.insert(usersTable)
      .values([testUser])
      .returning()
      .execute();

    const secretary = users[0];
    const result = await getQuickStats(secretary.id);

    expect(result.totalTasks).toBe(0);
    expect(result.pendingTasks).toBe(0);
    expect(result.overdueFiles).toBe(0);
    expect(result.urgentAnnouncements).toBe(0);
  });

  it('should filter urgent announcements by role', async () => {
    const users = await db.insert(usersTable)
      .values([testUser, testMayor])
      .returning()
      .execute();

    const secretary = users.find(u => u.role === 'Secretary')!;
    const mayor = users.find(u => u.role === 'Mayor')!;

    // Create urgent announcements with different targets
    await db.insert(announcementsTable)
      .values([
        {
          title: 'Urgent for Secretary',
          content: 'Secretary urgent',
          author_id: mayor.id,
          target_roles: JSON.stringify(['Secretary']),
          is_urgent: true,
          is_active: true
        },
        {
          title: 'Urgent for Mayor',
          content: 'Mayor urgent',
          author_id: mayor.id,
          target_roles: JSON.stringify(['Mayor']),
          is_urgent: true,
          is_active: true
        },
        {
          title: 'Non-urgent for Secretary',
          content: 'Not urgent',
          author_id: mayor.id,
          target_roles: JSON.stringify(['Secretary']),
          is_urgent: false,
          is_active: true
        }
      ])
      .execute();

    const result = await getQuickStats(secretary.id);

    // Should only count urgent announcements for secretary
    expect(result.urgentAnnouncements).toBe(1);
  });

  it('should throw error for non-existent user', async () => {
    expect(getQuickStats(999)).rejects.toThrow(/User not found/i);
  });
});