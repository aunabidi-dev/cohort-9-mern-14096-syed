import pino from 'pino';
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

const logger = pino({ name: 'noteService' });

export interface CreateNoteInput {
  title?: string;
  content?: string;
  tags?: unknown;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
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

function parseTags(raw: unknown): string[] {
  if (raw === undefined || raw === null) {
    return [];
  }

  if (!Array.isArray(raw)) {
    throw new AppError(400, 'Tags must be an array of strings');
  }

  const tags: string[] = [];

  for (const item of raw) {
    if (typeof item !== 'string') {
      throw new AppError(400, 'Each tag must be a string');
    }

    const trimmed = item.trim();

    if (trimmed.length > 0) {
      tags.push(trimmed);
    }
  }

  return tags;
}

export async function createNoteForUser(
  userId: number,
  input: CreateNoteInput,
): Promise<NoteWithTags> {
  const title = input.title?.trim();
  const content = input.content?.trim();

  if (!title || !content) {
    throw new AppError(400, 'Title and content are required');
  }

  const tags = parseTags(input.tags);

  return createNote(userId, title, content, tags);
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
  // Auth check only — tags are not needed at this point.
  const note = await findNoteRow(id);

  if (!note || note.user_id !== userId) {
    throw new AppError(404, 'Note not found');
  }

  const title = input.title?.trim();
  const content = input.content?.trim();

  if (!title || !content) {
    throw new AppError(400, 'Title and content are required');
  }

  const tags = parseTags(input.tags);

  const updated = await updateNote(id, title, content, tags);

  if (!updated) {
    logger.error({ noteId: id }, 'Failed to fetch note after update');
    throw new AppError(500, 'Unable to update note');
  }

  return updated;
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
