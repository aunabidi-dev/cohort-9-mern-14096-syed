import { describe, it, before, after, beforeEach, type Context } from 'mocha';
import { expect } from 'chai';
import type { Server } from 'http';
import app from '../app';
import { closePool, initializeDatabase } from '../config/database';
import { deleteUserByEmail } from '../models/user';
import { deleteNotesByUserId } from '../models/note';
import { generateToken } from '../utils/auth';
import { createUser } from '../models/user';
import { hashPassword } from '../utils/auth';

const isDatabaseOptOutEnabled = process.env.SKIP_DB_TESTS === 'true';

const userAEmail = `notes-test-a-${Date.now()}@example.com`;
const userBEmail = `notes-test-b-${Date.now()}@example.com`;
const testPassword = 'SecurePass123!';

function startServer(): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on('error', reject);
  });
}

function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.closeAllConnections();
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function apiRequest(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<globalThis.Response> {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

describe('Phase 3 notes API', function (this: Context) {
  this.timeout(10000);

  let server: Server;
  let baseUrl: string;
  let userAId: number | undefined;
  let userBId: number | undefined;
  let tokenA: string;
  let tokenB: string;

  before(async function (this: Context) {
    this.timeout(15000);

    try {
      await initializeDatabase();
    } catch (error) {
      if (isDatabaseOptOutEnabled) {
        this.skip();
        return;
      }

      throw error;
    }

    // Create two test users for isolation tests
    const passwordHash = await hashPassword(testPassword);

    const userA = await createUser('Notes User A', userAEmail, passwordHash);
    const userB = await createUser('Notes User B', userBEmail, passwordHash);

    userAId = userA.id;
    userBId = userB.id;

    tokenA = generateToken({ userId: userAId, email: userAEmail });
    tokenB = generateToken({ userId: userBId, email: userBEmail });

    server = await startServer();
    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Unable to resolve test server address');
    }

    baseUrl = `http://127.0.0.1:${address.port}/api`;
  });

  after(async () => {
    if (server) {
      await stopServer(server);
    }

    // Guard cleanup so partial initialisation doesn't leave dangling users.
    if (userAId !== undefined) {
      await deleteNotesByUserId(userAId);
      await deleteUserByEmail(userAEmail);
    }

    if (userBId !== undefined) {
      await deleteNotesByUserId(userBId);
      await deleteUserByEmail(userBEmail);
    }

    await closePool();
  });

  beforeEach(async () => {
    // Only clean up if setup completed successfully.
    if (userAId !== undefined) {
      await deleteNotesByUserId(userAId);
    }

    if (userBId !== undefined) {
      await deleteNotesByUserId(userBId);
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/notes — Create
  // ---------------------------------------------------------------------------

  describe('POST /notes', () => {
    it('authenticated user can create a note', async () => {
      const response = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'My First Note', content: 'Hello world.' }),
      });

      expect(response.status).to.equal(201);

      const body = (await response.json()) as {
        id: number;
        user_id: number;
        title: string;
        content: string;
      };

      expect(body.id).to.be.a('number');
      expect(body.user_id).to.equal(userAId);
      expect(body.title).to.equal('My First Note');
      expect(body.content).to.equal('Hello world.');
    });

    it('unauthenticated request is rejected', async () => {
      const response = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test', content: 'Test content.' }),
      });

      expect(response.status).to.equal(401);
    });

    it('missing title is rejected', async () => {
      const response = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ content: 'No title here.' }),
      });

      expect(response.status).to.equal(400);

      const body = (await response.json()) as { message: string };
      expect(body.message).to.equal('Title and content are required');
    });

    it('missing content is rejected', async () => {
      const response = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'A title' }),
      });

      expect(response.status).to.equal(400);

      const body = (await response.json()) as { message: string };
      expect(body.message).to.equal('Title and content are required');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/notes — Retrieve all
  // ---------------------------------------------------------------------------

  describe('GET /notes', () => {
    it('authenticated user can retrieve their notes', async () => {
      // Create a note first
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Note A', content: 'Content A.' }),
      });

      const response = await apiRequest(baseUrl, '/notes', {
        headers: authHeader(tokenA),
      });

      expect(response.status).to.equal(200);

      const body = (await response.json()) as Array<{
        user_id: number;
        title: string;
      }>;

      expect(body).to.be.an('array').with.length.greaterThan(0);
      expect(body.every((n) => n.user_id === userAId)).to.equal(true);
    });

    it('returns only notes belonging to the authenticated user', async () => {
      // Create one note per user
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'User A Note', content: 'From A.' }),
      });

      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenB),
        body: JSON.stringify({ title: 'User B Note', content: 'From B.' }),
      });

      const response = await apiRequest(baseUrl, '/notes', {
        headers: authHeader(tokenA),
      });

      const body = (await response.json()) as Array<{ user_id: number }>;

      expect(body.every((n) => n.user_id === userAId)).to.equal(true);
    });

    it('unauthenticated request is rejected', async () => {
      const response = await apiRequest(baseUrl, '/notes');

      expect(response.status).to.equal(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/notes/:id — Retrieve one
  // ---------------------------------------------------------------------------

  describe('GET /notes/:id', () => {
    it('authenticated user can retrieve one of their notes', async () => {
      const createResponse = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Single Note', content: 'Just this.' }),
      });

      const created = (await createResponse.json()) as { id: number };

      const response = await apiRequest(baseUrl, `/notes/${created.id}`, {
        headers: authHeader(tokenA),
      });

      expect(response.status).to.equal(200);

      const body = (await response.json()) as {
        id: number;
        user_id: number;
        title: string;
      };

      expect(body.id).to.equal(created.id);
      expect(body.user_id).to.equal(userAId);
      expect(body.title).to.equal('Single Note');
    });

    it('unauthenticated request is rejected', async () => {
      const response = await apiRequest(baseUrl, '/notes/1');

      expect(response.status).to.equal(401);
    });

    it('user cannot retrieve another user\'s note', async () => {
      const createResponse = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Private', content: 'Only for A.' }),
      });

      const created = (await createResponse.json()) as { id: number };

      // User B tries to read User A's note
      const response = await apiRequest(baseUrl, `/notes/${created.id}`, {
        headers: authHeader(tokenB),
      });

      expect(response.status).to.equal(404);
    });

    it('returns 400 for a non-numeric note ID', async () => {
      const response = await apiRequest(baseUrl, '/notes/not-a-number', {
        headers: authHeader(tokenA),
      });

      expect(response.status).to.equal(400);
    });
  });

  // ---------------------------------------------------------------------------
  // PUT /api/notes/:id — Update
  // ---------------------------------------------------------------------------

  describe('PUT /notes/:id', () => {
    it('owner can update their note', async () => {
      const createResponse = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Original', content: 'Original content.' }),
      });

      const created = (await createResponse.json()) as { id: number };

      const response = await apiRequest(baseUrl, `/notes/${created.id}`, {
        method: 'PUT',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Updated', content: 'Updated content.' }),
      });

      expect(response.status).to.equal(200);

      const body = (await response.json()) as {
        id: number;
        title: string;
        content: string;
      };

      expect(body.id).to.equal(created.id);
      expect(body.title).to.equal('Updated');
      expect(body.content).to.equal('Updated content.');
    });

    it('unauthenticated request is rejected', async () => {
      const response = await apiRequest(baseUrl, '/notes/1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'X', content: 'Y.' }),
      });

      expect(response.status).to.equal(401);
    });

    it('user cannot update another user\'s note', async () => {
      const createResponse = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'A note', content: 'Owned by A.' }),
      });

      const created = (await createResponse.json()) as { id: number };

      // User B tries to update User A's note
      const response = await apiRequest(baseUrl, `/notes/${created.id}`, {
        method: 'PUT',
        headers: authHeader(tokenB),
        body: JSON.stringify({ title: 'Hacked', content: 'Modified by B.' }),
      });

      expect(response.status).to.equal(404);
    });

    it('invalid update data is rejected', async () => {
      const createResponse = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'To Update', content: 'Valid content.' }),
      });

      const created = (await createResponse.json()) as { id: number };

      const response = await apiRequest(baseUrl, `/notes/${created.id}`, {
        method: 'PUT',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: '', content: '' }),
      });

      expect(response.status).to.equal(400);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /api/notes/:id — Delete
  // ---------------------------------------------------------------------------

  describe('DELETE /notes/:id', () => {
    it('owner can delete their note', async () => {
      const createResponse = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Deletable', content: 'Bye bye.' }),
      });

      const created = (await createResponse.json()) as { id: number };

      const deleteResponse = await apiRequest(baseUrl, `/notes/${created.id}`, {
        method: 'DELETE',
        headers: authHeader(tokenA),
      });

      expect(deleteResponse.status).to.equal(204);

      // Confirm it's gone
      const getResponse = await apiRequest(baseUrl, `/notes/${created.id}`, {
        headers: authHeader(tokenA),
      });

      expect(getResponse.status).to.equal(404);
    });

    it('unauthenticated request is rejected', async () => {
      const response = await apiRequest(baseUrl, '/notes/1', {
        method: 'DELETE',
      });

      expect(response.status).to.equal(401);
    });

    it('user cannot delete another user\'s note', async () => {
      const createResponse = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Protected', content: 'A owns this.' }),
      });

      const created = (await createResponse.json()) as { id: number };

      // User B tries to delete User A's note
      const response = await apiRequest(baseUrl, `/notes/${created.id}`, {
        method: 'DELETE',
        headers: authHeader(tokenB),
      });

      expect(response.status).to.equal(404);

      // Note should still exist for User A
      const getResponse = await apiRequest(baseUrl, `/notes/${created.id}`, {
        headers: authHeader(tokenA),
      });

      expect(getResponse.status).to.equal(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Isolation — User A cannot access User B's data (and vice versa)
  // ---------------------------------------------------------------------------

  describe('user isolation', () => {
    it('user A cannot read, update, or delete user B\'s notes', async () => {
      // Create a note as User B
      const createResponse = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenB),
        body: JSON.stringify({ title: 'B Private', content: 'Only B sees this.' }),
      });

      const created = (await createResponse.json()) as { id: number };

      const [getRes, putRes, deleteRes] = await Promise.all([
        apiRequest(baseUrl, `/notes/${created.id}`, {
          headers: authHeader(tokenA),
        }),
        apiRequest(baseUrl, `/notes/${created.id}`, {
          method: 'PUT',
          headers: authHeader(tokenA),
          body: JSON.stringify({ title: 'Hijack', content: 'Hijacked.' }),
        }),
        apiRequest(baseUrl, `/notes/${created.id}`, {
          method: 'DELETE',
          headers: authHeader(tokenA),
        }),
      ]);

      expect(getRes.status).to.equal(404);
      expect(putRes.status).to.equal(404);
      expect(deleteRes.status).to.equal(404);

      // Note still exists for User B
      const ownerGet = await apiRequest(baseUrl, `/notes/${created.id}`, {
        headers: authHeader(tokenB),
      });

      expect(ownerGet.status).to.equal(200);
    });

    it('GET /notes does not leak notes across users', async () => {
      // Each user creates a note
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'A Note', content: 'From A.' }),
      });

      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenB),
        body: JSON.stringify({ title: 'B Note', content: 'From B.' }),
      });

      const [resA, resB] = await Promise.all([
        apiRequest(baseUrl, '/notes', { headers: authHeader(tokenA) }),
        apiRequest(baseUrl, '/notes', { headers: authHeader(tokenB) }),
      ]);

      const notesA = (await resA.json()) as Array<{ id: number; user_id: number }>;
      const notesB = (await resB.json()) as Array<{ id: number; user_id: number }>;

      expect(notesA.every((n) => n.user_id === userAId)).to.equal(true);
      expect(notesB.every((n) => n.user_id === userBId)).to.equal(true);

      // Cross-check: B's notes are not in A's list
      const bNoteIds = notesB.map((n) => n.id);
      const aNoteIds = notesA.map((n) => n.id);

      expect(bNoteIds.some((id) => aNoteIds.includes(id))).to.equal(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Tags — CRUD integration
  // ---------------------------------------------------------------------------

  describe('tags on notes', () => {
    it('can create a note with tags and tags are returned', async () => {
      const response = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'Tagged Note',
          content: 'Has tags.',
          tags: ['University', 'Math'],
        }),
      });

      expect(response.status).to.equal(201);

      const body = (await response.json()) as {
        id: number;
        tags: string[];
      };

      expect(body.tags).to.be.an('array').that.includes.members(['University', 'Math']);
    });

    it('can create a note without tags (tags defaults to empty array)', async () => {
      const response = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'No Tag Note', content: 'Plain.' }),
      });

      expect(response.status).to.equal(201);

      const body = (await response.json()) as { tags: string[] };
      expect(body.tags).to.be.an('array').that.is.empty;
    });

    it('can update a note to change its tags', async () => {
      const createRes = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'Updateable Tags',
          content: 'Will change.',
          tags: ['OldTag'],
        }),
      });

      const created = (await createRes.json()) as { id: number };

      const updateRes = await apiRequest(baseUrl, `/notes/${created.id}`, {
        method: 'PUT',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'Updateable Tags',
          content: 'Changed tags.',
          tags: ['NewTag', 'AnotherTag'],
        }),
      });

      expect(updateRes.status).to.equal(200);

      const body = (await updateRes.json()) as { tags: string[] };
      expect(body.tags).to.include.members(['NewTag', 'AnotherTag']);
      expect(body.tags).to.not.include('OldTag');
    });

    it('can update a note to remove all tags', async () => {
      const createRes = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'Remove Tags',
          content: 'Will lose tags.',
          tags: ['Temp'],
        }),
      });

      const created = (await createRes.json()) as { id: number };

      const updateRes = await apiRequest(baseUrl, `/notes/${created.id}`, {
        method: 'PUT',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'Remove Tags',
          content: 'No more tags.',
          tags: [],
        }),
      });

      expect(updateRes.status).to.equal(200);

      const body = (await updateRes.json()) as { tags: string[] };
      expect(body.tags).to.be.an('array').that.is.empty;
    });

    it('rejects tags that are not an array', async () => {
      const response = await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'Bad Tags',
          content: 'Bad tags.',
          tags: 'not-an-array',
        }),
      });

      expect(response.status).to.equal(400);

      const body = (await response.json()) as { message: string };
      expect(body.message).to.equal('Tags must be an array of strings');
    });
  });

  // ---------------------------------------------------------------------------
  // Search — GET /api/notes?search=
  // ---------------------------------------------------------------------------

  describe('search', () => {
    it('returns notes matching the search term in the title', async () => {
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Project Alpha Plan', content: 'Details here.' }),
      });
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Shopping list', content: 'Eggs and milk.' }),
      });

      const response = await apiRequest(baseUrl, '/notes?search=alpha', {
        headers: authHeader(tokenA),
      });

      expect(response.status).to.equal(200);

      const body = (await response.json()) as Array<{ title: string }>;
      expect(body).to.be.an('array').with.lengthOf(1);
      expect(body[0]?.title).to.equal('Project Alpha Plan');
    });

    it('returns notes matching the search term in the content', async () => {
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'My Note', content: 'Contains algebra revision.' }),
      });
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Another Note', content: 'Nothing relevant.' }),
      });

      const response = await apiRequest(baseUrl, '/notes?search=algebra', {
        headers: authHeader(tokenA),
      });

      expect(response.status).to.equal(200);

      const body = (await response.json()) as Array<{ content: string }>;
      expect(body).to.have.lengthOf(1);
      expect(body[0]?.content).to.include('algebra');
    });

    it('search is case-insensitive', async () => {
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Budget Review', content: 'Q4 numbers.' }),
      });

      const response = await apiRequest(baseUrl, '/notes?search=BUDGET', {
        headers: authHeader(tokenA),
      });

      expect(response.status).to.equal(200);

      const body = (await response.json()) as Array<{ title: string }>;
      expect(body.some((n) => n.title === 'Budget Review')).to.equal(true);
    });

    it('search only returns the authenticated user\'s notes', async () => {
      // Create a matching note for User A so every() is non-vacuous.
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Shared keyword note', content: 'From A.' }),
      });

      // User B also has a matching note that must not appear in A's results.
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenB),
        body: JSON.stringify({ title: 'Shared keyword note', content: 'From B.' }),
      });

      const response = await apiRequest(
        baseUrl,
        '/notes?search=shared+keyword',
        { headers: authHeader(tokenA) },
      );

      const body = (await response.json()) as Array<{ user_id: number }>;
      expect(body).to.have.lengthOf(1);
      expect(body.every((n) => n.user_id === userAId)).to.equal(true);
    });

    it('returns empty array when search matches nothing', async () => {
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Hello', content: 'World.' }),
      });

      const response = await apiRequest(baseUrl, '/notes?search=zzznomatch', {
        headers: authHeader(tokenA),
      });

      const body = (await response.json()) as unknown[];
      expect(body).to.be.an('array').that.is.empty;
    });
  });

  // ---------------------------------------------------------------------------
  // Tag filter — GET /api/notes?tag=
  // ---------------------------------------------------------------------------

  describe('tag filter', () => {
    it('returns only notes with the requested tag', async () => {
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'Math Note',
          content: 'Vectors.',
          tags: ['Math', 'Exam'],
        }),
      });
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'Work Note',
          content: 'Sprint planning.',
          tags: ['Work'],
        }),
      });

      const response = await apiRequest(baseUrl, '/notes?tag=Math', {
        headers: authHeader(tokenA),
      });

      expect(response.status).to.equal(200);

      const body = (await response.json()) as Array<{
        title: string;
        tags: string[];
      }>;

      expect(body).to.have.lengthOf(1);
      expect(body[0]?.title).to.equal('Math Note');
      expect(body[0]?.tags).to.include('Math');
    });

    it('notes without the requested tag are excluded', async () => {
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'Untagged Note',
          content: 'No tag here.',
        }),
      });

      const response = await apiRequest(baseUrl, '/notes?tag=University', {
        headers: authHeader(tokenA),
      });

      const body = (await response.json()) as unknown[];
      expect(body).to.be.an('array').that.is.empty;
    });

    it('tag filter only returns the authenticated user\'s notes', async () => {
      // User A also gets a Work-tagged note so every() is non-vacuous.
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'A Work Note',
          content: 'From A.',
          tags: ['Work'],
        }),
      });

      // User B creates a note with the same tag that must not appear for A.
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenB),
        body: JSON.stringify({
          title: 'B Work Note',
          content: 'From B.',
          tags: ['Work'],
        }),
      });

      const response = await apiRequest(baseUrl, '/notes?tag=Work', {
        headers: authHeader(tokenA),
      });

      const body = (await response.json()) as Array<{ user_id: number }>;
      expect(body).to.have.lengthOf(1);
      expect(body.every((n) => n.user_id === userAId)).to.equal(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Combined search + tag filter
  // ---------------------------------------------------------------------------

  describe('combined search and tag filter', () => {
    it('returns notes matching both search and tag', async () => {
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'Project Work Note',
          content: 'Sprint details.',
          tags: ['Work'],
        }),
      });
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'Project Personal Note',
          content: 'Side project.',
          tags: ['Personal'],
        }),
      });
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'Random Work Note',
          content: 'Stand-up notes.',
          tags: ['Work'],
        }),
      });

      const response = await apiRequest(
        baseUrl,
        '/notes?search=project&tag=Work',
        { headers: authHeader(tokenA) },
      );

      expect(response.status).to.equal(200);

      const body = (await response.json()) as Array<{
        title: string;
        tags: string[];
      }>;

      // Only "Project Work Note" matches both
      expect(body).to.have.lengthOf(1);
      expect(body[0]?.title).to.equal('Project Work Note');
      expect(body[0]?.tags).to.include('Work');
    });

    it('returns empty array when combined filter matches nothing', async () => {
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({
          title: 'Alpha Note',
          content: 'Content.',
          tags: ['Work'],
        }),
      });

      const response = await apiRequest(
        baseUrl,
        '/notes?search=alpha&tag=Personal',
        { headers: authHeader(tokenA) },
      );

      const body = (await response.json()) as unknown[];
      expect(body).to.be.an('array').that.is.empty;
    });

    it('GET /notes with no params still returns all user notes', async () => {
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Note One', content: 'One.' }),
      });
      await apiRequest(baseUrl, '/notes', {
        method: 'POST',
        headers: authHeader(tokenA),
        body: JSON.stringify({ title: 'Note Two', content: 'Two.' }),
      });

      const response = await apiRequest(baseUrl, '/notes', {
        headers: authHeader(tokenA),
      });

      const body = (await response.json()) as unknown[];
      expect(body).to.be.an('array').with.length.greaterThan(1);
    });
  });
});
