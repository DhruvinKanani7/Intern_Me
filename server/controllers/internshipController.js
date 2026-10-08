import Internship from '../models/Internship.js';
import {
  escapeRegex,
  parsePagination,
  successResponse,
  errorResponse
} from '../utils/helpers.js';

export const listInternships = async (req, res, next) => {
  try {
    const filter = { is_active: true };

    if (req.query.category && req.query.category !== 'All') {
      const escapedCategory = escapeRegex(req.query.category, 64);
      filter.category_name = { $regex: escapedCategory, $options: 'i' };
    }

    if (req.query.search) {
      const search = escapeRegex(req.query.search, 64);
      filter.$or = [
        { category_code: { $regex: search, $options: 'i' } },
        { category_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const { page, limit, skip } = parsePagination(req.query, 50, 100);

    const [internships, total] = await Promise.all([
      Internship.find(filter)
        .select(
          'category_code category_name icon description price_1m price_3m price_5m total_tasks_1m total_tasks_3m total_tasks_5m'
        )
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1, _id: -1 }),
      Internship.countDocuments(filter)
    ]);

    return res.json(
      successResponse({
        data: internships,
        total,
        page,
        pages: Math.ceil(total / limit)
      })
    );
  } catch (err) {
    next(err);
  }
};

export const getInternshipByCode = async (req, res, next) => {
  try {
    const code = String(req.params.code || '').trim().slice(0, 32).toUpperCase();
    const internship = await Internship.findOne({
      category_code: code,
      is_active: true
    });
    if (!internship) return res.status(404).json(errorResponse('Internship not found'));
    return res.json(successResponse({ data: internship }));
  } catch (err) {
    next(err);
  }
};
