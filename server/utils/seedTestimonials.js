import Testimonial from '../models/Testimonial.js';
import logger from '../config/logger.js';

export const INITIAL_TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Frontend Developer at TCS',
    rating: 5,
    text: 'The QR-verified certificate impressed every single interviewer. InternMe gave me real project experience that no bootcamp could match.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&auto=format',
    program: 'Full Stack Web Development',
    is_approved: true
  },
  {
    name: 'Arjun Mehta',
    role: 'Data Analyst at Flipkart',
    rating: 5,
    text: 'Incredibly comprehensive Data Science program. The hands-on ML projects and verified certificate opened doors I never expected fresh out of college.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format',
    program: 'Data Science & ML',
    is_approved: true
  },
  {
    name: 'Sneha Patel',
    role: 'UI/UX Designer at Infosys',
    rating: 5,
    text: 'Built a complete design portfolio in 2 months. My Figma projects from this internship landed me my dream job right after graduation.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format',
    program: 'UI/UX Design & Prototyping',
    is_approved: true
  },
  {
    name: 'Rahul Gupta',
    role: 'Growth Manager at Razorpay',
    rating: 5,
    text: 'Real campaign experience with actual budgets and analytics data. The verified certificate and project portfolio were huge differentiators throughout my entire job search.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format',
    program: 'Digital Marketing & Growth',
    is_approved: true
  }
];

export const seedDefaultTestimonials = async () => {
  try {
    const count = await Testimonial.countDocuments();
    if (count === 0) {
      await Testimonial.insertMany(INITIAL_TESTIMONIALS);
      logger.info('Default approved testimonials seeded successfully');
    }
  } catch (err) {
    logger.warn({ err }, 'Error during default testimonials seeding');
  }
};

export default seedDefaultTestimonials;
