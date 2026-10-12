import User from '../../models/User.js';
import Internship from '../../models/Internship.js';
import Enrollment from '../../models/Enrollment.js';

export const createTestUser = async (overrides = {}) => {
  const defaults = {
    full_name: 'Test Student',
    college_email: `student_${Date.now()}_${Math.random().toString(36).substring(7)}@college.edu`,
    enrollment_no: `ENR${Date.now()}${Math.floor(Math.random() * 1000)}`,
    password: 'Password123!',
    course: 'Computer Science',
    college_name: 'Engineering Institute',
    year_of_study: 3,
    email_verified: true,
    role: 'student'
  };

  return User.create({ ...defaults, ...overrides });
};

export const createTestAdmin = async (overrides = {}) => {
  return createTestUser({
    full_name: 'Admin User',
    role: 'admin',
    ...overrides
  });
};

export const createTestInternship = async (overrides = {}) => {
  const code = `WD${Math.floor(100 + Math.random() * 900)}`;
  const defaults = {
    category_code: code,
    category_name: 'Web Development',
    description: 'Full stack web development internship with real-world projects.',
    icon: '💻',
    price_1m: 999,
    price_3m: 1999,
    price_5m: 2999,
    total_tasks_1m: 4,
    total_tasks_3m: 8,
    total_tasks_5m: 14,
    is_active: true,
    syllabus: {
      '1m': [
        {
          task_number: 1,
          title: 'Build Portfolio',
          description: 'Create responsive portfolio website',
          instructions: 'Use HTML/CSS/JS and deploy to GitHub pages',
          resources: ['https://developer.mozilla.org'],
          deadline_days: 7
        }
      ],
      '3m': [],
      '5m': []
    }
  };

  return Internship.create({ ...defaults, ...overrides });
};

export const createTestEnrollment = async (user, internship, overrides = {}) => {
  const code = `IC-${internship.category_code}-${Math.floor(10000 + Math.random() * 90000)}`;
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const defaults = {
    user_id: user._id,
    internship_id: internship._id,
    duration_months: 1,
    amount_paid: internship.price_1m,
    status: 'active',
    internship_code: code,
    start_date: now,
    end_date: endDate,
    current_task: 1,
    total_tasks: internship.total_tasks_1m
  };

  return Enrollment.create({ ...defaults, ...overrides });
};
