const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err.code || '', err.message, err.stack?.split('\n')[1] || '');

  // Prisma known errors
  if (err.code === 'P2002') return res.status(409).json({ error: 'A record with this value already exists' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
  if (err.code === 'P1001' || err.code === 'P1003') {
    return res.status(503).json({ error: 'Database unavailable. Check DATABASE_URL environment variable.' });
  }

  // Prisma connection/env errors
  if (err.message?.includes('DATABASE_URL') || err.message?.includes('datasource')) {
    return res.status(503).json({ error: 'Database not configured. Set DATABASE_URL in Railway Variables.' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
  if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });

  // Validation errors
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });

  const status = err.status || err.statusCode || 500;
  // In production hide internal details; in dev show the real message
  const message = status < 500
    ? err.message
    : process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

  res.status(status).json({ error: message });
};

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };
