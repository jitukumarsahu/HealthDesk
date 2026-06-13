import PDFDocument from 'pdfkit';
import { IPrescription } from '../models/Prescription.js';
import { IUser } from '../models/User.js';

export const generatePrescriptionPDF = (
  prescription: IPrescription,
  doctor: IUser,
  patient: IUser
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Header - Clinic / Platform Name
    doc.fillColor('#10b981').fontSize(24).text('HealthDesk', 50, 50, { align: 'left' });
    doc.fillColor('#6b7280').fontSize(10).text('Secure Healthcare Platform', 50, 78);
    
    // Doctor Details (Top Right)
    doc.fillColor('#1f2937').fontSize(14).text(`Dr. ${doctor.name}`, 350, 50, { align: 'right' });
    if (doctor.doctorProfile?.specialization) {
      doc.fillColor('#4b5563').fontSize(10).text(doctor.doctorProfile.specialization, 350, 68, { align: 'right' });
    }
    doc.fillColor('#6b7280').fontSize(9).text(doctor.email, 350, 82, { align: 'right' });

    // Divider Line
    doc.moveTo(50, 105).lineTo(545, 105).strokeColor('#e5e7eb').lineWidth(1.5).stroke();

    // Patient Information Section
    doc.fillColor('#1f2937').fontSize(12).text('PATIENT INFORMATION', 50, 125);
    doc.fillColor('#4b5563').fontSize(10)
      .text(`Name: ${patient.name}`, 50, 145)
      .text(`Email: ${patient.email}`, 50, 160);

    // Prescription Date & ID
    doc.fillColor('#4b5563').fontSize(10)
      .text(`Date: ${new Date(prescription.date).toLocaleDateString()}`, 350, 145, { align: 'right' })
      .text(`Prescription ID: ${prescription._id.toString()}`, 350, 160, { align: 'right' });

    // Divider Line
    doc.moveTo(50, 185).lineTo(545, 185).strokeColor('#e5e7eb').lineWidth(1).stroke();

    // Rx Symbol
    doc.fillColor('#10b981').fontSize(28).text('Rx', 50, 205);

    // Medicines Table/List Header
    let yPos = 245;
    doc.fillColor('#1f2937').fontSize(11).text('Medicine Name', 50, yPos);
    doc.text('Dosage', 220, yPos);
    doc.text('Frequency', 320, yPos);
    doc.text('Duration', 420, yPos);

    // Table Divider
    yPos += 18;
    doc.moveTo(50, yPos).lineTo(545, yPos).strokeColor('#10b981').lineWidth(1).stroke();
    
    // List Medicines
    doc.fillColor('#4b5563').fontSize(10);
    prescription.medicines.forEach((med) => {
      yPos += 22;
      
      // Page budget check
      if (yPos > 720) {
        doc.addPage();
        yPos = 50;
      }

      doc.text(med.name, 50, yPos, { width: 160 });
      doc.text(med.dosage, 220, yPos, { width: 90 });
      doc.text(med.frequency, 320, yPos, { width: 90 });
      doc.text(med.duration, 420, yPos, { width: 100 });
    });

    // Divider Line
    yPos += 30;
    doc.moveTo(50, yPos).lineTo(545, yPos).strokeColor('#e5e7eb').lineWidth(1).stroke();

    // Consultation Notes Section
    yPos += 15;
    if (yPos > 700) {
      doc.addPage();
      yPos = 50;
    }
    
    doc.fillColor('#1f2937').fontSize(12).text('Consultation Notes:', 50, yPos);
    yPos += 18;
    doc.fillColor('#4b5563').fontSize(10).text(prescription.consultationNotes, 50, yPos, {
      width: 495,
      align: 'justify',
      lineGap: 4
    });

    // Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fillColor('#9ca3af').fontSize(8).text(
        'This prescription is generated electronically and secured by HealthDesk.',
        50,
        780,
        { align: 'center', width: 495 }
      );
    }

    doc.end();
  });
};
