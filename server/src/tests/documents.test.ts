import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable, usersTable } from '../db/schema';
import { type UploadDocumentInput } from '../schema';
import { uploadDocument } from '../handlers/documents';
import { eq } from 'drizzle-orm';

// Test input for document upload
const testDocumentInput: UploadDocumentInput = {
  title: 'Municipal Budget Report 2024',
  description: 'Annual budget report for the municipal government',
  file_name: 'budget_report_2024.pdf',
  file_path: '/uploads/documents/budget_report_2024.pdf',
  file_size: 2048576, // 2MB
  mime_type: 'application/pdf',
  category: 'Financial',
  department: 'Finance',
  is_public: false
};

// Test user to upload documents
const testUser = {
  email: 'admin@municipality.gov',
  password_hash: 'hashed_password',
  first_name: 'John',
  last_name: 'Smith',
  role: 'Secretary' as const,
  department: 'Finance',
  is_active: true
};

describe('uploadDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should upload a document with all fields', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Upload the document
    const result = await uploadDocument(testDocumentInput, userId);

    // Verify all fields are correctly set
    expect(result.title).toBe('Municipal Budget Report 2024');
    expect(result.description).toBe('Annual budget report for the municipal government');
    expect(result.file_name).toBe('budget_report_2024.pdf');
    expect(result.file_path).toBe('/uploads/documents/budget_report_2024.pdf');
    expect(result.file_size).toBe(2048576);
    expect(result.mime_type).toBe('application/pdf');
    expect(result.category).toBe('Financial');
    expect(result.department).toBe('Finance');
    expect(result.uploaded_by).toBe(userId);
    expect(result.is_public).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should upload a public document without department', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Document with public access and no department
    const publicDocInput: UploadDocumentInput = {
      title: 'Public Notice',
      description: null,
      file_name: 'public_notice.pdf',
      file_path: '/uploads/public/public_notice.pdf',
      file_size: 512000,
      mime_type: 'application/pdf',
      category: 'Administrative',
      department: null,
      is_public: true
    };

    const result = await uploadDocument(publicDocInput, userId);

    // Verify public document fields
    expect(result.title).toBe('Public Notice');
    expect(result.description).toBeNull();
    expect(result.department).toBeNull();
    expect(result.is_public).toBe(true);
    expect(result.category).toBe('Administrative');
    expect(result.uploaded_by).toBe(userId);
  });

  it('should upload document with different file types', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Excel document
    const excelDocInput: UploadDocumentInput = {
      title: 'Expense Spreadsheet',
      description: 'Monthly expense tracking spreadsheet',
      file_name: 'expenses.xlsx',
      file_path: '/uploads/documents/expenses.xlsx',
      file_size: 1024000,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      category: 'Financial',
      department: 'Finance',
      is_public: false
    };

    const result = await uploadDocument(excelDocInput, userId);

    expect(result.file_name).toBe('expenses.xlsx');
    expect(result.mime_type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(result.title).toBe('Expense Spreadsheet');
  });

  it('should save document to database', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const result = await uploadDocument(testDocumentInput, userId);

    // Query the database to verify document was saved
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, result.id))
      .execute();

    expect(documents).toHaveLength(1);
    const savedDoc = documents[0];
    expect(savedDoc.title).toBe('Municipal Budget Report 2024');
    expect(savedDoc.file_name).toBe('budget_report_2024.pdf');
    expect(savedDoc.file_size).toBe(2048576);
    expect(savedDoc.category).toBe('Financial');
    expect(savedDoc.uploaded_by).toBe(userId);
    expect(savedDoc.is_public).toBe(false);
    expect(savedDoc.created_at).toBeInstanceOf(Date);
  });

  it('should upload documents with all category types', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const categories = [
      'Administrative',
      'Legal', 
      'Financial',
      'Urban Planning',
      'Public Works',
      'Social Services',
      'Other'
    ] as const;

    // Upload document for each category
    for (const category of categories) {
      const categoryInput: UploadDocumentInput = {
        title: `${category} Document`,
        description: `Test document for ${category} category`,
        file_name: `${category.toLowerCase()}_doc.pdf`,
        file_path: `/uploads/${category.toLowerCase()}_doc.pdf`,
        file_size: 1024,
        mime_type: 'application/pdf',
        category: category,
        department: null,
        is_public: true
      };

      const result = await uploadDocument(categoryInput, userId);
      expect(result.category).toBe(category);
      expect(result.title).toBe(`${category} Document`);
    }
  });

  it('should handle documents with large file sizes', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Large document (10MB)
    const largeDocInput: UploadDocumentInput = {
      title: 'Large Planning Document',
      description: 'Comprehensive city planning document',
      file_name: 'city_master_plan.pdf',
      file_path: '/uploads/planning/city_master_plan.pdf',
      file_size: 10485760, // 10MB
      mime_type: 'application/pdf',
      category: 'Urban Planning',
      department: 'Planning',
      is_public: true
    };

    const result = await uploadDocument(largeDocInput, userId);

    expect(result.file_size).toBe(10485760);
    expect(result.category).toBe('Urban Planning');
    expect(result.department).toBe('Planning');
    expect(result.is_public).toBe(true);
  });

  it('should fail when uploading with non-existent user', async () => {
    const nonExistentUserId = 999;
    
    await expect(
      uploadDocument(testDocumentInput, nonExistentUserId)
    ).rejects.toThrow(/violates foreign key constraint/i);
  });
});