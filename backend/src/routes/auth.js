const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = require('../lib/prisma');

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
router.post('/register',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('phone').matches(/^\+?234\d{10}$|^0\d{10}$/).withMessage('Valid Nigerian phone number required'),
    body('dateOfBirth').isISO8601().withMessage('Valid date of birth required'),
    body('state').notEmpty().withMessage('State is required'),
    body('pin').isLength({ min: 4, max: 4 }).isNumeric().withMessage('PIN must be 4 digits'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { fullName, phone, dateOfBirth, state, pin } = req.body;

    // Age check (must be 18+)
    const dob = new Date(dateOfBirth);
    const age = Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) return res.status(400).json({ error: 'You must be 18 or older to register' });

    // Normalise phone
    const normPhone = phone.startsWith('0') ? `+234${phone.slice(1)}` : phone;

    const existing = await prisma.user.findUnique({ where: { phone: normPhone } });
    if (existing) return res.status(409).json({ error: 'An account with this phone number already exists' });

    const pinHash = await bcrypt.hash(pin, 12);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { fullName, phone: normPhone, dateOfBirth: dob, state, pinHash }
      });
      await tx.wallet.create({ data: { userId: u.id } });
      await tx.bsr.create({ data: { userId: u.id } });
      await tx.kyc.create({ data: { userId: u.id } });
      await tx.spendingLimit.create({ data: { userId: u.id, monthlyLimit: 50000 } });
      return u;
    });

    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, fullName: user.fullName, phone: user.phone, kycStatus: user.kycStatus }
    });
  })
);

// POST /api/auth/login
router.post('/login',
  [
    body('phone').notEmpty().withMessage('Phone number required'),
    body('pin').isLength({ min: 4, max: 4 }).withMessage('PIN required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { phone, pin } = req.body;
    const normPhone = phone.startsWith('0') ? `+234${phone.slice(1)}` : phone;

    const user = await prisma.user.findUnique({ where: { phone: normPhone } });
    if (!user) return res.status(401).json({ error: 'Invalid phone number or PIN' });

    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) return res.status(401).json({ error: 'Invalid phone number or PIN' });

    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, fullName: user.fullName, phone: user.phone, kycStatus: user.kycStatus }
    });
  })
);

// GET /api/auth/me
const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, fullName: true, phone: true, state: true, dateOfBirth: true, kycStatus: true, role: true, createdAt: true }
  });
  res.json({ user });
}));

module.exports = router;
