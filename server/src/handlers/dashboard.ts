import { db } from '../db';
import { usersTable, announcementsTable, tasksTable, documentsTable } from '../db/schema';
import { type DashboardData } from '../schema';
import { eq, and, or, isNull, desc, gte, count, sql, SQL } from 'drizzle-orm';

export async function getDashboardData(userId: number): Promise<DashboardData> {
  try {
    // Get user information
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Get announcements relevant to the user's role
    let announcementsQuery = db.select()
      .from(announcementsTable)
      .where(
        and(
          eq(announcementsTable.is_active, true),
          or(
            isNull(announcementsTable.expires_at),
            gte(announcementsTable.expires_at, new Date())
          ),
          or(
            isNull(announcementsTable.target_roles),
            eq(announcementsTable.target_roles, `["${user.role}"]`),
            eq(announcementsTable.target_roles, JSON.stringify([user.role]))
          )
        )
      )
      .orderBy(desc(announcementsTable.is_urgent), desc(announcementsTable.created_at))
      .limit(5);

    const announcements = await announcementsQuery.execute();

    // Parse target_roles JSON for announcements
    const parsedAnnouncements = announcements.map(announcement => ({
      ...announcement,
      target_roles: announcement.target_roles ? JSON.parse(announcement.target_roles) : null
    }));

    // Get pending and in-progress tasks assigned to the user
    const pendingTasks = await db.select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.assignee_id, userId),
          or(
            eq(tasksTable.status, 'Pending'),
            eq(tasksTable.status, 'In Progress')
          )
        )
      )
      .orderBy(desc(tasksTable.priority), tasksTable.due_date)
      .limit(10)
      .execute();

    // Get recent documents (public ones or ones uploaded by the user)
    const recentDocuments = await db.select()
      .from(documentsTable)
      .where(
        or(
          eq(documentsTable.is_public, true),
          eq(documentsTable.uploaded_by, userId)
        )
      )
      .orderBy(desc(documentsTable.created_at))
      .limit(5)
      .execute();

    // Get task summary statistics
    const taskSummaryResults = await db.select({
      status: tasksTable.status,
      count: count()
    })
      .from(tasksTable)
      .where(eq(tasksTable.assignee_id, userId))
      .groupBy(tasksTable.status)
      .execute();

    // Process task summary
    const taskSummary = {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0
    };

    taskSummaryResults.forEach(result => {
      const statusCount = Number(result.count);
      taskSummary.total += statusCount;
      
      switch (result.status) {
        case 'Pending':
          taskSummary.pending = statusCount;
          break;
        case 'In Progress':
          taskSummary.in_progress = statusCount;
          break;
        case 'Completed':
          taskSummary.completed = statusCount;
          break;
      }
    });

    return {
      user,
      announcements: parsedAnnouncements,
      pending_tasks: pendingTasks,
      recent_documents: recentDocuments,
      task_summary: taskSummary
    };
  } catch (error) {
    console.error('Dashboard data fetch failed:', error);
    throw error;
  }
}

export async function getQuickStats(userId: number): Promise<{
  totalTasks: number;
  pendingTasks: number;
  overdueFiles: number;
  urgentAnnouncements: number;
}> {
  try {
    // Get user information to determine their role
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];
    const now = new Date();

    // Get total tasks assigned to user
    const totalTasksResult = await db.select({ count: count() })
      .from(tasksTable)
      .where(eq(tasksTable.assignee_id, userId))
      .execute();

    const totalTasks = Number(totalTasksResult[0]?.count || 0);

    // Get pending tasks count
    const pendingTasksResult = await db.select({ count: count() })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.assignee_id, userId),
          eq(tasksTable.status, 'Pending')
        )
      )
      .execute();

    const pendingTasks = Number(pendingTasksResult[0]?.count || 0);

    // Get count of overdue tasks (using due_date as "overdue files" proxy)
    const overdueFilesResult = await db.select({ count: count() })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.assignee_id, userId),
          sql`${tasksTable.due_date} IS NOT NULL`,
          sql`${tasksTable.due_date} < ${now}`,
          or(
            eq(tasksTable.status, 'Pending'),
            eq(tasksTable.status, 'In Progress')
          )
        )
      )
      .execute();

    const overdueFiles = Number(overdueFilesResult[0]?.count || 0);

    // Get urgent announcements relevant to user's role
    const urgentAnnouncementsResult = await db.select({ count: count() })
      .from(announcementsTable)
      .where(
        and(
          eq(announcementsTable.is_active, true),
          eq(announcementsTable.is_urgent, true),
          or(
            isNull(announcementsTable.expires_at),
            gte(announcementsTable.expires_at, now)
          ),
          or(
            isNull(announcementsTable.target_roles),
            eq(announcementsTable.target_roles, `["${user.role}"]`),
            eq(announcementsTable.target_roles, JSON.stringify([user.role]))
          )
        )
      )
      .execute();

    const urgentAnnouncements = Number(urgentAnnouncementsResult[0]?.count || 0);

    return {
      totalTasks,
      pendingTasks,
      overdueFiles,
      urgentAnnouncements
    };
  } catch (error) {
    console.error('Quick stats fetch failed:', error);
    throw error;
  }
}