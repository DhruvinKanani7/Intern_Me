import cloudinary from '../config/cloudinary.js';

/**
 * Generates a short-lived signed download URL for private certificate PDF assets.
 * 
 * @param {Object} certificate - The certificate document
 * @param {number} expiresInSeconds - Lifetime of the signed URL (default: 3600s / 1 hour)
 * @returns {string} Signed download URL or fallback URL
 */
export const generateCertificateDownloadUrl = (certificate, expiresInSeconds = 3600) => {
  if (!certificate) return null;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret && cloudName !== 'mock') {
    const publicId = certificate.cloudinary_public_id || `interncert/certificates/${certificate.cert_id}`;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

    try {
      const signedUrl = cloudinary.utils.private_download_url(publicId, 'pdf', {
        resource_type: 'raw',
        type: 'authenticated',
        expires_at: expiresAt
      });
      if (signedUrl) return signedUrl;
    } catch {
      // Fall through to pdf_url on error
    }
  }

  return certificate.pdf_url;
};

export default {
  generateCertificateDownloadUrl
};
