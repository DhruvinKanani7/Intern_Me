import User from '../models/User.js';
import Internship from '../models/Internship.js';
import Certificate from '../models/Certificate.js';
import Testimonial from '../models/Testimonial.js';
import { successResponse, errorResponse, parsePagination } from '../utils/helpers.js';
import { logAuditEvent } from '../services/auditLogger.js';

export const getPublicStats = async (req, res, next) => {
  try {
    const [totalStudents, totalPrograms, certificatesIssued, ratingAgg] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Internship.countDocuments({ is_active: true }),
      Certificate.countDocuments({ is_revoked: false }),
      Testimonial.aggregate([
        { $match: { is_approved: true } },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ])
    ]);

    const avgRating = ratingAgg.length > 0 && ratingAgg[0].avg
      ? Number(ratingAgg[0].avg.toFixed(1))
      : 4.9;

    return res.json(
      successResponse({
        data: {
          totalStudents,
          totalPrograms,
          certificatesIssued,
          averageRating: avgRating
        }
      })
    );
  } catch (err) {
    next(err);
  }
};

export const getApprovedTestimonials = async (req, res, next) => {
  try {
    const testimonials = await Testimonial.find({ is_approved: true })
      .sort({ created_at: -1 })
      .limit(30);

    return res.json(successResponse({ data: testimonials }));
  } catch (err) {
    next(err);
  }
};

export const getAdminTestimonials = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 20, 100);
    const filter = req.query.is_approved !== undefined
      ? { is_approved: req.query.is_approved === 'true' }
      : {};

    const [testimonials, total] = await Promise.all([
      Testimonial.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 }),
      Testimonial.countDocuments(filter)
    ]);

    return res.json(
      successResponse({
        data: {
          testimonials,
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      })
    );
  } catch (err) {
    next(err);
  }
};

export const createTestimonial = async (req, res, next) => {
  try {
    const { name, role, company, rating, text, avatar, program, is_approved } = req.body;

    if (!name || !role || !text) {
      return res.status(400).json(errorResponse('Name, role, and text are required'));
    }

    // Admins can create pre-approved testimonials; public submissions require approval
    const approved = req.user?.role === 'admin' ? Boolean(is_approved ?? true) : false;

    const testimonial = await Testimonial.create({
      name,
      role,
      company,
      rating: rating ? Number(rating) : 5,
      text,
      avatar,
      program,
      is_approved: approved
    });

    if (req.user?.role === 'admin') {
      await logAuditEvent({
        actorId: req.user.id,
        action: 'testimonial_created',
        targetType: 'Testimonial',
        targetId: testimonial._id,
        req
      });
    }

    return res.status(201).json(
      successResponse(
        { data: testimonial },
        approved ? 'Testimonial created and published' : 'Testimonial submitted for review'
      )
    );
  } catch (err) {
    next(err);
  }
};

export const approveTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
      return res.status(404).json(errorResponse('Testimonial not found'));
    }

    testimonial.is_approved = true;
    await testimonial.save();

    await logAuditEvent({
      actorId: req.user.id,
      action: 'testimonial_approved',
      targetType: 'Testimonial',
      targetId: testimonial._id,
      req
    });

    return res.json(successResponse({ data: testimonial }, 'Testimonial approved successfully'));
  } catch (err) {
    next(err);
  }
};

export const deleteTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
      return res.status(404).json(errorResponse('Testimonial not found'));
    }

    await Testimonial.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      actorId: req.user.id,
      action: 'testimonial_deleted',
      targetType: 'Testimonial',
      targetId: testimonial._id,
      req
    });

    return res.json(successResponse({}, 'Testimonial deleted successfully'));
  } catch (err) {
    next(err);
  }
};

export default {
  getPublicStats,
  getApprovedTestimonials,
  getAdminTestimonials,
  createTestimonial,
  approveTestimonial,
  deleteTestimonial
};
