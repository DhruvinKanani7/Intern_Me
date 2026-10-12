import logger from '../config/logger.js';

// In-memory operational metrics collector (Task 8.5)
class MetricsService {
  constructor() {
    this.startTime = Date.now();
    this.counters = {
      httpRequestsTotal: 0,
      http2xxTotal: 0,
      http3xxTotal: 0,
      http4xxTotal: 0,
      http5xxTotal: 0,
      paymentAttempts: 0,
      paymentSuccesses: 0,
      paymentFailures: 0,
      paymentReplaysBlocked: 0,
      paymentRefunds: 0,
      webhookEventsTotal: 0,
      webhookFailures: 0,
      certificateVerificationsTotal: 0,
      certificateVerificationHits: 0,
      certificateVerificationMisses: 0,
      certificateRevokedLookups: 0,
      rateLimitsTripped: 0,
      adminMfaFailures: 0,
      csrfBlocks: 0,
    };
    this.routeCounters = new Map();
  }

  recordHttpRequest(method, route, statusCode, durationMs) {
    this.counters.httpRequestsTotal += 1;
    if (statusCode >= 200 && statusCode < 300) this.counters.http2xxTotal += 1;
    else if (statusCode >= 300 && statusCode < 400) this.counters.http3xxTotal += 1;
    else if (statusCode >= 400 && statusCode < 500) this.counters.http4xxTotal += 1;
    else if (statusCode >= 500) this.counters.http5xxTotal += 1;

    const routeKey = `${method} ${route}`;
    const current = this.routeCounters.get(routeKey) || { count: 0, totalDuration: 0, errors: 0 };
    current.count += 1;
    current.totalDuration += durationMs;
    if (statusCode >= 400) current.errors += 1;
    this.routeCounters.set(routeKey, current);
  }

  recordPaymentAttempt() {
    this.counters.paymentAttempts += 1;
  }

  recordPaymentSuccess() {
    this.counters.paymentSuccesses += 1;
  }

  recordPaymentFailure(reason) {
    this.counters.paymentFailures += 1;
    logger.warn({ event: 'METRICS_PAYMENT_FAILURE', reason }, 'Payment failure recorded in metrics');
  }

  recordPaymentReplayBlocked() {
    this.counters.paymentReplaysBlocked += 1;
  }

  recordPaymentRefund() {
    this.counters.paymentRefunds += 1;
  }

  recordWebhookReceived() {
    this.counters.webhookEventsTotal += 1;
  }

  recordWebhookFailure(reason) {
    this.counters.webhookFailures += 1;
    logger.warn({ event: 'METRICS_WEBHOOK_FAILURE', reason }, 'Webhook failure recorded in metrics');
  }

  recordCertVerification(outcome) {
    this.counters.certificateVerificationsTotal += 1;
    if (outcome === 'hit') this.counters.certificateVerificationHits += 1;
    else if (outcome === 'miss') this.counters.certificateVerificationMisses += 1;
    else if (outcome === 'revoked') this.counters.certificateRevokedLookups += 1;
  }

  recordRateLimitTripped() {
    this.counters.rateLimitsTripped += 1;
  }

  recordAdminMfaFailure() {
    this.counters.adminMfaFailures += 1;
  }

  recordCsrfBlock() {
    this.counters.csrfBlocks += 1;
  }

  getSnapshot() {
    const memory = process.memoryUsage();
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);

    const routes = {};
    for (const [key, value] of this.routeCounters.entries()) {
      routes[key] = {
        requests: value.count,
        avgLatencyMs: value.count > 0 ? Math.round(value.totalDuration / value.count) : 0,
        errors: value.errors,
      };
    }

    return {
      status: 'healthy',
      uptimeSeconds: uptimeSec,
      timestamp: new Date().toISOString(),
      process: {
        nodeVersion: process.version,
        pid: process.pid,
        memoryRssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
      },
      counters: { ...this.counters },
      routes,
    };
  }

  getPrometheusFormat() {
    const s = this.getSnapshot();
    const lines = [
      '# HELP http_requests_total Total HTTP requests',
      '# TYPE http_requests_total counter',
      `http_requests_total ${s.counters.httpRequestsTotal}`,
      `http_requests_2xx ${s.counters.http2xxTotal}`,
      `http_requests_4xx ${s.counters.http4xxTotal}`,
      `http_requests_5xx ${s.counters.http5xxTotal}`,
      '# HELP payment_attempts_total Total payment attempts',
      '# TYPE payment_attempts_total counter',
      `payment_attempts_total ${s.counters.paymentAttempts}`,
      `payment_successes_total ${s.counters.paymentSuccesses}`,
      `payment_failures_total ${s.counters.paymentFailures}`,
      `payment_refunds_total ${s.counters.paymentRefunds}`,
      '# HELP webhook_events_total Webhook processed and failed',
      `webhook_events_total ${s.counters.webhookEventsTotal}`,
      `webhook_failures_total ${s.counters.webhookFailures}`,
      '# HELP process_uptime_seconds Process uptime in seconds',
      `process_uptime_seconds ${s.uptimeSeconds}`,
      '# HELP process_heap_used_mb Heap memory used in MB',
      `process_heap_used_mb ${s.process.heapUsedMb}`,
    ];
    return lines.join('\n') + '\n';
  }
}

export const metricsService = new MetricsService();

export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Normalize path to prevent high-cardinality explosions
    const matchedRoute = req.baseUrl ? `${req.baseUrl}${req.route?.path || ''}` : req.path;
    metricsService.recordHttpRequest(req.method, matchedRoute, res.statusCode, duration);
  });
  next();
}
