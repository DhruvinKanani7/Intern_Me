import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import logger from './config/logger.js';
import connectDB from './config/db.js';
import requestIdMiddleware from './middleware/requestId.js';
import errorHandler from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/auth.js';
import internshipRoutes from './routes/internships.js';
import enrollRoutes from './routes/enroll.js';
import taskRoutes from './routes/tasks.js';
import certificateRoutes from './routes/certificates.js';
import verifyRoutes from './routes/verify.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';
import contactRoutes from './routes/contact.js';

const app = express();

// Trust proxy configuration (Documented for ingress/reverse proxies like Render/Cloudflare/Nginx)
const trustProxyValue = isNaN(Number(env.TRUST_PROXY))
  ? env.TRUST_PROXY
  : Number(env.TRUST_PROXY);
app.set('trust proxy', trustProxyValue);

// Security and middleware
app.use(requestIdMiddleware);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);
// Enforce 100kb payload size limit globally (Phase 0.4 / F38)
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(generalLimiter);

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

// If not in test mode, connect DB and listen
if (env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(env.PORT, () => {
      logger.info(`InternCert server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  });
}

export default app;
