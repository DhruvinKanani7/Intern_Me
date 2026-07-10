import Certificate from '../models/Certificate.js';
import Enrollment from '../models/Enrollment.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const getMyCertificates = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user_id: req.user.id }).select('_id');
    const enrollmentIds = enrollments.map((enrollment) => enrollment._id);
    const certificates = await Certificate.find({ enrollment_id: { $in: enrollmentIds } }).sort({ created_at: -1 });

    return res.json(successResponse({ data: certificates }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const getCertificateByEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({ _id: req.params.enrollmentId, user_id: req.user.id });
    if (!enrollment) return res.status(404).json(errorResponse('Enrollment not found'));

    const certificate = await Certificate.findOne({ enrollment_id: enrollment._id });
    if (!certificate) return res.status(404).json(errorResponse('Certificate not yet issued for this enrollment'));

    return res.json(successResponse({ data: certificate }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const downloadCertificate = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({ user_id: req.user.id, _id: req.params.id });
    const certificate = enrollment
      ? await Certificate.findOne({ enrollment_id: enrollment._id })
      : await Certificate.findOne({ _id: req.params.id });

    if (!certificate) return res.status(404).json(errorResponse('Certificate not found'));

    const ownedEnrollment = await Enrollment.findOne({
      _id: certificate.enrollment_id,
      user_id: req.user.id
    });
    if (!ownedEnrollment) return res.status(403).json(errorResponse('Certificate access denied'));

    return res.json(successResponse({ data: { url: certificate.pdf_url } }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};
