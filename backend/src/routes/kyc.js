const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/kyc')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${file.fieldname}-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Only JPG, PNG, PDF files allowed'));
  }
});

// GET /api/kyc/status
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  const kyc = await prisma.kyc.findUnique({ where: { userId: req.user.id } });
  res.json({ kycStatus: req.user.kycStatus, kyc });
}));

// POST /api/kyc/bvn  — step 2
router.post('/bvn', authenticate,
  [
    body('bvn').isLength({ min: 11, max: 11 }).isNumeric().withMessage('BVN must be 11 digits'),
    body('idType').isIn(['NIN', 'PVC', 'PASSPORT', 'DRIVERS_LICENSE']).withMessage('Valid ID type required'),
    body('idNumber').notEmpty().withMessage('ID number required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { bvn, idType, idNumber } = req.body;

    // In production: call BVN verification API (NIBSS/Dojah/Smile Identity)
    // For MVP, simulate verification
    await prisma.kyc.update({
      where: { userId: req.user.id },
      data: { bvn, idType, idNumber, status: 'IN_REVIEW' }
    });

    res.json({ message: 'BVN saved successfully', step: 'bvn' });
  })
);

// POST /api/kyc/upload — step 3 (ID photos)
router.post('/upload',
  authenticate,
  upload.fields([{ name: 'idFront', maxCount: 1 }, { name: 'idBack', maxCount: 1 }]),
  asyncHandler(async (req, res) => {
    const files = req.files;
    const updates = {};
    if (files?.idFront?.[0]) updates.idFrontUrl = `/uploads/kyc/${files.idFront[0].filename}`;
    if (files?.idBack?.[0]) updates.idBackUrl = `/uploads/kyc/${files.idBack[0].filename}`;

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'At least one ID photo required' });
    }

    await prisma.kyc.update({ where: { userId: req.user.id }, data: updates });
    res.json({ message: 'ID photos uploaded', ...updates });
  })
);

// POST /api/kyc/selfie — step 4 partial
router.post('/selfie',
  authenticate,
  upload.single('selfie'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Selfie photo required' });
    const selfieUrl = `/uploads/kyc/${req.file.filename}`;
    await prisma.kyc.update({ where: { userId: req.user.id }, data: { selfieUrl } });
    res.json({ message: 'Selfie uploaded', selfieUrl });
  })
);

// POST /api/kyc/submit — final submission
router.post('/submit', authenticate,
  [
    body('address').notEmpty().withMessage('Address required'),
    body('city').notEmpty().withMessage('City required'),
    body('kycState').notEmpty().withMessage('State required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { address, city, kycState } = req.body;

    const kyc = await prisma.kyc.findUnique({ where: { userId: req.user.id } });
    if (!kyc?.bvn) return res.status(400).json({ error: 'Complete BVN step first' });
    if (!kyc?.idFrontUrl) return res.status(400).json({ error: 'Upload ID photos first' });
    if (!kyc?.selfieUrl) return res.status(400).json({ error: 'Upload selfie first' });

    await prisma.$transaction([
      prisma.kyc.update({
        where: { userId: req.user.id },
        data: { address, city, kycState, status: 'IN_REVIEW', submittedAt: new Date() }
      }),
      prisma.user.update({ where: { id: req.user.id }, data: { kycStatus: 'IN_REVIEW' } })
    ]);

    // Simulate auto-approval for MVP (in prod: async verification service)
    setTimeout(async () => {
      await prisma.$transaction([
        prisma.kyc.update({ where: { userId: req.user.id }, data: { status: 'APPROVED', reviewedAt: new Date() } }),
        prisma.user.update({ where: { id: req.user.id }, data: { kycStatus: 'APPROVED' } })
      ]);
    }, 5000);

    res.json({ message: 'KYC submitted for review', status: 'IN_REVIEW' });
  })
);

module.exports = router;
