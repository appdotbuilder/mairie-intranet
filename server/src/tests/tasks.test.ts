import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type TaskStatus } from '../schema';
import { getTasksByStatus } from '../handlers/tasks';
import { eq } from 'drizzle-orm';

describe('getTasksByStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser1: any;
  let testUser2: any;
  let testUser3: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'assignee@test.com',
          password_hash: 'hash1',
          first_name: 'John',
          last_name: 'Assignee',
          role: 'Department Head'
        },
        {
          email: 'creator@test.com',
          password_hash: 'hash2',
          first_name: 'Jane',
          last_name: 'Creator',
          role: 'Mayor'
        },
        {
          email: 'other@test.com',
          password_hash: 'hash3',
          first_name: 'Bob',
          last_name: 'Other',
          role: 'Secretary'
        }
      ])
      .returning()
      .execute();

    testUser1 = users[0]; // assignee
    testUser2 = users[1]; // creator
    testUser3 = users[2]; // other user
  });

  it('should return tasks with specific status assigned to user', async () => {
    // Create tasks with different statuses
    await db.insert(tasksTable)
      .values([
        {
          title: 'Pending Task 1',
          assignee_id: testUser1.id,
          assigned_by: testUser2.id,
          status: 'Pending',
          priority: 'Medium'
        },
        {
          title: 'In Progress Task',
          assignee_id: testUser1.id,
          assigned_by: testUser2.id,
          status: 'In Progress',
          priority: 'High'
        },
        {
          title: 'Pending Task 2',
          assignee_id: testUser1.id,
          assigned_by: testUser2.id,
          status: 'Pending',
          priority: 'Low'
        }
      ])
      .execute();

    const pendingTasks = await getTasksByStatus('Pending', testUser1.id);

    expect(pendingTasks).toHaveLength(2);
    expect(pendingTasks.every(task => task.status === 'Pending')).toBe(true);
    expect(pendingTasks.every(task => task.assignee_id === testUser1.id)).toBe(true);
    
    // Verify task details
    const taskTitles = pendingTasks.map(task => task.title).sort();
    expect(taskTitles).toEqual(['Pending Task 1', 'Pending Task 2']);
  });

  it('should return tasks with specific status created by user', async () => {
    // Create tasks where testUser2 is the creator
    await db.insert(tasksTable)
      .values([
        {
          title: 'Completed Task 1',
          assignee_id: testUser1.id,
          assigned_by: testUser2.id,
          status: 'Completed',
          priority: 'Medium'
        },
        {
          title: 'Completed Task 2',
          assignee_id: testUser3.id,
          assigned_by: testUser2.id,
          status: 'Completed',
          priority: 'High'
        },
        {
          title: 'Pending Task',
          assignee_id: testUser1.id,
          assigned_by: testUser2.id,
          status: 'Pending',
          priority: 'Low'
        }
      ])
      .execute();

    const completedTasks = await getTasksByStatus('Completed', testUser2.id);

    expect(completedTasks).toHaveLength(2);
    expect(completedTasks.every(task => task.status === 'Completed')).toBe(true);
    expect(completedTasks.every(task => task.assigned_by === testUser2.id)).toBe(true);
    
    // Verify task details
    const taskTitles = completedTasks.map(task => task.title).sort();
    expect(taskTitles).toEqual(['Completed Task 1', 'Completed Task 2']);
  });

  it('should return tasks where user is both assignee and creator', async () => {
    // Create task where user assigns to themselves
    await db.insert(tasksTable)
      .values([
        {
          title: 'Self Assigned Task',
          assignee_id: testUser1.id,
          assigned_by: testUser1.id,
          status: 'In Progress',
          priority: 'High'
        },
        {
          title: 'Other Task',
          assignee_id: testUser2.id,
          assigned_by: testUser3.id,
          status: 'In Progress',
          priority: 'Medium'
        }
      ])
      .execute();

    const inProgressTasks = await getTasksByStatus('In Progress', testUser1.id);

    expect(inProgressTasks).toHaveLength(1);
    expect(inProgressTasks[0].title).toBe('Self Assigned Task');
    expect(inProgressTasks[0].assignee_id).toBe(testUser1.id);
    expect(inProgressTasks[0].assigned_by).toBe(testUser1.id);
  });

  it('should return empty array when no tasks match status', async () => {
    // Create tasks with different statuses
    await db.insert(tasksTable)
      .values([
        {
          title: 'Pending Task',
          assignee_id: testUser1.id,
          assigned_by: testUser2.id,
          status: 'Pending',
          priority: 'Medium'
        },
        {
          title: 'Completed Task',
          assignee_id: testUser1.id,
          assigned_by: testUser2.id,
          status: 'Completed',
          priority: 'High'
        }
      ])
      .execute();

    const cancelledTasks = await getTasksByStatus('Cancelled', testUser1.id);

    expect(cancelledTasks).toHaveLength(0);
  });

  it('should return empty array when user has no access to any tasks with status', async () => {
    // Create tasks where testUser3 has no access
    await db.insert(tasksTable)
      .values([
        {
          title: 'Pending Task 1',
          assignee_id: testUser1.id,
          assigned_by: testUser2.id,
          status: 'Pending',
          priority: 'Medium'
        },
        {
          title: 'Pending Task 2',
          assignee_id: testUser2.id,
          assigned_by: testUser1.id,
          status: 'Pending',
          priority: 'High'
        }
      ])
      .execute();

    const pendingTasks = await getTasksByStatus('Pending', testUser3.id);

    expect(pendingTasks).toHaveLength(0);
  });

  it('should order results by created_at in descending order', async () => {
    // Create tasks at different times
    const task1 = await db.insert(tasksTable)
      .values({
        title: 'First Task',
        assignee_id: testUser1.id,
        assigned_by: testUser2.id,
        status: 'Pending',
        priority: 'Medium'
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const task2 = await db.insert(tasksTable)
      .values({
        title: 'Second Task',
        assignee_id: testUser1.id,
        assigned_by: testUser2.id,
        status: 'Pending',
        priority: 'High'
      })
      .returning()
      .execute();

    const pendingTasks = await getTasksByStatus('Pending', testUser1.id);

    expect(pendingTasks).toHaveLength(2);
    // Most recent task should be first
    expect(pendingTasks[0].title).toBe('Second Task');
    expect(pendingTasks[1].title).toBe('First Task');
    expect(pendingTasks[0].created_at >= pendingTasks[1].created_at).toBe(true);
  });

  it('should handle all valid task statuses', async () => {
    const statuses: TaskStatus[] = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
    
    // Create one task for each status
    for (const status of statuses) {
      await db.insert(tasksTable)
        .values({
          title: `${status} Task`,
          assignee_id: testUser1.id,
          assigned_by: testUser2.id,
          status: status,
          priority: 'Medium'
        })
        .execute();
    }

    // Test each status
    for (const status of statuses) {
      const tasks = await getTasksByStatus(status, testUser1.id);
      
      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe(status);
      expect(tasks[0].title).toBe(`${status} Task`);
    }
  });

  it('should include all task fields in response', async () => {
    const testTask = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'Test description',
        assignee_id: testUser1.id,
        assigned_by: testUser2.id,
        due_date: new Date('2024-12-31'),
        status: 'Pending',
        priority: 'High',
        department: 'IT Department'
      })
      .returning()
      .execute();

    const pendingTasks = await getTasksByStatus('Pending', testUser1.id);

    expect(pendingTasks).toHaveLength(1);
    const task = pendingTasks[0];
    
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.description).toBe('Test description');
    expect(task.assignee_id).toBe(testUser1.id);
    expect(task.assigned_by).toBe(testUser2.id);
    expect(task.due_date).toBeInstanceOf(Date);
    expect(task.status).toBe('Pending');
    expect(task.priority).toBe('High');
    expect(task.department).toBe('IT Department');
    expect(task.created_at).toBeInstanceOf(Date);
    expect(task.updated_at).toBeInstanceOf(Date);
  });
});