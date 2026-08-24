import { logger as rootLogger } from '../utils/logger';
import type { NoteWithTags, QueryNotesOptions } from '../models/note';
import {
  createNote,
  deleteNote,
  findNoteById,
  findNoteRow,
  queryNotes,
  updateNote,
} from '../models/note';
import { AppError } from '../types/error';

const logger = rootLogger.child({ name: 'noteService' });

const MAX_TITLE_LENGTH = 255; // mirrors notes.title VARCHAR(255)
const MAX_TAG_LENGTH = 100;   // mirrors note_tags.name VARCHAR(100)
const MAX_TAGS_PER_NOTE = 50;

export interface CreateNoteInput {
  title?: unknown;
  content?: unknown;
  tags?: unknown;
}

export interface UpdateNoteInput {
  title?: unknown;
  content?: unknown;
  tags?: unknown;
}

export interface GetNotesFilter {
  search?: string;
  tag?: string;
}

function parseNoteId(rawId: string): number {
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid note ID');
  }

  return id;
}

function parseTitle(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new AppError(400, 'Title and content are required');
  }

  const trimmed = raw.trim();

  if (!trimmed) {
    throw new AppError(400, 'Title and content are required');
  }

  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new AppError(400, `Title must not exceed ${MAX_TITLE_LENGTH} characters`);
  }

  return trimmed;
}

function parseContent(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new AppError(400, 'Title and content are required');
  }

  const trimmed = raw.trim();

  if (!trimmed) {
    throw new AppError(400, 'Title and content are required');
  }

  return trimmed;
}

function parseTags(raw: unknown): string[] {
  if (raw === undefined || raw === null) {
    return [];
  }

  if (!Array.isArray(raw)) {
    throw new AppError(400, 'Tags must be an array of strings');
  }

  if (raw.length > MAX_TAGS_PER_NOTE) {
    throw new AppError(400, `Cannot have more than ${MAX_TAGS_PER_NOTE} tags per note`);
  }

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of raw) {
    if (typeof item !== 'string') {
      throw new AppError(400, 'Each tag must be a string');
    }

    const trimmed = item.trim();

    if (trimmed.length === 0) {
      continue;
    }

    if (trimmed.length > MAX_TAG_LENGTH) {
      throw new AppError(400, `Each tag must not exceed ${MAX_TAG_LENGTH} characters`);
    }

    // Deduplicate: keep first occurrence, preserve order.
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      tags.push(trimmed);
    }
  }

  return tags;
}

export async function createNoteForUser(
  userId: number,
  input: CreateNoteInput,
): Promise<NoteWithTags> {
  const title = parseTitle(input.title);
  const content = parseContent(input.content);
  const tags = parseTags(input.tags);

  try {
    return await createNote(userId, title, content, tags);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error({ error }, 'Unexpected error creating note');
    throw new AppError(500, 'Unable to create note');
  }
}

export async function getNotesForUser(
  userId: number,
  filter: GetNotesFilter = {},
): Promise<NoteWithTags[]> {
  const options: QueryNotesOptions = {};

  if (filter.search) {
    options.search = filter.search;
  }

  if (filter.tag) {
    options.tag = filter.tag;
  }

  return queryNotes(userId, options);
}

export async function getNoteForUser(
  userId: number,
  rawId: string,
): Promise<NoteWithTags> {
  const id = parseNoteId(rawId);
  const note = await findNoteById(id);

  if (!note || note.user_id !== userId) {
    throw new AppError(404, 'Note not found');
  }

  return note;
}

export async function updateNoteForUser(
  userId: number,
  rawId: string,
  input: UpdateNoteInput,
): Promise<NoteWithTags> {
  const id = parseNoteId(rawId);
  const title = parseTitle(input.title);
  const content = parseContent(input.content);
  const tags = parseTags(input.tags);

  try {
    // Auth check only — tags are not needed at this point.
    const note = await findNoteRow(id);

    if (!note || note.user_id !== userId) {
      throw new AppError(404, 'Note not found');
    }

    const updated = await updateNote(id, title, content, tags);

    if (!updated) {
      logger.error({ noteId: id }, 'Failed to fetch note after update');
      throw new AppError(500, 'Unable to update note');
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error({ error, noteId: id }, 'Unexpected error updating note');
    throw new AppError(500, 'Unable to update note');
  }
}

export async function deleteNoteForUser(
  userId: number,
  rawId: string,
): Promise<void> {
  const id = parseNoteId(rawId);
  // Auth check only — tags are not needed.
  const note = await findNoteRow(id);

  if (!note || note.user_id !== userId) {
    throw new AppError(404, 'Note not found');
  }

  await deleteNote(id);
}
