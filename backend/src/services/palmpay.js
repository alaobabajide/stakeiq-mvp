/**
 * PalmPay Merchant API Integration
 * Docs: https://developer.palmpay.com
 *
 * Credentials needed (from your PalmPay Merchant dashboard):
 *   PALMPAY_APP_ID       — your app / merchant ID
 *   PALMPAY_PRIVATE_KEY  — RSA private key for signing requests (PEM format)
 *   PALMPAY_PUBLIC_KEY   — PalmPay's public key for verifying webhooks
 *   PALMPAY_BASE_URL     — sandbox: https://testapi.palmpay-inc.com
 *                          production: https://api.palmpay-inc.com
 */
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = process.env.PALMPAY_BASE_URL || 'https://testapi.palmpay-inc.com';
const APP_ID = process.env.PALMPAY_APP_ID || '';
const PRIVATE_KEY_PEM = process.env.PALMPAY_PRIVATE_KEY || '';
const PALMPAY_PUBLIC_KEY_PEM = process.env.PALMPAY_PUBLIC_KEY || '';

/**
 * PalmPay signs requests using RSA-SHA256 with your private key.
 * The signature covers: appId + nonceStr + timeStamp + body (all sorted & concatenated)
 */
function signRequest(params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const sign = crypto.createSign('SHA256');
  sign.update(sorted);
  sign.end();
  return sign.sign(PRIVATE_KEY_PEM, 'base64');
}

function buildHeaders(bodyObj) {
  const nonceStr = uuidv4().replace(/-/g, '');
  const timeStamp = String(Date.now());
  const bodyStr = JSON.stringify(bodyObj);

  const signPayload = { appId: APP_ID, nonceStr, timeStamp, body: bodyStr };
  const signature = signRequest(signPayload);

  return {
    'Content-Type': 'application/json',
    'AppId': APP_ID,
    'NonceStr': nonceStr,
    'Timestamp': timeStamp,
    'Sign': signature,
  };
}

function isConfigured() {
  return !!(APP_ID && PRIVATE_KEY_PEM);
}

/**
 * Initiate a deposit via PalmPay — creates a hosted payment page URL
 *
 * @param {object} params
 * @param {string} params.reference      - unique order reference
 * @param {number} params.amount         - amount in NGN
 * @param {string} params.userPhone      - payer's phone number
 * @param {string} params.userName       - payer's name
 * @param {string} params.callbackUrl    - webhook URL PalmPay POSTs to on completion
 * @param {string} params.returnUrl      - redirect after payment
 * @returns {{ paymentUrl: string, orderId: string }}
 */
async function initiateDeposit({ reference, amount, userPhone, userName, callbackUrl, returnUrl }) {
  if (!isConfigured()) {
    throw new Error('PalmPay credentials not configured. Add PALMPAY_APP_ID and PALMPAY_PRIVATE_KEY to .env');
  }

  const body = {
    appId: APP_ID,
    merchantOrderNo: reference,
    orderAmount: (amount * 100).toFixed(0), // PalmPay uses kobo (smallest unit)
    currency: 'NGN',
    productName: 'StakeIQ Wallet Deposit',
    productDesc: `Deposit ₦${amount} to StakeIQ wallet`,
    callbackUrl,
    returnUrl,
    expiredTime: 30 * 60, // 30 minutes in seconds
    userInfo: {
      userId: reference,
      name: userName,
      phone: userPhone,
    },
  };

  const response = await axios.post(
    `${BASE_URL}/api/payment/v2/order/create`,
    body,
    { headers: buildHeaders(body), timeout: 15000 }
  );

  if (response.data?.respCode !== '00000000') {
    throw new Error(`PalmPay error: ${response.data?.respMsg || 'Payment initiation failed'}`);
  }

  return {
    paymentUrl: response.data.data?.paymentUrl,
    orderId: response.data.data?.orderId,
    reference,
  };
}

/**
 * Query an order status by merchant order number
 */
async function queryPayment(reference) {
  if (!isConfigured()) throw new Error('PalmPay not configured');

  const body = { appId: APP_ID, merchantOrderNo: reference };

  const response = await axios.post(
    `${BASE_URL}/api/payment/v2/order/query`,
    body,
    { headers: buildHeaders(body), timeout: 15000 }
  );

  return response.data;
}

/**
 * Payout — transfer money to a PalmPay wallet or bank account (disbursement)
 *
 * @param {object} params
 * @param {string} params.reference        - unique payout reference
 * @param {number} params.amount           - amount in NGN
 * @param {string} params.recipientPhone   - recipient PalmPay phone number
 * @param {string} params.recipientName    - recipient name
 * @param {string} params.reason           - narration/description
 */
async function payoutToWallet({ reference, amount, recipientPhone, recipientName, reason }) {
  if (!isConfigured()) throw new Error('PalmPay not configured');

  const body = {
    appId: APP_ID,
    merchantOrderNo: reference,
    orderAmount: (amount * 100).toFixed(0),
    currency: 'NGN',
    remark: reason || 'StakeIQ withdrawal',
    payeeInfo: {
      name: recipientName,
      phone: recipientPhone,
    },
  };

  const response = await axios.post(
    `${BASE_URL}/api/transfer/v2/toWallet`,
    body,
    { headers: buildHeaders(body), timeout: 15000 }
  );

  if (response.data?.respCode !== '00000000') {
    throw new Error(`PalmPay payout error: ${response.data?.respMsg || 'Transfer failed'}`);
  }

  return response.data;
}

/**
 * Payout to bank account
 */
async function payoutToBank({ reference, amount, accountNumber, accountName, bankCode, reason }) {
  if (!isConfigured()) throw new Error('PalmPay not configured');

  const body = {
    appId: APP_ID,
    merchantOrderNo: reference,
    orderAmount: (amount * 100).toFixed(0),
    currency: 'NGN',
    remark: reason || 'StakeIQ withdrawal',
    payeeInfo: {
      name: accountName,
      accountNumber,
      bankCode,
    },
  };

  const response = await axios.post(
    `${BASE_URL}/api/transfer/v2/toBank`,
    body,
    { headers: buildHeaders(body), timeout: 15000 }
  );

  if (response.data?.respCode !== '00000000') {
    throw new Error(`PalmPay bank payout error: ${response.data?.respMsg || 'Transfer failed'}`);
  }

  return response.data;
}

/**
 * Verify an incoming PalmPay webhook
 * PalmPay signs the notification with their private key — verify using their public key
 */
function verifyWebhook(rawBody, signature) {
  if (!PALMPAY_PUBLIC_KEY_PEM || !signature) return false;
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(rawBody);
    return verify.verify(PALMPAY_PUBLIC_KEY_PEM, signature, 'base64');
  } catch {
    return false;
  }
}

module.exports = { initiateDeposit, queryPayment, payoutToWallet, payoutToBank, verifyWebhook, isConfigured };
