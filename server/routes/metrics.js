import express from 'express';
import { metricsService } from '../services/metricsService.js';

const router = express.Router();

router.get('/', (req, res) => {
  // Check optional internal token or admin session if configured in production
  const metricsToken = process.env.METRICS_TOKEN;
  if (metricsToken && req.headers['x-metrics-token'] !== metricsToken && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Valid metrics authorization required' });
  }

  const acceptHeader = req.headers.accept || '';
  if (acceptHeader.includes('text/plain')) {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    return res.send(metricsService.getPrometheusFormat());
  }

  res.json(metricsService.getSnapshot());
});

export default router;
