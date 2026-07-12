import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
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





connectDB();

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(generalLimiter);




app.use('/api/auth', authRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/enroll', enrollRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contact', contactRoutes);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'InternCert API running' }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`InternCert server running on port ${PORT}`));
