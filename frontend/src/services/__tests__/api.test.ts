import { api, getStoredToken, setStoredToken, removeStoredToken } from '../api';
import { authService } from '../authService';
import { notesService } from '../notesService';

describe('API and Storage Services', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Token Storage Helpers', () => {
    it('stores, retrieves, and removes auth token correctly', () => {
      expect(getStoredToken()).toBeNull();

      setStoredToken('test-jwt-token-xyz');
      expect(getStoredToken()).toBe('test-jwt-token-xyz');
      expect(localStorage.getItem('auth_token')).toBe('test-jwt-token-xyz');

      removeStoredToken();
      expect(getStoredToken()).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('handles localStorage exceptions safely without crashing', () => {
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('QuotaExceeded or SecurityError');
      });
      expect(getStoredToken()).toBeNull();
      getItemSpy.mockRestore();

      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded or SecurityError');
      });
      expect(() => setStoredToken('token')).not.toThrow();
      setItemSpy.mockRestore();

      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('QuotaExceeded or SecurityError');
      });
      expect(() => removeStoredToken()).not.toThrow();
      removeItemSpy.mockRestore();
    });
  });

  describe('HTTP Methods (api.get, api.post, api.put, api.delete)', () => {
    it('sends GET request with Content-Type and Authorization header when token exists', async () => {
      setStoredToken('active-token-123');
      const mockResponseData = [{ id: 1, title: 'Note 1' }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponseData,
      });

      const result = await api.get('/notes');
      expect(result).toEqual(mockResponseData);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/notes');
      expect(options.method).toBe('GET');
      expect(options.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer active-token-123',
      });
    });

    it('sends POST request with stringified body', async () => {
      const requestPayload = { title: 'New Note', content: 'Body content' };
      const responseData = { id: 10, ...requestPayload };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => responseData,
      });

      const result = await api.post('/notes', requestPayload);
      expect(result).toEqual(responseData);

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify(requestPayload));
    });

    it('sends PUT request with stringified body', async () => {
      const updatePayload = { title: 'Updated Title' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 5, ...updatePayload }),
      });

      const result = await api.put('/notes/5', updatePayload);
      expect(result).toEqual({ id: 5, ...updatePayload });

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/notes/5');
      expect(options.method).toBe('PUT');
      expect(options.body).toBe(JSON.stringify(updatePayload));
    });

    it('sends DELETE request and handles 204 No Content response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await api.delete('/notes/42');
      expect(result).toBeUndefined();

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/notes/42');
      expect(options.method).toBe('DELETE');
    });

    it('extracts server error message from JSON error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Validation failed: title is required' }),
      });

      await expect(api.post('/notes', {})).rejects.toThrow('Validation failed: title is required');
    });

    it('handles non-JSON error response with status code fallback', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Not JSON');
        },
      });

      await expect(api.get('/notes')).rejects.toThrow('Request failed with status 500');
    });

    it('wraps network errors in a standard Error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(api.get('/notes')).rejects.toThrow('Failed to fetch');
    });
  });

  describe('authService', () => {
    it('calls /auth/login with user credentials', async () => {
      const credentials = { email: 'user@example.com', password: 'password123' };
      const authResult = {
        token: 'token-abc',
        user: { id: 1, email: 'user@example.com', name: 'User' },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => authResult,
      });

      const res = await authService.login(credentials);
      expect(res).toEqual(authResult);

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/auth/login');
      expect(options.body).toBe(JSON.stringify(credentials));
    });

    it('calls /auth/register with user registration details', async () => {
      const registerData = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
      };
      const authResult = {
        token: 'token-def',
        user: { id: 2, email: 'new@example.com', name: 'New User' },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => authResult,
      });

      const res = await authService.register(registerData);
      expect(res).toEqual(authResult);

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/auth/register');
      expect(options.body).toBe(JSON.stringify(registerData));
    });
  });

  describe('notesService', () => {
    it('fetches notes without query params when no filter provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      });

      await notesService.getNotes();
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toMatch(/\/notes$/);
    });

    it('builds query string correctly with search and tag filters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      });

      await notesService.getNotes({ search: 'meeting notes', tag: 'work' });
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('search=meeting+notes');
      expect(url).toContain('tag=work');
    });

    it('calls getNote, createNote, updateNote, and deleteNote on corresponding endpoints', async () => {
      // getNote
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 7, title: 'Single Note' }),
      });
      const single = await notesService.getNote(7);
      expect(single.id).toBe(7);
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/notes/7');

      // createNote
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 8, title: 'Created Note' }),
      });
      const created = await notesService.createNote({ title: 'Created Note', content: 'C' });
      expect(created.id).toBe(8);

      // updateNote
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 8, title: 'Updated' }),
      });
      const updated = await notesService.updateNote(8, { title: 'Updated' });
      expect(updated.title).toBe('Updated');

      // deleteNote
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });
      await notesService.deleteNote(8);
      expect((global.fetch as jest.Mock).mock.calls[3][0]).toContain('/notes/8');
    });
  });
});
