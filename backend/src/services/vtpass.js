/**
 * VTPass Bill Payment API Integration
 * https://vtpass.com/documentation/
 *
 * Supports: Airtime, Data, Electricity (11 DISCOs), Cable TV, Education
 * Set VTPASS_API_KEY + VTPASS_SECRET_KEY in .env to go live.
 * Without keys, returns mock responses so UI works end-to-end.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const SANDBOX_URL = 'https://sandbox.vtpass.com/api';
const LIVE_URL = 'https://vtpass.com/api';

const API_KEY = process.env.VTPASS_API_KEY;
const SECRET_KEY = process.env.VTPASS_SECRET_KEY;
const PUBLIC_KEY = process.env.VTPASS_PUBLIC_KEY;
const IS_LIVE = process.env.VTPASS_LIVE === 'true';

const BASE_URL = IS_LIVE ? LIVE_URL : SANDBOX_URL;

const isConfigured = () => !!(API_KEY && SECRET_KEY);

// ── Cashback rates per category ──────────────────────────────────────────────
const CASHBACK_RATES = {
  ELECTRICITY: 0.01,   // 1%
  CABLE_TV: 0.015,     // 1.5%
  AIRTIME: 0.005,      // 0.5%
  DATA: 0.005,         // 0.5%
  EDUCATION: 0.005,
  INTERNET: 0.005,
};

// BSR points: +2 per ₦1,000 spent on bills
function calcBsrPoints(amount) {
  return Math.floor(amount / 1000) * 2;
}

function calcCashback(category, amount) {
  const rate = CASHBACK_RATES[category] || 0;
  return parseFloat((amount * rate).toFixed(2));
}

// ── Service IDs ───────────────────────────────────────────────────────────────
const SERVICE_IDS = {
  // Airtime
  MTN_AIRTIME: 'mtn',
  AIRTEL_AIRTIME: 'airtel',
  GLO_AIRTIME: 'glo',
  ETISALAT_AIRTIME: 'etisalat',
  // Data
  MTN_DATA: 'mtn-data',
  AIRTEL_DATA: 'airtel-data',
  GLO_DATA: 'glo-data',
  ETISALAT_DATA: 'etisalat-data',
  // Electricity
  IKEDC: 'ikeja-electric',
  AEDC: 'abuja-electric',
  EKEDC: 'eko-electric',
  IBEDC: 'ibadan-electric',
  PHED: 'portharcourt-electric',
  EEDC: 'enugu-electric',
  YEDC: 'jos-electric',
  KAEDCO: 'kano-electric',
  KEDCO: 'kaduna-electric',
  BEDC: 'benin-electric',
  AEDC2: 'aba-electric',
  // Cable TV
  DSTV: 'dstv',
  GOTV: 'gotv',
  STARTIMES: 'startimes',
  // Education
  WAEC: 'waec',
  JAMB: 'jamb',
  NECO: 'neco',
};

// ── API call helper ───────────────────────────────────────────────────────────
async function vtpassPost(endpoint, data) {
  const resp = await axios.post(`${BASE_URL}${endpoint}`, data, {
    headers: {
      'api-key': API_KEY,
      'secret-key': SECRET_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
  return resp.data;
}

async function vtpassGet(endpoint) {
  const resp = await axios.get(`${BASE_URL}${endpoint}`, {
    headers: {
      'api-key': API_KEY,
      'public-key': PUBLIC_KEY,
    },
    timeout: 15000,
  });
  return resp.data;
}

// ── Verify meter/smartcard before payment ────────────────────────────────────
async function verifyAccount(serviceId, billersCode) {
  if (!isConfigured()) {
    return { code: '000', content: { Customer: { Customer_Name: 'Demo Customer', Address: 'Lagos, Nigeria' } } };
  }
  try {
    return await vtpassPost('/merchant-verify', { serviceID: serviceId, billersCode });
  } catch (err) {
    console.error('[VTPass] verifyAccount error:', err.message);
    throw new Error('Could not verify account. Check meter/smartcard number.');
  }
}

// ── Buy Airtime ───────────────────────────────────────────────────────────────
async function buyAirtime({ network, phone, amount }) {
  const serviceId = SERVICE_IDS[`${network.toUpperCase()}_AIRTIME`];
  if (!serviceId) throw new Error(`Unknown network: ${network}`);

  if (!isConfigured()) {
    return mockResponse('airtime', { network, phone, amount });
  }

  const requestId = `AIR-${Date.now()}-${uuidv4().slice(0, 8)}`;
  return vtpassPost('/pay', {
    request_id: requestId,
    serviceID: serviceId,
    amount,
    phone,
  });
}

// ── Buy Data ──────────────────────────────────────────────────────────────────
async function buyData({ network, phone, variationCode }) {
  const serviceId = SERVICE_IDS[`${network.toUpperCase()}_DATA`];
  if (!serviceId) throw new Error(`Unknown network: ${network}`);

  if (!isConfigured()) {
    return mockResponse('data', { network, phone, variationCode });
  }

  const requestId = `DAT-${Date.now()}-${uuidv4().slice(0, 8)}`;
  return vtpassPost('/pay', {
    request_id: requestId,
    serviceID: serviceId,
    variation_code: variationCode,
    phone,
  });
}

// ── Pay Electricity ───────────────────────────────────────────────────────────
async function payElectricity({ disco, meterNumber, meterType = 'prepaid', amount, phone }) {
  const serviceId = SERVICE_IDS[disco.toUpperCase()] || disco;

  if (!isConfigured()) {
    return mockResponse('electricity', { disco, meterNumber, amount });
  }

  const requestId = `ELEC-${Date.now()}-${uuidv4().slice(0, 8)}`;
  return vtpassPost('/pay', {
    request_id: requestId,
    serviceID: serviceId,
    billersCode: meterNumber,
    variation_code: meterType,
    amount,
    phone,
  });
}

// ── Pay Cable TV ──────────────────────────────────────────────────────────────
async function payCable({ provider, smartcard, variationCode, phone }) {
  const serviceId = SERVICE_IDS[provider.toUpperCase()];
  if (!serviceId) throw new Error(`Unknown cable provider: ${provider}`);

  if (!isConfigured()) {
    return mockResponse('cable', { provider, smartcard, variationCode });
  }

  const requestId = `CAB-${Date.now()}-${uuidv4().slice(0, 8)}`;
  return vtpassPost('/pay', {
    request_id: requestId,
    serviceID: serviceId,
    billersCode: smartcard,
    variation_code: variationCode,
    phone,
  });
}

// ── Query transaction status ──────────────────────────────────────────────────
async function queryTransaction(requestId) {
  if (!isConfigured()) return { code: '000', content: { transactions: { status: 'delivered' } } };
  return vtpassGet(`/requery?request_id=${requestId}`);
}

// ── Mock responses (when no API key) ─────────────────────────────────────────
function mockResponse(type, params) {
  const tokens = {
    electricity: `${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)}`,
  };
  return {
    code: '000',
    response_description: 'TRANSACTION SUCCESSFUL',
    requestId: `MOCK-${Date.now()}`,
    amount: params.amount,
    transaction_date: { date: new Date().toISOString() },
    purchased_code: type === 'electricity' ? tokens.electricity : `${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
    content: {
      transactions: {
        status: 'delivered',
        product_name: `${type} payment`,
        unit_price: params.amount || 0,
        quantity: 1,
        serviceID: type,
        phone: params.phone || '',
        convinience_fee: 0,
      },
    },
    source: 'mock',
  };
}

module.exports = {
  isConfigured,
  verifyAccount,
  buyAirtime,
  buyData,
  payElectricity,
  payCable,
  queryTransaction,
  calcCashback,
  calcBsrPoints,
  SERVICE_IDS,
};
