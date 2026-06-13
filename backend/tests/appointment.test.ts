import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Slot } from '../src/models/Slot.js';
import { Appointment } from '../src/models/Appointment.js';

import { connectTestDB, closeTestDB } from './db.js';

let adminToken: string;
let doctorToken: string;
let doctorId: string;
let patientToken: string;
let patientId: string;
let patientToken2: string;
let patientId2: string;

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

  // 1. Create Admin
  const adminRes = await request(app).post('/api/auth/register').send({
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

  // 3. Create Patient 1
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

  // 4. Create Patient 2
  const patRes2 = await request(app).post('/api/auth/register').send({
    name: 'Patient Two',
    email: 'patient2@example.com',
    password: 'Password123'
  });
  patientId2 = patRes2.body.user.id;

  const loginPat2 = await request(app).post('/api/auth/login').send({
    email: 'patient2@example.com',
    password: 'Password123'
  });
  patientToken2 = loginPat2.body.accessToken;
});

describe('Appointment & Slots Management', () => {
  it('should allow a doctor to create availability slots', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const res = await request(app)
      .post('/api/appointments/slots')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        dates: [tomorrow.toISOString()],
        duration: 30
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.slots).toHaveLength(1);
  });

  it('should prevent double booking of the same slot under concurrency', async () => {
    // 1. Create a slot
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const slot = new Slot({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      dateTime: tomorrow,
      duration: 30,
      isBooked: false
    });
    await slot.save();

    // 2. Trigger concurrent bookings from two patients
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ slotId: slot._id.toString(), reason: 'Chest pain' }),
      request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken2}`)
        .send({ slotId: slot._id.toString(), reason: 'Follow up' })
    ]);

    // One must succeed, the other must fail with conflict (409)
    const codes = [res1.statusCode, res2.statusCode];
    expect(codes).toContain(201);
    expect(codes).toContain(409);

    const appointments = await Appointment.find({ slotId: slot._id });
    expect(appointments).toHaveLength(1);
  });

  it('should release the slot when an appointment is cancelled', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);

    const slot = new Slot({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      dateTime: tomorrow,
      duration: 30,
      isBooked: false
    });
    await slot.save();

    // Book
    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ slotId: slot._id.toString(), reason: 'General checkup' });

    expect(bookRes.statusCode).toBe(201);
    const appointmentId = bookRes.body.appointment._id;

    // Check slot is booked
    let updatedSlot = await Slot.findById(slot._id);
    expect(updatedSlot?.isBooked).toBe(true);

    // Cancel
    const cancelRes = await request(app)
      .post(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send();

    expect(cancelRes.statusCode).toBe(200);

    // Check slot is released
    updatedSlot = await Slot.findById(slot._id);
    expect(updatedSlot?.isBooked).toBe(false);
  });
});
