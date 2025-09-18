import { db } from '../db';
import { announcementsTable, usersTable } from '../db/schema';
import { type Announcement, type CreateAnnouncementInput, type UserRole } from '../schema';
import { eq, and, or, isNull, gte, desc } from 'drizzle-orm';

export async function createAnnouncement(input: CreateAnnouncementInput, authorId: number): Promise<Announcement> {
  try {
    // Verify that the author exists
    const author = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, authorId))
      .execute();

    if (author.length === 0) {
      throw new Error('Author not found');
    }

    // Convert target_roles array to JSON string for storage
    const targetRolesJson = input.target_roles ? JSON.stringify(input.target_roles) : null;

    const result = await db.insert(announcementsTable)
      .values({
        title: input.title,
        content: input.content,
        author_id: authorId,
        target_roles: targetRolesJson,
        is_urgent: input.is_urgent,
        expires_at: input.expires_at
      })
      .returning()
      .execute();

    const announcement = result[0];
    
    // Convert target_roles back to array for return
    return {
      ...announcement,
      target_roles: announcement.target_roles ? JSON.parse(announcement.target_roles) : null
    };
  } catch (error) {
    console.error('Announcement creation failed:', error);
    throw error;
  }
}

export async function getAnnouncementsForUser(userRole: UserRole): Promise<Announcement[]> {
  try {
    const now = new Date();
    
    const results = await db.select()
      .from(announcementsTable)
      .where(
        and(
          eq(announcementsTable.is_active, true),
          or(
            isNull(announcementsTable.expires_at),
            gte(announcementsTable.expires_at, now)
          )
        )
      )
      .orderBy(desc(announcementsTable.is_urgent), desc(announcementsTable.created_at))
      .execute();

    // Filter by target roles and convert target_roles back to array
    return results
      .filter(announcement => {
        if (!announcement.target_roles) {
          return true; // General announcement for all users
        }
        
        const targetRoles = JSON.parse(announcement.target_roles);
        return targetRoles.includes(userRole);
      })
      .map(announcement => ({
        ...announcement,
        target_roles: announcement.target_roles ? JSON.parse(announcement.target_roles) : null
      }));
  } catch (error) {
    console.error('Failed to fetch user announcements:', error);
    throw error;
  }
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  try {
    const results = await db.select()
      .from(announcementsTable)
      .where(eq(announcementsTable.is_active, true))
      .orderBy(desc(announcementsTable.is_urgent), desc(announcementsTable.created_at))
      .execute();

    // Convert target_roles back to array for all results
    return results.map(announcement => ({
      ...announcement,
      target_roles: announcement.target_roles ? JSON.parse(announcement.target_roles) : null
    }));
  } catch (error) {
    console.error('Failed to fetch all announcements:', error);
    throw error;
  }
}

export async function getUrgentAnnouncements(userRole: UserRole): Promise<Announcement[]> {
  try {
    const now = new Date();
    
    const results = await db.select()
      .from(announcementsTable)
      .where(
        and(
          eq(announcementsTable.is_active, true),
          eq(announcementsTable.is_urgent, true),
          or(
            isNull(announcementsTable.expires_at),
            gte(announcementsTable.expires_at, now)
          )
        )
      )
      .orderBy(desc(announcementsTable.created_at))
      .execute();

    // Filter by target roles and convert target_roles back to array
    return results
      .filter(announcement => {
        if (!announcement.target_roles) {
          return true; // General urgent announcement for all users
        }
        
        const targetRoles = JSON.parse(announcement.target_roles);
        return targetRoles.includes(userRole);
      })
      .map(announcement => ({
        ...announcement,
        target_roles: announcement.target_roles ? JSON.parse(announcement.target_roles) : null
      }));
  } catch (error) {
    console.error('Failed to fetch urgent announcements:', error);
    throw error;
  }
}

export async function deactivateAnnouncement(announcementId: number, userId: number): Promise<Announcement> {
  try {
    // Verify the announcement exists and get current data
    const existingAnnouncements = await db.select()
      .from(announcementsTable)
      .where(eq(announcementsTable.id, announcementId))
      .execute();

    if (existingAnnouncements.length === 0) {
      throw new Error('Announcement not found');
    }

    const existingAnnouncement = existingAnnouncements[0];

    // Verify the user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Check permissions: only the author or Mayor can deactivate
    if (existingAnnouncement.author_id !== userId && user.role !== 'Mayor') {
      throw new Error('Insufficient permissions to deactivate announcement');
    }

    // Update the announcement to set is_active to false
    const result = await db.update(announcementsTable)
      .set({
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(announcementsTable.id, announcementId))
      .returning()
      .execute();

    const updatedAnnouncement = result[0];

    // Convert target_roles back to array for return
    return {
      ...updatedAnnouncement,
      target_roles: updatedAnnouncement.target_roles ? JSON.parse(updatedAnnouncement.target_roles) : null
    };
  } catch (error) {
    console.error('Failed to deactivate announcement:', error);
    throw error;
  }
}