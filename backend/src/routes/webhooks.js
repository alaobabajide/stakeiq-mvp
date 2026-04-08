/**
 * Webhook handlers for OPay and PalmPay payment notifications
 *
 * Register these URLs in your merchant dashboards:
 *   OPay callback URL:    https://your-domain.com/api/webhooks/opay
 *   PalmPay callback URL: https://your-domain.com/api/webhooks/palmpay
 *
 * For local dev, use ngrok: npx ngrok http 3001
 */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const opay = require('../services/opay');
const palmpay = require('../services/palmpay');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

// ─── Shared: Credit wallet after confirmed deposit ────────────────────────────
async function creditWallet(tx, userId, amount, reference, provider) {
  const wallet = await tx.wallet.update({
    where: { userId },
    data: {
      balance: { increment: amount },
      totalDeposited: { increment: amount },
    },
  });

  await tx.transaction.create({
    data: {
      userId,
      type: 'DEPOSIT',
      amount,
      balanceBefore: parseFloat(wallet.balance) - amount,
      balanceAfter: parseFloat(wallet.balance),
      status: 'COMPLETED',
      reference,
      description: `${provider} deposit confirmed`,
      metadata: { provider, reference },
    },
  });
}

// ─── OPay Webhook ────────────────────────────────────────────────────────────
// POST /api/webhooks/opay
router.post('/opay',
  express.raw({ type: 'application/json' }),  // raw body for signature verification
  asyncHandler(async (req, res) => {
    const rawBody = req.body.toString();
    const authHeader = req.headers['authorization'];

    // Verify signature if private key is set
    if (process.env.OPAY_PRIVATE_KEY && !opay.verifyWebhook(rawBody, authHeader)) {
      console.warn('[OPay Webhook] Invalid signature — rejected');
      return res.status(401).json({ code: 'INVALID_SIGNATURE' });
    }

    let payload;
    try { payload = JSON.parse(rawBody); } catch {
      return res.status(400).json({ code: 'INVALID_JSON' });
    }

    console.log('[OPay Webhook]', JSON.stringify(payload));

    const { reference, status, amount } = payload;

    // Only process successful payments
    if (status !== 'SUCCESS') {
      return res.json({ code: '00000', message: 'Noted' });
    }

    // Find pending deposit record by reference
    const existing = await prisma.transaction.findFirst({
      where: { reference, type: 'DEPOSIT' },
    });
    if (existing?.status === 'COMPLETED') {
      return res.json({ code: '00000', message: 'Already processed' });
    }

    // Find user from reference (reference format: DEP-{userId}-{timestamp})
    const userId = reference.split('-')[1];
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ code: 'USER_NOT_FOUND' });

    const depositAmount = parseFloat(amount?.total || amount) / 100; // convert kobo if needed

    await prisma.$transaction((tx) => creditWallet(tx, userId, depositAmount, reference, 'OPay'));

    // OPay expects this exact response to acknowledge receipt
    res.json({ code: '00000', message: 'Success' });
  })
);

// ─── PalmPay Webhook ─────────────────────────────────────────────────────────
// POST /api/webhooks/palmpay
router.post('/palmpay',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const rawBody = req.body.toString();
    const signature = req.headers['sign'] || req.headers['signature'];

    // Verify signature if PalmPay public key is set
    if (process.env.PALMPAY_PUBLIC_KEY && !palmpay.verifyWebhook(rawBody, signature)) {
      console.warn('[PalmPay Webhook] Invalid signature — rejected');
      return res.status(401).json({ respCode: 'INVALID_SIGNATURE' });
    }

    let payload;
    try { payload = JSON.parse(rawBody); } catch {
      return res.status(400).json({ respCode: 'INVALID_JSON' });
    }

    console.log('[PalmPay Webhook]', JSON.stringify(payload));

    const { merchantOrderNo, orderStatus, orderAmount } = payload;

    // Only process paid orders
    if (orderStatus !== 'SUCCESS' && orderStatus !== 'PAID') {
      return res.json({ respCode: '00000000', respMsg: 'Noted' });
    }

    const existing = await prisma.transaction.findFirst({
      where: { reference: merchantOrderNo, type: 'DEPOSIT' },
    });
    if (existing?.status === 'COMPLETED') {
      return res.json({ respCode: '00000000', respMsg: 'Already processed' });
    }

    const userId = merchantOrderNo.split('-')[1];
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ respCode: 'USER_NOT_FOUND' });

    // PalmPay sends amount in kobo
    const depositAmount = parseFloat(orderAmount) / 100;

    await prisma.$transaction((tx) => creditWallet(tx, userId, depositAmount, merchantOrderNo, 'PalmPay'));

    // PalmPay expects this exact response
    res.json({ respCode: '00000000', respMsg: 'Success' });
  })
);

module.exports = router;
