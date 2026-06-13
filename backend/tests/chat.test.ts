import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Slot } from '../src/models/Slot.js';
import { Appointment } from '../src/models/Appointment.js';
import { Message } from '../src/models/Message.js';
import { connectTestDB, closeTestDB } from './db.js';

let adminToken: string;
let doctorToken: string;
let doctorId: string;
let patientToken: string;
let patientId: string;
let appointmentId: string;

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Slot.deleteMany({});
  await Appointment.deleteMany({});
  await Message.deleteMany({});

  // 1. Create Admin
  await request(app).post('/api/auth/register').send({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Password123'
  });
  
  const loginAdmin = await request(app).post('/api/auth/login').send({
    email: 'admin@example.com',
    password: 'Password123'
  });
  adminToken = loginAdmin.body.accessToken;

  // 2. Admin creates Doctor
  const docRes = await request(app)
    .post('/api/admin/doctors')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Dr. Smith',
      email: 'smith@example.com',
      password: 'Password123',
      specialization: 'Cardiology'
    });
  doctorId = docRes.body.doctor.id;

  const loginDoc = await request(app).post('/api/auth/login').send({
    email: 'smith@example.com',
    password: 'Password123'
  });
  doctorToken = loginDoc.body.accessToken;

  // 3. Create Patient
  const patRes = await request(app).post('/api/auth/register').send({
    name: 'Patient One',
    email: 'patient1@example.com',
    password: 'Password123'
  });
  patientId = patRes.body.user.id;

  const loginPat = await request(app).post('/api/auth/login').send({
    email: 'patient1@example.com',
    password: 'Password123'
  });
  patientToken = loginPat.body.accessToken;

  // 4. Create slot and book appointment
  const slot = new Slot({
    doctorId: new mongoose.Types.ObjectId(doctorId),
    dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    duration: 30,
    isBooked: true
  });
  await slot.save();

  const appointment = new Appointment({
    patientId: new mongoose.Types.ObjectId(patientId),
    doctorId: new mongoose.Types.ObjectId(doctorId),
    slotId: slot._id,
    dateTime: slot.dateTime,
    duration: 30,
    status: 'Pending',
    reason: 'Routine checkup'
  });
  await appointment.save();
  appointmentId = appointment._id.toString();
});

describe('Secure Workspace Chat System', () => {
  it('should block sending messages when appointment is not Confirmed', async () => {
    // Attempt sending message on Pending appointment
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        receiverId: doctorId,
        appointmentId,
        text: 'Hello doctor'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Chat is only active for Confirmed appointments');
  });

  it('should allow sending and retrieving messages when appointment is Confirmed', async () => {
    // 1. Confirm appointment
    await Appointment.findByIdAndUpdate(appointmentId, { status: 'Confirmed' });

    // 2. Patient sends message
    const res1 = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        receiverId: doctorId,
        appointmentId,
        text: 'Hello doctor, this is a test message.'
      });

    expect(res1.statusCode).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.text).toBe('Hello doctor, this is a test message.');

    // 3. Get history as Doctor
    const res2 = await request(app)
      .get(`/api/chat/messages/${patientId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res2.statusCode).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.messages).toHaveLength(1);
    expect(res2.body.messages[0].text).toBe('Hello doctor, this is a test message.');
  });

  it('should block sending messages after appointment is Completed', async () => {
    // 1. Confirm appointment
    await Appointment.findByIdAndUpdate(appointmentId, { status: 'Confirmed' });

    // 2. Complete appointment
    await Appointment.findByIdAndUpdate(appointmentId, { status: 'Completed' });

    // 3. Attempt message
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        receiverId: doctorId,
        appointmentId,
        text: 'Follow up question'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Chat is only active for Confirmed appointments');
  });
});
