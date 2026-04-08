const express = require('express');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const prisma = require('../lib/prisma');

const router = express.Router();

// Generate a readable referral code: XXXX-NNNN
function generateCode(name) {
  const prefix = (name || 'USER').replace(/\s+/g, '').slice(0, 4).toUpperCase();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${suffix}`;
}

// GET /api/referrals/my — get or create the caller's referral code + stats
router.get('/my', authenticate, asyncHandler(async (req, res) => {
  let referral = await prisma.referral.findFirst({
    where: { referrerId: req.user.id, referredUserId: null },
    orderBy: { createdAt: 'asc' },
  });

  if (!referral) {
    const code = generateCode(req.user.fullName);
    referral = await prisma.referral.create({
      data: { referrerId: req.user.id, referralCode: code },
    });
  }

  const completedReferrals = await prisma.referral.findMany({
    where: { referrerId: req.user.id, status: 'COMPLETED' },
  });

  const totalEarnings = completedReferrals.reduce(
    (sum, r) => sum + parseFloat(r.bonusAmount),
    0
  );

  res.json({
    referralCode: referral.referralCode,
    friendsReferred: completedReferrals.length,
    totalEarnings,
    bonusPerReferral: 500,
  });
}));

// POST /api/referrals/apply — called during registration to apply a referral code
router.post('/apply', authenticate, asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Referral code required' });

  // Check the code exists and hasn't been used
  const referral = await prisma.referral.findFirst({
    where: { referralCode: code.toUpperCase(), referredUserId: null, status: 'PENDING' },
  });

  if (!referral) return res.status(400).json({ error: 'Invalid or already used referral code' });
  if (referral.referrerId === req.user.id) return res.status(400).json({ error: 'Cannot use your own referral code' });

  // Check user hasn't already been referred
  const alreadyReferred = await prisma.referral.findFirst({ where: { referredUserId: req.user.id } });
  if (alreadyReferred) return res.status(400).json({ error: 'You have already used a referral code' });

  // Complete the referral + award bonuses in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.referral.update({
      where: { id: referral.id },
      data: { referredUserId: req.user.id, status: 'COMPLETED', claimedAt: new Date() },
    });

    // Credit referrer
    const referrerWallet = await tx.wallet.findUnique({ where: { userId: referral.referrerId } });
    if (referrerWallet) {
      const newBal = parseFloat(referrerWallet.balance) + 500;
      await tx.wallet.update({ where: { userId: referral.referrerId }, data: { balance: newBal } });
      await tx.transaction.create({
        data: {
          userId: referral.referrerId,
          type: 'BONUS',
          amount: 500,
          balanceBefore: parseFloat(referrerWallet.balance),
          balanceAfter: newBal,
          status: 'COMPLETED',
          description: `Referral bonus — friend ${req.user.fullName} joined`,
        },
      });
    }

    // Credit new user
    const newUserWallet = await tx.wallet.findUnique({ where: { userId: req.user.id } });
    if (newUserWallet) {
      const newBal = parseFloat(newUserWallet.balance) + 500;
      await tx.wallet.update({ where: { userId: req.user.id }, data: { balance: newBal } });
      await tx.transaction.create({
        data: {
          userId: req.user.id,
          type: 'BONUS',
          amount: 500,
          balanceBefore: parseFloat(newUserWallet.balance),
          balanceAfter: newBal,
          status: 'COMPLETED',
          description: 'Welcome bonus — joined via referral',
        },
      });
    }
  });

  res.json({ success: true, message: '₦500 bonus credited to both you and your referrer!' });
}));

module.exports = router;
