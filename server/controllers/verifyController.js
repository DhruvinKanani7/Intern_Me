import Certificate from '../models/Certificate.js';
import logger from '../config/logger.js';

export const verifyCertificate = async (req, res, next) => {
  try {
    const rawCode = (req.params.code || req.params.internshipCode || '').trim();

    // 1. Task 5.1: Look up by opaque 128-bit verification_code first
    let certificate = await Certificate.findOne({ verification_code: rawCode });

    // 2. Fallback to internship_code or cert_id for backwards compatibility
    if (!certificate) {
      certificate = await Certificate.findOne({
        $or: [
          { internship_code: rawCode },
          { cert_id: rawCode }
        ]
      });
    }

    // 3. Task 5.3: Miss-monitoring on non-existent code
    if (!certificate) {
      logger.warn(
        {
          ip: req.ip,
          code: rawCode,
          userAgent: req.headers['user-agent'],
          event: 'CERTIFICATE_VERIFY_MISS'
        },
        'Certificate verification miss recorded'
      );

      return res.status(200).json({
        valid: false,
        status: 'not_found',
        message: 'Certificate not found'
      });
    }

    // 4. Handle revoked certificates
    if (certificate.is_revoked) {
      logger.info(
        {
          ip: req.ip,
          code: rawCode,
          certId: certificate.cert_id,
          event: 'CERTIFICATE_VERIFY_REVOKED'
        },
        'Revoked certificate verified'
      );

      return res.status(200).json({
        valid: false,
        status: 'revoked',
        is_revoked: true,
        message: 'This certificate has been revoked',
        certificate: {
          status: 'Revoked',
          program_title: certificate.internship_name,
          internship: certificate.internship_name,
          issue_date: certificate.created_at,
          issuedAt: certificate.created_at,
          verification_code: certificate.verification_code,
          internship_code: certificate.internship_code,
          cert_id: certificate.cert_id
        }
      });
    }

    // 5. Task 5.3: Minimal public response without sensitive student PII
    // Excludes email, user_id, enrollment_id, internal database IDs, and start/end dates
    return res.status(200).json({
      valid: true,
      status: 'valid',
      is_revoked: false,
      certificate: {
        holder_name: certificate.full_name,
        recipient_name: certificate.full_name,
        name: certificate.full_name,
        program_title: certificate.internship_name,
        internship: certificate.internship_name,
        duration: certificate.duration,
        issue_date: certificate.created_at,
        issuedAt: certificate.created_at,
        verification_code: certificate.verification_code,
        internship_code: certificate.internship_code,
        cert_id: certificate.cert_id,
        status: 'Active'
      }
    });
  } catch (err) {
    next(err);
  }
};
