import Certificate from '../models/Certificate.js';
import Enrollment from '../models/Enrollment.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { generateCertificateDownloadUrl } from '../services/certificateService.js';

export const getMyCertificates = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ user_id: req.user.id }).select('_id');
    const enrollmentIds = enrollments.map((enrollment) => enrollment._id);
    const certificates = await Certificate.find({ enrollment_id: { $in: enrollmentIds } }).sort({ created_at: -1 });

    const enrichedCertificates = certificates.map((cert) => {
      const doc = cert.toObject();
      doc.download_url = generateCertificateDownloadUrl(cert);
      return doc;
    });

    return res.json(successResponse({ data: enrichedCertificates }));
  } catch (err) {
    next(err);
  }
};

export const getCertificateByEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({ _id: req.params.enrollmentId, user_id: req.user.id });
    if (!enrollment) return res.status(404).json(errorResponse('Enrollment not found'));

    const certificate = await Certificate.findOne({ enrollment_id: enrollment._id });
    if (!certificate) return res.status(404).json(errorResponse('Certificate not yet issued for this enrollment'));

    const doc = certificate.toObject();
    doc.download_url = generateCertificateDownloadUrl(certificate);

    return res.json(successResponse({ data: doc }));
  } catch (err) {
    next(err);
  }
};

export const downloadCertificate = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({ user_id: req.user.id, _id: req.params.id });
    const certificate = enrollment
      ? await Certificate.findOne({ enrollment_id: enrollment._id })
      : await Certificate.findOne({ _id: req.params.id });

    if (!certificate) return res.status(404).json(errorResponse('Certificate not found'));

    // Allow admin or student who owns the enrollment
    if (req.user.role !== 'admin') {
      const ownedEnrollment = await Enrollment.findOne({
        _id: certificate.enrollment_id,
        user_id: req.user.id
      });
      if (!ownedEnrollment) return res.status(403).json(errorResponse('Certificate access denied'));
    }

    // Task 5.5: Generate short-lived signed download URL
    const signedUrl = generateCertificateDownloadUrl(certificate);

    return res.json(successResponse({ data: { url: signedUrl } }));
  } catch (err) {
    next(err);
  }
};
