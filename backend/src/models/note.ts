import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPool } from '../config/database';

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface NoteWithTags extends Note {
  tags: string[];
}

interface NoteRow extends RowDataPacket, Note {}

interface TagRow extends RowDataPacket {
  note_id: number;
  name: string;
}

const NOTES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`;

const NOTE_TAGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS note_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    note_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  )
`;

export async function initializeNotesTable(): Promise<void> {
  await getPool().execute(NOTES_TABLE_SQL);
  await getPool().execute(NOTE_TAGS_TABLE_SQL);
}

// ---------------------------------------------------------------------------
// Tag helpers
// ---------------------------------------------------------------------------

async function getTagsForNotes(noteIds: number[]): Promise<Map<number, string[]>> {
  const tagMap = new Map<number, string[]>();

  if (noteIds.length === 0) {
    return tagMap;
  }

  const placeholders = noteIds.map(() => '?').join(', ');
  const [rows] = await getPool().execute<TagRow[]>(
    `SELECT note_id, name FROM note_tags WHERE note_id IN (${placeholders}) ORDER BY note_id, id`,
    noteIds,
  );

  for (const row of rows) {
    const list = tagMap.get(row.note_id) ?? [];
    list.push(row.name);
    tagMap.set(row.note_id, list);
  }

  return tagMap;
}

/**
 * Insert tags for a note. Does NOT delete existing tags first.
 * Use only when you know the note has no existing tags (e.g. immediately after INSERT).
 */
async function insertNoteTags(noteId: number, tags: string[]): Promise<void> {
  if (tags.length === 0) {
    return;
  }

  const placeholders = tags.map(() => '(?, ?)').join(', ');
  const values: (number | string)[] = [];

  for (const tag of tags) {
    values.push(noteId, tag);
  }

  await getPool().execute(
    `INSERT INTO note_tags (note_id, name) VALUES ${placeholders}`,
    values,
  );
}

/**
 * Replace all tags for a note: delete existing ones, then insert new ones.
 * Use for updates where the note may already have tags.
 */
async function replaceNoteTags(noteId: number, tags: string[]): Promise<void> {
  await getPool().execute('DELETE FROM note_tags WHERE note_id = ?', [noteId]);
  await insertNoteTags(noteId, tags);
}

// ---------------------------------------------------------------------------
// Core note functions
// ---------------------------------------------------------------------------

/**
 * Fetch a single note row WITHOUT tags. Used for ownership checks only.
 * Costs 1 query instead of 2 (no separate tag fetch).
 */
export async function findNoteRow(id: number): Promise<Note | null> {
  const [rows] = await getPool().execute<NoteRow[]>(
    'SELECT id, user_id, title, content, created_at, updated_at FROM notes WHERE id = ?',
    [id],
  );

  return rows[0] ?? null;
}

export async function createNote(
  userId: number,
  title: string,
  content: string,
  tags: string[],
): Promise<NoteWithTags> {
  const [result] = await getPool().execute<ResultSetHeader>(
    'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
    [userId, title, content],
  );

  // New note has no pre-existing tags — skip the DELETE, just INSERT.
  await insertNoteTags(result.insertId, tags);

  // Fetch the row to get DB-generated timestamps; reuse the tags we just set.
  const row = await findNoteRow(result.insertId);

  if (!row) {
    throw new Error('Failed to create note');
  }

  return { ...row, tags };
}

export interface QueryNotesOptions {
  search?: string;
  tag?: string;
}

export async function queryNotes(
  userId: number,
  options: QueryNotesOptions = {},
): Promise<NoteWithTags[]> {
  const conditions: string[] = ['n.user_id = ?'];
  const params: (number | string)[] = [userId];

  if (options.search) {
    conditions.push('(n.title LIKE ? OR n.content LIKE ?)');
    const pattern = `%${options.search}%`;
    params.push(pattern, pattern);
  }

  if (options.tag) {
    conditions.push(
      'EXISTS (SELECT 1 FROM note_tags nt WHERE nt.note_id = n.id AND nt.name = ?)',
    );
    params.push(options.tag);
  }

  const where = conditions.join(' AND ');

  const [rows] = await getPool().execute<NoteRow[]>(
    `SELECT n.id, n.user_id, n.title, n.content, n.created_at, n.updated_at
     FROM notes n
     WHERE ${where}
     ORDER BY n.created_at DESC`,
    params,
  );

  if (rows.length === 0) {
    return [];
  }

  const noteIds = rows.map((r) => r.id);
  const tagMap = await getTagsForNotes(noteIds);

  return rows.map((row) => ({
    ...row,
    tags: tagMap.get(row.id) ?? [],
  }));
}

export async function findNotesByUserId(userId: number): Promise<NoteWithTags[]> {
  return queryNotes(userId);
}

export async function findNoteById(id: number): Promise<NoteWithTags | null> {
  const row = await findNoteRow(id);

  if (!row) {
    return null;
  }

  const tagMap = await getTagsForNotes([id]);
  return { ...row, tags: tagMap.get(id) ?? [] };
}

export async function updateNote(
  id: number,
  title: string,
  content: string,
  tags: string[],
): Promise<NoteWithTags | null> {
  await getPool().execute(
    'UPDATE notes SET title = ?, content = ? WHERE id = ?',
    [title, content, id],
  );

  // Replace tags: delete old, insert new.
  await replaceNoteTags(id, tags);

  // Fetch the row to get the DB-updated `updated_at`; reuse the tags we just set.
  const row = await findNoteRow(id);

  if (!row) {
    return null;
  }

  return { ...row, tags };
}

export async function deleteNote(id: number): Promise<void> {
  // note_tags rows are cleaned up by ON DELETE CASCADE on the FK.
  await getPool().execute('DELETE FROM notes WHERE id = ?', [id]);
}

export async function deleteNotesByUserId(userId: number): Promise<void> {
  await getPool().execute('DELETE FROM notes WHERE user_id = ?', [userId]);
}
