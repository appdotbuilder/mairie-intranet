import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, announcementsTable } from '../db/schema';
import { type CreateAnnouncementInput } from '../schema';
import {
  createAnnouncement,
  getAnnouncementsForUser,
  getAllAnnouncements,
  getUrgentAnnouncements,
  deactivateAnnouncement
} from '../handlers/announcements';
import { eq } from 'drizzle-orm';

describe('Announcements Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testMayorId: number;
  let testSecretaryId: number;

  beforeEach(async () => {
    // Create test users with different roles
    const usersResult = await db.insert(usersTable)
      .values([
        {
          email: 'mayor@city.gov',
          password_hash: 'hashed_password',
          first_name: 'John',
          last_name: 'Mayor',
          role: 'Mayor',
          department: 'Administration'
        },
        {
          email: 'secretary@city.gov',
          password_hash: 'hashed_password',
          first_name: 'Jane',
          last_name: 'Secretary',
          role: 'Secretary',
          department: 'Administration'
        },
        {
          email: 'dept.head@city.gov',
          password_hash: 'hashed_password',
          first_name: 'Bob',
          last_name: 'Head',
          role: 'Department Head',
          department: 'Public Works'
        }
      ])
      .returning()
      .execute();

    testMayorId = usersResult[0].id;
    testSecretaryId = usersResult[1].id;
    testUserId = usersResult[2].id;
  });

  describe('createAnnouncement', () => {
    it('should create a general announcement', async () => {
      const input: CreateAnnouncementInput = {
        title: 'City Hall Closure',
        content: 'City Hall will be closed on Friday for maintenance.',
        target_roles: null,
        is_urgent: false,
        expires_at: null
      };

      const result = await createAnnouncement(input, testMayorId);

      expect(result.title).toBe('City Hall Closure');
      expect(result.content).toBe(input.content);
      expect(result.author_id).toBe(testMayorId);
      expect(result.target_roles).toBeNull();
      expect(result.is_urgent).toBe(false);
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a role-specific announcement', async () => {
      const input: CreateAnnouncementInput = {
        title: 'Department Head Meeting',
        content: 'Monthly department heads meeting scheduled for next Monday.',
        target_roles: ['Department Head'],
        is_urgent: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      const result = await createAnnouncement(input, testMayorId);

      expect(result.title).toBe('Department Head Meeting');
      expect(result.target_roles).toEqual(['Department Head']);
      expect(result.is_urgent).toBe(true);
      expect(result.expires_at).toBeInstanceOf(Date);
    });

    it('should create an urgent announcement for multiple roles', async () => {
      const input: CreateAnnouncementInput = {
        title: 'Emergency Protocol Update',
        content: 'New emergency protocols are now in effect.',
        target_roles: ['Mayor', 'Secretary'],
        is_urgent: true,
        expires_at: null
      };

      const result = await createAnnouncement(input, testMayorId);

      expect(result.target_roles).toEqual(['Mayor', 'Secretary']);
      expect(result.is_urgent).toBe(true);
    });

    it('should save announcement to database', async () => {
      const input: CreateAnnouncementInput = {
        title: 'Test Announcement',
        content: 'This is a test announcement.',
        target_roles: null,
        is_urgent: false,
        expires_at: null
      };

      const result = await createAnnouncement(input, testMayorId);

      const savedAnnouncements = await db.select()
        .from(announcementsTable)
        .where(eq(announcementsTable.id, result.id))
        .execute();

      expect(savedAnnouncements).toHaveLength(1);
      expect(savedAnnouncements[0].title).toBe('Test Announcement');
      expect(savedAnnouncements[0].author_id).toBe(testMayorId);
    });

    it('should throw error for non-existent author', async () => {
      const input: CreateAnnouncementInput = {
        title: 'Invalid Announcement',
        content: 'This should fail.',
        target_roles: null,
        is_urgent: false,
        expires_at: null
      };

      await expect(createAnnouncement(input, 99999)).rejects.toThrow(/Author not found/i);
    });
  });

  describe('getAnnouncementsForUser', () => {
    beforeEach(async () => {
      // Create test announcements
      await db.insert(announcementsTable)
        .values([
          {
            title: 'General Announcement',
            content: 'For everyone',
            author_id: testMayorId,
            target_roles: null,
            is_urgent: false,
            is_active: true
          },
          {
            title: 'Mayor Only',
            content: 'For mayors only',
            author_id: testMayorId,
            target_roles: JSON.stringify(['Mayor']),
            is_urgent: true,
            is_active: true
          },
          {
            title: 'Secretary Only',
            content: 'For secretaries only',
            author_id: testMayorId,
            target_roles: JSON.stringify(['Secretary']),
            is_urgent: false,
            is_active: true
          },
          {
            title: 'Expired Announcement',
            content: 'This should not appear',
            author_id: testMayorId,
            target_roles: null,
            is_urgent: false,
            is_active: true,
            expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
          },
          {
            title: 'Inactive Announcement',
            content: 'This should not appear',
            author_id: testMayorId,
            target_roles: null,
            is_urgent: false,
            is_active: false
          }
        ])
        .execute();
    });

    it('should return general announcements for all users', async () => {
      const results = await getAnnouncementsForUser('Department Head');

      const generalAnnouncement = results.find(a => a.title === 'General Announcement');
      expect(generalAnnouncement).toBeDefined();
      expect(generalAnnouncement?.target_roles).toBeNull();
    });

    it('should return role-specific announcements for Mayor', async () => {
      const results = await getAnnouncementsForUser('Mayor');

      expect(results).toHaveLength(2); // General + Mayor only
      const mayorAnnouncement = results.find(a => a.title === 'Mayor Only');
      expect(mayorAnnouncement).toBeDefined();
      expect(mayorAnnouncement?.target_roles).toEqual(['Mayor']);
    });

    it('should return role-specific announcements for Secretary', async () => {
      const results = await getAnnouncementsForUser('Secretary');

      expect(results).toHaveLength(2); // General + Secretary only
      const secretaryAnnouncement = results.find(a => a.title === 'Secretary Only');
      expect(secretaryAnnouncement).toBeDefined();
    });

    it('should not return expired announcements', async () => {
      const results = await getAnnouncementsForUser('Mayor');

      const expiredAnnouncement = results.find(a => a.title === 'Expired Announcement');
      expect(expiredAnnouncement).toBeUndefined();
    });

    it('should not return inactive announcements', async () => {
      const results = await getAnnouncementsForUser('Mayor');

      const inactiveAnnouncement = results.find(a => a.title === 'Inactive Announcement');
      expect(inactiveAnnouncement).toBeUndefined();
    });

    it('should order announcements by urgency and date', async () => {
      const results = await getAnnouncementsForUser('Mayor');

      // First result should be urgent
      expect(results[0].is_urgent).toBe(true);
    });
  });

  describe('getAllAnnouncements', () => {
    beforeEach(async () => {
      await db.insert(announcementsTable)
        .values([
          {
            title: 'Active Announcement 1',
            content: 'Content 1',
            author_id: testMayorId,
            target_roles: null,
            is_urgent: false,
            is_active: true
          },
          {
            title: 'Active Announcement 2',
            content: 'Content 2',
            author_id: testMayorId,
            target_roles: JSON.stringify(['Mayor']),
            is_urgent: true,
            is_active: true
          },
          {
            title: 'Inactive Announcement',
            content: 'Should not appear',
            author_id: testMayorId,
            target_roles: null,
            is_urgent: false,
            is_active: false
          }
        ])
        .execute();
    });

    it('should return all active announcements', async () => {
      const results = await getAllAnnouncements();

      expect(results).toHaveLength(2);
      expect(results.every(a => a.is_active)).toBe(true);
    });

    it('should not return inactive announcements', async () => {
      const results = await getAllAnnouncements();

      const inactiveAnnouncement = results.find(a => a.title === 'Inactive Announcement');
      expect(inactiveAnnouncement).toBeUndefined();
    });

    it('should order announcements by urgency and date', async () => {
      const results = await getAllAnnouncements();

      // First result should be urgent
      expect(results[0].is_urgent).toBe(true);
    });
  });

  describe('getUrgentAnnouncements', () => {
    beforeEach(async () => {
      await db.insert(announcementsTable)
        .values([
          {
            title: 'Urgent General',
            content: 'Urgent for everyone',
            author_id: testMayorId,
            target_roles: null,
            is_urgent: true,
            is_active: true
          },
          {
            title: 'Urgent Mayor Only',
            content: 'Urgent for mayors',
            author_id: testMayorId,
            target_roles: JSON.stringify(['Mayor']),
            is_urgent: true,
            is_active: true
          },
          {
            title: 'Non-Urgent',
            content: 'Not urgent',
            author_id: testMayorId,
            target_roles: null,
            is_urgent: false,
            is_active: true
          },
          {
            title: 'Urgent Expired',
            content: 'Urgent but expired',
            author_id: testMayorId,
            target_roles: null,
            is_urgent: true,
            is_active: true,
            expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
          }
        ])
        .execute();
    });

    it('should return only urgent announcements for Mayor', async () => {
      const results = await getUrgentAnnouncements('Mayor');

      expect(results).toHaveLength(2); // Urgent general + Urgent mayor only
      expect(results.every(a => a.is_urgent)).toBe(true);
    });

    it('should return only urgent announcements for Department Head', async () => {
      const results = await getUrgentAnnouncements('Department Head');

      expect(results).toHaveLength(1); // Only urgent general
      expect(results[0].title).toBe('Urgent General');
    });

    it('should not return non-urgent announcements', async () => {
      const results = await getUrgentAnnouncements('Mayor');

      const nonUrgentAnnouncement = results.find(a => a.title === 'Non-Urgent');
      expect(nonUrgentAnnouncement).toBeUndefined();
    });

    it('should not return expired urgent announcements', async () => {
      const results = await getUrgentAnnouncements('Mayor');

      const expiredAnnouncement = results.find(a => a.title === 'Urgent Expired');
      expect(expiredAnnouncement).toBeUndefined();
    });
  });

  describe('deactivateAnnouncement', () => {
    let testAnnouncementId: number;

    beforeEach(async () => {
      const announcementResult = await db.insert(announcementsTable)
        .values({
          title: 'Test Announcement',
          content: 'This will be deactivated',
          author_id: testUserId,
          target_roles: null,
          is_urgent: false,
          is_active: true
        })
        .returning()
        .execute();

      testAnnouncementId = announcementResult[0].id;
    });

    it('should allow author to deactivate their own announcement', async () => {
      const result = await deactivateAnnouncement(testAnnouncementId, testUserId);

      expect(result.is_active).toBe(false);
      expect(result.id).toBe(testAnnouncementId);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should allow Mayor to deactivate any announcement', async () => {
      const result = await deactivateAnnouncement(testAnnouncementId, testMayorId);

      expect(result.is_active).toBe(false);
    });

    it('should update announcement in database', async () => {
      await deactivateAnnouncement(testAnnouncementId, testUserId);

      const updatedAnnouncements = await db.select()
        .from(announcementsTable)
        .where(eq(announcementsTable.id, testAnnouncementId))
        .execute();

      expect(updatedAnnouncements[0].is_active).toBe(false);
    });

    it('should throw error for non-existent announcement', async () => {
      await expect(deactivateAnnouncement(99999, testUserId)).rejects.toThrow(/Announcement not found/i);
    });

    it('should throw error for non-existent user', async () => {
      await expect(deactivateAnnouncement(testAnnouncementId, 99999)).rejects.toThrow(/User not found/i);
    });

    it('should throw error when non-author/non-mayor tries to deactivate', async () => {
      await expect(deactivateAnnouncement(testAnnouncementId, testSecretaryId)).rejects.toThrow(/Insufficient permissions/i);
    });
  });
});