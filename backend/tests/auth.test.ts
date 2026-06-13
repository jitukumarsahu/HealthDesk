import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';

import { connectTestDB, closeTestDB } from './db.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Authentication Flow', () => {
  const testUser = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Password123'
  };

  it('should register a new Patient user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.role).toBe('SuperAdmin'); // First registered user becomes SuperAdmin automatically

    const dbUser = await User.findOne({ email: testUser.email });
    expect(dbUser).toBeDefined();
    expect(dbUser?.role).toBe('SuperAdmin');
  });

  it('should register subsequent users as Patients', async () => {
    // Register first user (Admin)
    await request(app).post('/api/auth/register').send(testUser);

    // Register second user
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.user.role).toBe('Patient');
  });

  it('should log in a user and set cookies', async () => {
    // Register
    await request(app).post('/api/auth/register').send(testUser);

    // Login
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe(testUser.email);

    // Check cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('refreshToken');
  });

  it('should reject login with wrong password', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
