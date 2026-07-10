import Internship from '../models/Internship.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const listInternships = async (req, res) => {
  try {
    const filter = { is_active: true };
    if (req.query.category && req.query.category !== 'All') {
      filter.category_name = { $regex: req.query.category, $options: 'i' };
    }
    if (req.query.search) {
      const search = req.query.search.trim();
      filter.$or = [
        { category_code: { $regex: search, $options: 'i' } },
        { category_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const internships = await Internship.find(filter).select(
      'category_code category_name icon description price_1m price_3m price_5m'
    );
    return res.json(successResponse({ data: internships }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const getInternshipByCode = async (req, res) => {
  try {
    const internship = await Internship.findOne({
      category_code: req.params.code.toUpperCase(),
      is_active: true
    });
    if (!internship) return res.status(404).json(errorResponse('Internship not found'));
    return res.json(successResponse({ data: internship }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};
