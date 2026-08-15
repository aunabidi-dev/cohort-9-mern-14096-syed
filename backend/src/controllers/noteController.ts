import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import * as noteService from '../services/noteService';
import type {
  CreateNoteInput,
  GetNotesFilter,
  UpdateNoteInput,
} from '../services/noteService';
import { AppError } from '../types/error';
import type { NoteWithTags } from '../models/note';

function getAuthenticatedUserId(req: AuthenticatedRequest): number {
  if (!req.user) {
    throw new AppError(401, 'Authentication required');
  }

  return req.user.id;
}

function getRouteParam(req: AuthenticatedRequest, name: string): string {
  const value = req.params[name];

  if (typeof value !== 'string') {
    throw new AppError(400, `Invalid route parameter: ${name}`);
  }

  return value;
}

function getStringQuery(
  req: AuthenticatedRequest,
  name: string,
): string | undefined {
  const value = req.query[name];

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function createNote(
  req: AuthenticatedRequest,
  res: Response<NoteWithTags>,
): Promise<void> {
  const userId = getAuthenticatedUserId(req);
  const input = req.body as CreateNoteInput;
  const note = await noteService.createNoteForUser(userId, input);
  res.status(201).json(note);
}

export async function getNotes(
  req: AuthenticatedRequest,
  res: Response<NoteWithTags[]>,
): Promise<void> {
  const userId = getAuthenticatedUserId(req);

  const filter: GetNotesFilter = {
    search: getStringQuery(req, 'search'),
    tag: getStringQuery(req, 'tag'),
  };

  const notes = await noteService.getNotesForUser(userId, filter);
  res.status(200).json(notes);
}

export async function getNote(
  req: AuthenticatedRequest,
  res: Response<NoteWithTags>,
): Promise<void> {
  const userId = getAuthenticatedUserId(req);
  const note = await noteService.getNoteForUser(userId, getRouteParam(req, 'id'));
  res.status(200).json(note);
}

export async function updateNote(
  req: AuthenticatedRequest,
  res: Response<NoteWithTags>,
): Promise<void> {
  const userId = getAuthenticatedUserId(req);
  const input = req.body as UpdateNoteInput;
  const note = await noteService.updateNoteForUser(
    userId,
    getRouteParam(req, 'id'),
    input,
  );
  res.status(200).json(note);
}

export async function deleteNote(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = getAuthenticatedUserId(req);
  await noteService.deleteNoteForUser(userId, getRouteParam(req, 'id'));
  res.status(204).send();
}
