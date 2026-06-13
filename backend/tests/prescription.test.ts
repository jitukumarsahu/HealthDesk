import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Prescription } from '../src/models/Prescription.js';
import { AuditLog } from '../src/models/AuditLog.js';

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
  await Prescription.deleteMany({});
  await AuditLog.deleteMany({});

  // 1. Create Admin
  const adminRes = await request(app).post('/api/auth/register').send({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Password123'
  });
  adminToken = (await request(app).post('/api/auth/login').send({
    email: 'admin@example.com',
    password: 'Password123'
  })).body.accessToken;

  // 2. Admin creates Doctor
  const docRes = await request(app)
    .post('/api/admin/doctors')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Dr. John Watson',
      email: 'watson@example.com',
      password: 'Password123',
      specialization: 'General Medicine'
    });
  doctorId = docRes.body.doctor.id;
  doctorToken = (await request(app).post('/api/auth/login').send({
    email: 'watson@example.com',
    password: 'Password123'
  })).body.accessToken;

  // 3. Create Patients
  const patRes1 = await request(app).post('/api/auth/register').send({
    name: 'Sherlock Holmes',
    email: 'sherlock@example.com',
    password: 'Password123'
  });
  patientId = patRes1.body.user.id;
  patientToken = (await request(app).post('/api/auth/login').send({
    email: 'sherlock@example.com',
    password: 'Password123'
  })).body.accessToken;

  const patRes2 = await request(app).post('/api/auth/register').send({
    name: 'Irene Adler',
    email: 'irene@example.com',
    password: 'Password123'
  });
  patientId2 = patRes2.body.user.id;
  patientToken2 = (await request(app).post('/api/auth/login').send({
    email: 'irene@example.com',
    password: 'Password123'
  })).body.accessToken;
});

describe('Prescription Management', () => {
  const samplePrescription = {
    patientId: '',
    medicines: [
      { name: 'Aspirin', dosage: '100mg', frequency: '1-0-0', duration: '7 days' }
    ],
    consultationNotes: 'Take medicine after meals.'
  };

  it('should allow a doctor to create a prescription for a patient', async () => {
    samplePrescription.patientId = patientId;

    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send(samplePrescription);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.prescription).toHaveProperty('_id');
    expect(res.body.prescription.patientId).toBe(patientId);

    // Verify Audit Log was created
    const log = await AuditLog.findOne({ action: 'CREATE_PRESCRIPTION' });
    expect(log).toBeDefined();
    expect(log?.userId?.toString()).toBe(doctorId);
    expect(log?.resourceId).toBe(res.body.prescription._id);
  });

  it('should prevent patients from creating prescriptions', async () => {
    samplePrescription.patientId = patientId;

    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${patientToken}`)
      .send(samplePrescription);

    expect(res.statusCode).toBe(403);
  });

  it('should record an audit log when a patient views their prescription', async () => {
    // 1. Doctor creates prescription
    samplePrescription.patientId = patientId;
    const createRes = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send(samplePrescription);
    
    const prescriptionId = createRes.body.prescription._id;

    // Reset audit log collection before testing view
    await AuditLog.deleteMany({});

    // 2. Patient views their prescription
    const viewRes = await request(app)
      .get(`/api/prescriptions/${prescriptionId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send();

    expect(viewRes.statusCode).toBe(200);

    // 3. Verify that the view audit trail is saved
    const viewLog = await AuditLog.findOne({ action: 'VIEW_PRESCRIPTION' });
    expect(viewLog).toBeDefined();
    expect(viewLog?.userId?.toString()).toBe(patientId);
    expect(viewLog?.resourceId).toBe(prescriptionId);
  });

  it('should prevent patient A from viewing patient B\'s prescription', async () => {
    // 1. Doctor creates prescription for patient 1 (Sherlock)
    samplePrescription.patientId = patientId;
    const createRes = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send(samplePrescription);
    
    const prescriptionId = createRes.body.prescription._id;

    // 2. Patient 2 (Irene) attempts to view Patient 1's prescription
    const viewRes = await request(app)
      .get(`/api/prescriptions/${prescriptionId}`)
      .set('Authorization', `Bearer ${patientToken2}`)
      .send();

    expect(viewRes.statusCode).toBe(403);
  });

  it('should record an audit log when a patient downloads their prescription PDF', async () => {
    samplePrescription.patientId = patientId;
    const createRes = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send(samplePrescription);
    
    const prescriptionId = createRes.body.prescription._id;

    await AuditLog.deleteMany({});

    // Patient downloads PDF
    const downloadRes = await request(app)
      .get(`/api/prescriptions/${prescriptionId}/download`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send();

    expect(downloadRes.statusCode).toBe(200);
    expect(downloadRes.headers['content-type']).toBe('application/pdf');

    // Verify download audit trail is saved
    const downloadLog = await AuditLog.findOne({ action: 'DOWNLOAD_PRESCRIPTION_PDF' });
    expect(downloadLog).toBeDefined();
    expect(downloadLog?.userId?.toString()).toBe(patientId);
    expect(downloadLog?.resourceId).toBe(prescriptionId);
  });
});
