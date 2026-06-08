require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const multer  = require('multer');

const connectDatabase  = require('./database');
const bulkImportRoutes = require('./routes/bulkImportRoutes');
const activityRoutes   = require('./routes/activityRoutes');
const stayRoutes       = require('./routes/stayRoutes');
const reviewRoutes     = require('./routes/reviewRoutes');
const messageRoutes    = require('./routes/messageRoutes');
const subscriberRoutes = require('./routes/subscriberRoutes');
const bookingRoutes    = require('./routes/bookingRoutes');

const server = express();
const port   = 3042;

connectDatabase();

// Tillader frontend paa localhost:5173 at kalde API'et
server.use(cors({ origin: 'http://localhost:5173' }));

// Goer at serveren kan laese JSON fra request body (POST/PUT)
server.use(express.json());

// Admin-token til beskyttelse af /admin/* ruter
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'glamping-admin-2026';
const requireAdminToken = (req, res, next) => {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${ADMIN_TOKEN}`) {
        return res.status(401).json({ error: 'Ugyldig eller manglende admin-token' });
    }
    next();
};
server.use('/admin', requireAdminToken);

// Server uploadede billeder statisk
server.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer - gem uploadede filer i /uploads med originalt filnavn + tidsstempel
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Kun billedfiler er tilladt'));
        }
        cb(null, true);
    },
});

// POST /upload
server.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Ingen fil modtaget' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

// Ruter
server.use(bulkImportRoutes);
server.use(activityRoutes);
server.use(stayRoutes);
server.use(reviewRoutes);
server.use(messageRoutes);
server.use(subscriberRoutes);
server.use(bookingRoutes);

// Start server
server.listen(port, () => {
    console.log('Serveren koerer paa port http://localhost:' + port);
});
