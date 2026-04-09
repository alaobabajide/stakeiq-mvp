const express = require('express');
const { authenticate, requireKyc } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const vtpass = require('../services/vtpass');
const prisma = require('../lib/prisma');

const router = express.Router();

// ── Helper: credit cashback + award BSR points ────────────────────────────────
async function creditCashback(tx, userId, cashback, bsrPoints) {
  if (cashback <= 0 && bsrPoints <= 0) return;

  if (cashback > 0) {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (wallet) {
      const newBal = parseFloat(wallet.balance) + cashback;
      await tx.wallet.update({ where: { userId }, data: { balance: newBal } });
      await tx.transaction.create({
        data: {
          userId,
          type: 'BONUS',
          amount: cashback,
          balanceBefore: parseFloat(wallet.balance),
          balanceAfter: newBal,
          status: 'COMPLETED',
          description: `Bill payment cashback`,
        },
      });
    }
  }

  if (bsrPoints > 0) {
    await tx.bsr.updateMany({
      where: { userId },
      data: { score: { increment: bsrPoints } },
    });
  }
}

// ── Helper: debit wallet ──────────────────────────────────────────────────────
async function debitWallet(tx, userId, amount, description) {
  const wallet = await tx.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error('Wallet not found');
  if (parseFloat(wallet.balance) < amount) throw new Error('Insufficient balance');

  const newBal = parseFloat(wallet.balance) - amount;
  await tx.wallet.update({ where: { userId }, data: { balance: newBal, totalStaked: { increment: amount } } });
  await tx.transaction.create({
    data: {
      userId,
      type: 'STAKE',
      amount,
      balanceBefore: parseFloat(wallet.balance),
      balanceAfter: newBal,
      status: 'COMPLETED',
      description,
    },
  });
  return newBal;
}

// ── GET /api/bills/history ────────────────────────────────────────────────────
router.get('/history', authenticate, asyncHandler(async (req, res) => {
  const { page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [bills, total] = await Promise.all([
    prisma.billPayment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.billPayment.count({ where: { userId: req.user.id } }),
  ]);
  res.json({ bills, pagination: { page: parseInt(page), total } });
}));

// ── GET /api/bills/cashback-summary ──────────────────────────────────────────
router.get('/cashback-summary', authenticate, asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const bills = await prisma.billPayment.findMany({
    where: { userId: req.user.id, status: 'COMPLETED', createdAt: { gte: startOfMonth } },
  });

  const totalCashback = bills.reduce((s, b) => s + parseFloat(b.cashback), 0);
  const totalBsrPoints = bills.reduce((s, b) => s + b.bsrPoints, 0);
  const paymentCount = bills.length;

  res.json({ totalCashback, totalBsrPoints, paymentCount });
}));

// ── POST /api/bills/airtime ───────────────────────────────────────────────────
router.post('/airtime', authenticate, requireKyc, asyncHandler(async (req, res) => {
  const { network, phone, amount } = req.body;
  if (!network || !phone || !amount) return res.status(400).json({ error: 'network, phone, and amount are required' });
  if (amount < 50) return res.status(400).json({ error: 'Minimum airtime amount is ₦50' });

  const cashback = vtpass.calcCashback('AIRTIME', amount);
  const bsrPoints = vtpass.calcBsrPoints(amount);

  let bill;
  await prisma.$transaction(async (tx) => {
    await debitWallet(tx, req.user.id, amount, `${network.toUpperCase()} Airtime — ${phone}`);

    bill = await tx.billPayment.create({
      data: {
        userId: req.user.id,
        category: 'AIRTIME',
        provider: network.toUpperCase(),
        accountNumber: phone,
        amount,
        cashback,
        bsrPoints,
        status: 'PENDING',
      },
    });
  });

  // Call VTPass (or mock)
  let vtRes;
  try {
    vtRes = await vtpass.buyAirtime({ network, phone, amount });
    const success = vtRes.code === '000';

    await prisma.$transaction(async (tx) => {
      await tx.billPayment.update({
        where: { id: bill.id },
        data: { status: success ? 'COMPLETED' : 'FAILED', metadata: vtRes },
      });
      if (success) await creditCashback(tx, req.user.id, cashback, bsrPoints);
      if (!success) {
        // Refund
        const wallet = await tx.wallet.findUnique({ where: { userId: req.user.id } });
        await tx.wallet.update({ where: { userId: req.user.id }, data: { balance: { increment: amount } } });
        await tx.transaction.create({
          data: {
            userId: req.user.id,
            type: 'REFUND',
            amount,
            balanceBefore: parseFloat(wallet.balance),
            balanceAfter: parseFloat(wallet.balance) + amount,
            status: 'COMPLETED',
            description: 'Airtime purchase failed — refunded',
          },
        });
      }
    });

    res.json({
      success,
      message: success ? `✅ ₦${amount} ${network.toUpperCase()} airtime sent to ${phone}` : 'Airtime purchase failed',
      cashback: success ? cashback : 0,
      bsrPoints: success ? bsrPoints : 0,
      reference: bill.reference,
    });
  } catch (err) {
    console.error('[Bills] airtime error:', err.message);
    // Refund on exception
    await prisma.wallet.update({ where: { userId: req.user.id }, data: { balance: { increment: amount } } });
    await prisma.billPayment.update({ where: { id: bill.id }, data: { status: 'FAILED' } });
    res.status(500).json({ error: 'Airtime purchase failed. Amount refunded.' });
  }
}));

// ── POST /api/bills/electricity ───────────────────────────────────────────────
router.post('/electricity', authenticate, requireKyc, asyncHandler(async (req, res) => {
  const { disco, meterNumber, meterType = 'prepaid', amount, phone } = req.body;
  if (!disco || !meterNumber || !amount) return res.status(400).json({ error: 'disco, meterNumber, and amount are required' });
  if (amount < 1000) return res.status(400).json({ error: 'Minimum electricity payment is ₦1,000' });

  const cashback = vtpass.calcCashback('ELECTRICITY', amount);
  const bsrPoints = vtpass.calcBsrPoints(amount);

  let bill;
  await prisma.$transaction(async (tx) => {
    await debitWallet(tx, req.user.id, amount, `${disco.toUpperCase()} Electricity — Meter ${meterNumber}`);
    bill = await tx.billPayment.create({
      data: {
        userId: req.user.id,
        category: 'ELECTRICITY',
        provider: disco.toUpperCase(),
        accountNumber: meterNumber,
        amount,
        cashback,
        bsrPoints,
        status: 'PENDING',
      },
    });
  });

  try {
    const vtRes = await vtpass.payElectricity({ disco, meterNumber, meterType, amount, phone });
    const success = vtRes.code === '000';
    const token = vtRes.purchased_code || vtRes.token || null;

    await prisma.$transaction(async (tx) => {
      await tx.billPayment.update({
        where: { id: bill.id },
        data: { status: success ? 'COMPLETED' : 'FAILED', token, metadata: vtRes },
      });
      if (success) await creditCashback(tx, req.user.id, cashback, bsrPoints);
      if (!success) {
        await tx.wallet.update({ where: { userId: req.user.id }, data: { balance: { increment: amount } } });
      }
    });

    res.json({
      success,
      message: success ? `✅ ₦${amount} electricity purchased. Token: ${token}` : 'Electricity payment failed',
      token,
      cashback: success ? cashback : 0,
      bsrPoints: success ? bsrPoints : 0,
      reference: bill.reference,
    });
  } catch (err) {
    console.error('[Bills] electricity error:', err.message);
    await prisma.wallet.update({ where: { userId: req.user.id }, data: { balance: { increment: amount } } });
    await prisma.billPayment.update({ where: { id: bill.id }, data: { status: 'FAILED' } });
    res.status(500).json({ error: 'Electricity payment failed. Amount refunded.' });
  }
}));

// ── POST /api/bills/cable ─────────────────────────────────────────────────────
router.post('/cable', authenticate, requireKyc, asyncHandler(async (req, res) => {
  const { provider, smartcard, variationCode, amount, phone } = req.body;
  if (!provider || !smartcard || !variationCode) return res.status(400).json({ error: 'provider, smartcard, and variationCode are required' });

  const cashback = vtpass.calcCashback('CABLE_TV', amount || 0);
  const bsrPoints = vtpass.calcBsrPoints(amount || 0);

  let bill;
  await prisma.$transaction(async (tx) => {
    await debitWallet(tx, req.user.id, amount, `${provider.toUpperCase()} ${variationCode} — ${smartcard}`);
    bill = await tx.billPayment.create({
      data: {
        userId: req.user.id,
        category: 'CABLE_TV',
        provider: provider.toUpperCase(),
        accountNumber: smartcard,
        amount,
        cashback,
        bsrPoints,
        status: 'PENDING',
        metadata: { variationCode },
      },
    });
  });

  try {
    const vtRes = await vtpass.payCable({ provider, smartcard, variationCode, phone });
    const success = vtRes.code === '000';

    await prisma.$transaction(async (tx) => {
      await tx.billPayment.update({ where: { id: bill.id }, data: { status: success ? 'COMPLETED' : 'FAILED', metadata: vtRes } });
      if (success) await creditCashback(tx, req.user.id, cashback, bsrPoints);
      if (!success) await tx.wallet.update({ where: { userId: req.user.id }, data: { balance: { increment: amount } } });
    });

    res.json({
      success,
      message: success ? `✅ ${provider.toUpperCase()} ${variationCode} subscription renewed` : 'Cable TV payment failed',
      cashback: success ? cashback : 0,
      bsrPoints: success ? bsrPoints : 0,
      reference: bill.reference,
    });
  } catch (err) {
    console.error('[Bills] cable error:', err.message);
    await prisma.wallet.update({ where: { userId: req.user.id }, data: { balance: { increment: amount } } });
    await prisma.billPayment.update({ where: { id: bill.id }, data: { status: 'FAILED' } });
    res.status(500).json({ error: 'Cable TV payment failed. Amount refunded.' });
  }
}));

// ── POST /api/bills/verify-meter ──────────────────────────────────────────────
router.post('/verify-meter', authenticate, asyncHandler(async (req, res) => {
  const { disco, meterNumber } = req.body;
  if (!disco || !meterNumber) return res.status(400).json({ error: 'disco and meterNumber required' });
  const serviceId = vtpass.SERVICE_IDS[disco.toUpperCase()] || disco;
  const result = await vtpass.verifyAccount(serviceId, meterNumber);
  const customer = result?.content?.Customer || {};
  res.json({
    name: customer.Customer_Name || 'Verified Customer',
    address: customer.Address || '',
    verified: result?.code === '000',
  });
}));

module.exports = router;
