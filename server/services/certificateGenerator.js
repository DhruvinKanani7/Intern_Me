
import cloudinary from '../config/cloudinary.js';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import Certificate from '../models/Certificate.js';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import Internship from '../models/Internship.js';
import { sendCertificateEmail } from './email.js';

const uploadPdfToCloudinary = (buffer, certId) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: 'interncert/certificates',
        public_id: certId,
        format: 'pdf',
        overwrite: false
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });

const generateCertId = () => {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `CERT-${Date.now().toString(36).toUpperCase()}-${random}`;
};

// Generates a landscape A4 PDF certificate, saves it, creates a Certificate
// document, and emails it to the student. Called when the final task of an
// enrollment is approved.
const generate = async (enrollmentId) => {
  

  const enrollment = await Enrollment.findById(enrollmentId).populate('internship_id');
  if (!enrollment) throw new Error('Enrollment not found for certificate generation');

  const user = await User.findById(enrollment.user_id);
  const internship = enrollment.internship_id instanceof Internship
    ? enrollment.internship_id
    : await Internship.findById(enrollment.internship_id);

  const certId = generateCertId();
  const verifyUrl = `${process.env.FRONTEND_URL}/verify/${enrollment.internship_code}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  const qrBuffer = Buffer.from(qrBase64, 'base64');




  const pdfBuffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [842, 595], layout: 'landscape', margin: 0 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Outer border
    doc.lineWidth(3).strokeColor('#1a1a2e').rect(20, 20, 842 - 40, 595 - 40).stroke();
    // Inner border
    doc.lineWidth(1).strokeColor('#c9a227').rect(25, 25, 842 - 50, 595 - 50).stroke();

    doc.fillColor('#1a1a2e').fontSize(24).font('Helvetica-Bold')
      .text('INTERNCERT', 0, 55, { align: 'center' });

    doc.fontSize(28).text('CERTIFICATE OF COMPLETION', 0, 100, { align: 'center' });
    doc.moveTo(321, 138).lineTo(521, 138).lineWidth(2).strokeColor('#c9a227').stroke();

    doc.font('Helvetica').fontSize(14).fillColor('#666666')
      .text('This is to certify that', 0, 165, { align: 'center' });

    doc.font('Helvetica-Bold').fontSize(26).fillColor('#1a1a2e')
      .text(user.full_name.toUpperCase(), 0, 195, { align: 'center' });
    doc.moveTo(321, 232).lineTo(521, 232).lineWidth(2).strokeColor('#c9a227').stroke();

    doc.font('Helvetica').fontSize(14).fillColor('#666666')
      .text('has successfully completed the', 0, 250, { align: 'center' });

    doc.font('Helvetica-Bold').fontSize(20).fillColor('#c9a227')
      .text(`${internship.category_name} Internship`, 0, 275, { align: 'center' });

    doc.font('Helvetica').fontSize(14).fillColor('#666666')
      .text(`(${enrollment.duration_months} Month${enrollment.duration_months > 1 ? 's' : ''})`, 0, 302, { align: 'center' });

    doc.fontSize(12).fillColor('#666666')
      .text(
        `From: ${enrollment.start_date.toDateString()}    To: ${enrollment.end_date.toDateString()}`,
        0, 325, { align: 'center' }
      );

    doc.fontSize(11).fillColor('#999999')
      .text(
        `Internship Code: ${enrollment.internship_code}   |   Certificate ID: ${certId}`,
        0, 348, { align: 'center' }
      );

    // QR code
    doc.image(qrBuffer, 842 - 150, 595 - 150, { width: 80, height: 80 });
    doc.fontSize(8).fillColor('#999999').text('Scan to verify', 842 - 150, 595 - 65, { width: 80, align: 'center' });

    // Signatures
    doc.moveTo(100, 500).lineTo(260, 500).strokeColor('#333333').lineWidth(1).stroke();
    doc.fontSize(11).fillColor('#333333').text('Director', 100, 505, { width: 160, align: 'center' });

    doc.moveTo(582, 500).lineTo(742, 500).strokeColor('#333333').lineWidth(1).stroke();
    doc.fontSize(11).fillColor('#333333').text('CEO & Founder', 582, 505, { width: 160, align: 'center' });

    doc.fontSize(10).fillColor('#666666')
      .text(`Date of Issue: ${new Date().toDateString()}`, 0, 545, { align: 'center' });

    doc.end();
  });

  const uploadResult = await uploadPdfToCloudinary(pdfBuffer, certId);
  const pdfUrlPublic = uploadResult.secure_url;

  const certificate = await Certificate.create({
    enrollment_id: enrollment._id,
    cert_id: certId,
    internship_code: enrollment.internship_code,
    full_name: user.full_name,
    internship_name: internship.category_name,
    duration: `${enrollment.duration_months} Month${enrollment.duration_months > 1 ? 's' : ''}`,
    start_date: enrollment.start_date,
    end_date: enrollment.end_date,
    qr_code_url: verifyUrl,
    pdf_url: pdfUrlPublic
  });

  await sendCertificateEmail(user.college_email, {
    name: user.full_name,
    certId,
    internshipName: internship.category_name,
    pdfUrl: pdfUrlPublic,
    verifyUrl
  });

  return certificate;
};

export default { generate };
