const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, fullName: true, phone: true, kycStatus: true, role: true }
    });
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Check self-exclusion
    const exclusion = await prisma.selfExclusion.findFirst({
      where: { userId: user.id, isActive: true, endDate: { gt: new Date() } }
    });
    if (exclusion) {
      return res.status(403).json({
        error: 'Account paused',
        message: `Your account is on a self-exclusion break until ${exclusion.endDate.toLocaleDateString()}`,
        endDate: exclusion.endDate
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireKyc = (req, res, next) => {
  if (req.user.kycStatus !== 'APPROVED') {
    return res.status(403).json({ error: 'KYC verification required to perform this action' });
  }
  next();
};

module.exports = { authenticate, requireKyc };
