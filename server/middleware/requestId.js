import { randomUUID } from 'crypto';

export const requestIdMiddleware = (req, res, next) => {
  const reqId = req.headers['x-request-id'] || randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
};

export default requestIdMiddleware;
