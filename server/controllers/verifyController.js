import Certificate from '../models/Certificate.js';

export const verifyCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ internship_code: req.params.internshipCode });

    if (!certificate) {
      return res.json({ valid: false, message: 'Certificate not found' });
    }
    if (certificate.is_revoked) {
      return res.json({ valid: false, message: 'This certificate has been revoked' });
    }

    return res.json({
      valid: true,
      certificate: {
        certId: certificate.cert_id,
        internshipCode: certificate.internship_code,
        name: certificate.full_name,
        internship: certificate.internship_name,
        duration: certificate.duration,
        startDate: certificate.start_date,
        endDate: certificate.end_date,
        issuedAt: certificate.created_at
      }
    });
  } catch (err) {
    return res.status(500).json({ valid: false, message: err.message });
  }
};
