import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import logger from './config/logger.js';
import connectDB from './config/db.js';
import requestIdMiddleware from './middleware/requestId.js';
import errorHandler from './middleware/errorHandler.js';
import { originCheck, csrfProtection } from './middleware/csrf.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { metricsMiddleware } from './services/metricsService.js';

import authRoutes from './routes/auth.js';
import internshipRoutes from './routes/internships.js';
import enrollRoutes from './routes/enroll.js';
import taskRoutes from './routes/tasks.js';
import certificateRoutes from './routes/certificates.js';
import verifyRoutes from './routes/verify.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';
import contactRoutes from './routes/contact.js';
import statsRoutes from './routes/stats.js';
import metricsRoutes from './routes/metrics.js';
import seedDefaultTestimonials from './utils/seedTestimonials.js';

const app = express();

// Trust proxy configuration (Documented for ingress/reverse proxies like Render/Cloudflare/Nginx)
const trustProxyValue = isNaN(Number(env.TRUST_PROXY))
  ? env.TRUST_PROXY
  : Number(env.TRUST_PROXY);
app.set('trust proxy', trustProxyValue);

// Security and middleware
app.use(requestIdMiddleware);
app.use(metricsMiddleware);

// Enhanced Security Headers (Task 2.7 / F36)
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://*.razorpay.com'],
        connectSrc: ["'self'", env.FRONTEND_URL, 'https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
        frameSrc: ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
        frameAncestors: ["'none'"]
      }
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);

// Enforce 100kb payload size limit globally and capture raw body for webhook verification (F5, F38)
app.use(
  express.json({
    limit: '100kb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(cookieParser());
app.use(generalLimiter);

// Origin check and CSRF protection (Task 2.4 / F11)
app.use(originCheck);
app.use(csrfProtection);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/enroll', enrollRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api', statsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) =>
  res.json({ success: true, message: 'InternCert API running', request_id: req.id })
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', request_id: req.id });
});

// Centralized error handler (Phase 0.3 / F21)
app.use(errorHandler);

// If not in test mode, connect DB, seed data, and listen
if (env.NODE_ENV !== 'test') {
  connectDB().then(async () => {
    await seedDefaultTestimonials();
    app.listen(env.PORT, () => {
      logger.info(`InternCert server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  });
}

export default app;
