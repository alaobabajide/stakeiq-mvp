/**
 * OPay Business API Integration
 * Docs: https://documentation.opaybusiness.com
 *
 * Credentials needed (from your OPay Business dashboard):
 *   OPAY_MERCHANT_ID   — your merchant ID
 *   OPAY_PUBLIC_KEY    — public key
 *   OPAY_PRIVATE_KEY   — private key (used to sign requests)
 *   OPAY_BASE_URL      — sandbox: https://sandboxapi.opaycheckout.com
 *                        production: https://oapi.opay.africa
 */
const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = process.env.OPAY_BASE_URL || 'https://sandboxapi.opaycheckout.com';
const MERCHANT_ID = process.env.OPAY_MERCHANT_ID || '';
const PUBLIC_KEY = process.env.OPAY_PUBLIC_KEY || '';
const PRIVATE_KEY = process.env.OPAY_PRIVATE_KEY || '';

const isSandbox = !process.env.OPAY_BASE_URL || BASE_URL.includes('sandbox');

/**
 * OPay signs requests by:
 * 1. JSON-encoding the request body
 * 2. HMAC-SHA512 with the private key
 * 3. Base64-encoding the result
 * 4. Sending as Authorization: Bearer {signature}
 */
function signRequest(body) {
  const bodyStr = JSON.stringify(body);
  const hmac = crypto.createHmac('sha512', PRIVATE_KEY);
  hmac.update(bodyStr);
  return hmac.digest('base64');
}

function opayHeaders(body) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${signRequest(body)}`,
    'MerchantId': MERCHANT_ID,
  };
}

function isConfigured() {
  return !!(MERCHANT_ID && PUBLIC_KEY && PRIVATE_KEY);
}

/**
 * Initiate a deposit — creates an OPay Cashier checkout URL
 * User is redirected to complete payment on OPay's page
 *
 * @param {object} params
 * @param {string} params.reference      - unique transaction reference
 * @param {number} params.amount         - amount in NGN (kobo not needed, OPay uses NGN directly)
 * @param {string} params.userPhone      - user's phone number
 * @param {string} params.userName       - user's full name
 * @param {string} params.callbackUrl    - webhook URL OPay calls on payment completion
 * @param {string} params.returnUrl      - where to redirect user after payment
 * @returns {{ cashierUrl: string, reference: string }}
 */
async function initiateDeposit({ reference, amount, userPhone, userName, callbackUrl, returnUrl }) {
  if (!isConfigured()) {
    throw new Error('OPay credentials not configured. Add OPAY_MERCHANT_ID, OPAY_PUBLIC_KEY, OPAY_PRIVATE_KEY to .env');
  }

  const body = {
    merchantId: MERCHANT_ID,
    reference,
    amount: {
      total: amount.toFixed(2),
      currency: 'NGN',
    },
    returnUrl,
    callbackUrl,
    cancelUrl: returnUrl,
    expireAt: 30, // minutes
    userInfo: {
      userId: reference,
      userPhone,
      userName,
    },
    product: {
      name: 'StakeIQ Wallet Deposit',
      description: `Deposit ₦${amount} to StakeIQ wallet`,
    },
  };

  const response = await axios.post(
    `${BASE_URL}/api/v1/international/cashier/create`,
    body,
    { headers: opayHeaders(body), timeout: 15000 }
  );

  if (response.data?.code !== '00000') {
    throw new Error(`OPay error: ${response.data?.message || 'Payment initiation failed'}`);
  }

  return {
    cashierUrl: response.data.data?.cashierUrl,
    reference,
    orderId: response.data.data?.orderId,
  };
}

/**
 * Query the status of a payment by reference
 * Use this in your webhook and to poll for status
 */
async function queryPayment(reference) {
  if (!isConfigured()) throw new Error('OPay not configured');

  const body = { merchantId: MERCHANT_ID, reference };

  const response = await axios.post(
    `${BASE_URL}/api/v1/international/payment/query`,
    body,
    { headers: opayHeaders(body), timeout: 15000 }
  );

  return response.data;
}

/**
 * Payout — send money to an OPay wallet (withdrawal)
 *
 * @param {object} params
 * @param {string} params.reference      - unique reference for this transfer
 * @param {number} params.amount         - amount in NGN
 * @param {string} params.recipientPhone - recipient's OPay phone number
 * @param {string} params.recipientName  - recipient's name
 * @param {string} params.reason         - transfer reason/narration
 */
async function payoutToWallet({ reference, amount, recipientPhone, recipientName, reason }) {
  if (!isConfigured()) throw new Error('OPay not configured');

  const body = {
    merchantId: MERCHANT_ID,
    reference,
    amount: {
      total: amount.toFixed(2),
      currency: 'NGN',
    },
    receiver: {
      name: recipientName,
      phoneNumber: recipientPhone,
    },
    remark: reason || 'StakeIQ withdrawal',
  };

  const response = await axios.post(
    `${BASE_URL}/api/v1/international/transfer/toWallet`,
    body,
    { headers: opayHeaders(body), timeout: 15000 }
  );

  if (response.data?.code !== '00000') {
    throw new Error(`OPay payout error: ${response.data?.message || 'Transfer failed'}`);
  }

  return response.data;
}

/**
 * Payout — send money to a bank account via OPay
 */
async function payoutToBank({ reference, amount, accountNumber, accountName, bankCode, reason }) {
  if (!isConfigured()) throw new Error('OPay not configured');

  const body = {
    merchantId: MERCHANT_ID,
    reference,
    amount: {
      total: amount.toFixed(2),
      currency: 'NGN',
    },
    receiver: {
      name: accountName,
      bankAccountNo: accountNumber,
      bankCode,
    },
    remark: reason || 'StakeIQ withdrawal',
  };

  const response = await axios.post(
    `${BASE_URL}/api/v1/international/transfer/toBank`,
    body,
    { headers: opayHeaders(body), timeout: 15000 }
  );

  if (response.data?.code !== '00000') {
    throw new Error(`OPay bank payout error: ${response.data?.message || 'Transfer failed'}`);
  }

  return response.data;
}

/**
 * Verify an incoming OPay webhook payload
 * OPay sends a signature in the Authorization header — verify it matches the body
 */
function verifyWebhook(rawBody, authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const receivedSig = authHeader.split(' ')[1];
  const expected = signRequest(JSON.parse(rawBody));
  return crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expected));
}

module.exports = { initiateDeposit, queryPayment, payoutToWallet, payoutToBank, verifyWebhook, isConfigured, isSandbox };
