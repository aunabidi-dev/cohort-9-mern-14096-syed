import { api } from './api';
import type {
  CreateNoteInput,
  Note,
  NoteFilter,
  UpdateNoteInput,
} from '../types/notes';

export const notesService = {
  getNotes: async (filter?: NoteFilter): Promise<Note[]> => {
    const params = new URLSearchParams();
    if (filter?.search?.trim()) {
      params.append('search', filter.search.trim());
    }
    if (filter?.tag?.trim()) {
      params.append('tag', filter.tag.trim());
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/notes?${queryString}` : '/notes';
    return api.get<Note[]>(endpoint);
  },

  getNote: async (id: number): Promise<Note> => {
    return api.get<Note>(`/notes/${id}`);
  },

  createNote: async (input: CreateNoteInput): Promise<Note> => {
    return api.post<Note>('/notes', input);
  },

  updateNote: async (id: number, input: UpdateNoteInput): Promise<Note> => {
    return api.put<Note>(`/notes/${id}`, input);
  },

  deleteNote: async (id: number): Promise<void> => {
    return api.delete<void>(`/notes/${id}`);
  },
};
