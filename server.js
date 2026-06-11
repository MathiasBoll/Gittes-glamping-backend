require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const multer       = require('multer');
const cookieParser = require('cookie-parser');

const connectDatabase  = require('./database');
const bulkImportRoutes = require('./routes/bulkImportRoutes');
const activityRoutes   = require('./routes/activityRoutes');
const stayRoutes       = require('./routes/stayRoutes');
const reviewRoutes     = require('./routes/reviewRoutes');
const messageRoutes    = require('./routes/messageRoutes');
const subscriberRoutes = require('./routes/subscriberRoutes');
const bookingRoutes    = require('./routes/bookingRoutes');
const authRoutes       = require('./routes/authRoutes');
const userRoutes       = require('./routes/userRoutes');
const myListRoutes     = require('./routes/myListRoutes');

const server = express();
const port   = process.env.PORT || 3042;

connectDatabase();

// Tillader frontend at kalde API'et – sæt CORS_ORIGIN i .env (komma-separeret)
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : ['http://localhost:5173'];
server.use(cors({ origin: allowedOrigins, credentials: true }));
server.use(cookieParser());

// Goer at serveren kan laese JSON fra request body (POST/PUT)
server.use(express.json());

// /admin/* ruter kræver admin JWT (se middleware/authMiddleware.js)
const { requireAdmin } = require('./middleware/authMiddleware');
server.use('/admin', requireAdmin);

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
server.use(authRoutes);
server.use(userRoutes);
server.use(myListRoutes);
server.use(bulkImportRoutes);
server.use(activityRoutes);
server.use(stayRoutes);
server.use(reviewRoutes);
server.use(messageRoutes);
server.use(subscriberRoutes);
server.use(bookingRoutes);

// Start server
server.listen(port, '0.0.0.0', () => {
    console.log('Serveren koerer paa port http://localhost:' + port);
});
