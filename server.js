require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const multer     = require('multer');

const connectDatabase = require('./database');
const bulkImportRoutes = require('./routes/bulkImportRoutes');
const Activity   = require('./models/Activity');
const Review     = require('./models/Review');
const Stay       = require('./models/Stay');
const Message    = require('./models/Message');
const Subscriber = require('./models/Subscriber');
const Booking    = require('./models/Booking');

const server = express();
const port   = 3042;

connectDatabase();

// Tillader frontend på localhost:5173 at kalde API'et
server.use(cors({ origin: 'http://localhost:5173' }));

// Gør at serveren kan læse JSON fra request body (POST/PUT)
server.use(express.json());

// Bulk import ruter (POST /bulk/:type og POST /bulk-all)
server.use(bulkImportRoutes);

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

// Multer – gem uploadede filer i /uploads med originalt filnavn + tidsstempel
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
    limits: { fileSize: 10 * 1024 * 1024 }, // maks 10 MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Kun billedfiler er tilladt'));
        }
        cb(null, true);
    },
});

// ── POST /upload ── modtager én fil (felt: "image"), returnerer URL
server.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Ingen fil modtaget' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

// ── AKTIVITETER ─────────────────────────────────────────────
server.get('/activities', async (req, res) => {
    try {
        const filter = req.query.date ? { date: req.query.date } : {};
        const activities = await Activity.find(filter).sort({ sortOrder: 1, created: -1 });
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.get('/activities/:id', async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);
        if (!activity) return res.status(404).json({ error: 'Aktivitet ikke fundet' });
        res.json(activity);
    } catch {
        res.status(404).json({ error: 'Aktivitet ikke fundet' });
    }
});

server.post('/activities', async (req, res) => {
    try {
        const { title, date, time, description, image } = req.body;
        if (!title || !date || !time || !description || !image) {
            return res.status(400).json({ error: 'title, date, time, description og image er påkrævet' });
        }
        const activity = await Activity.create({
            title, date, time, description, image,
            isActive:  req.body.isActive  !== undefined ? req.body.isActive  : true,
            sortOrder: req.body.sortOrder || 0,
        });
        res.status(201).json(activity);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.put('/activities/:id', async (req, res) => {
    try {
        const activity = await Activity.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!activity) return res.status(404).json({ error: 'Aktivitet ikke fundet' });
        res.json(activity);
    } catch {
        res.status(404).json({ error: 'Aktivitet ikke fundet' });
    }
});

server.delete('/activities/:id', async (req, res) => {
    try {
        const result = await Activity.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Aktivitet ikke fundet' });
        res.json({ message: 'Aktivitet slettet' });
    } catch {
        res.status(404).json({ error: 'Aktivitet ikke fundet' });
    }
});

// ── ANMELDELSER ─────────────────────────────────────────────
server.get('/reviews', async (req, res) => {
    try {
        const reviews = await Review.find({ isVisible: true }).sort({ created: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.post('/reviews', async (req, res) => {
    try {
        const { name, review } = req.body;
        if (!name || !review) {
            return res.status(400).json({ error: 'name og review er påkrævet' });
        }
        const newReview = await Review.create({
            name,
            age:       req.body.age  || '',
            stay:      req.body.stay || '',
            review,
            isVisible: true,
        });
        res.status(201).json(newReview);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.put('/reviews/:id', async (req, res) => {
    try {
        const updated = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ error: 'Anmeldelse ikke fundet' });
        res.json(updated);
    } catch {
        res.status(404).json({ error: 'Anmeldelse ikke fundet' });
    }
});

server.delete('/reviews/:id', async (req, res) => {
    try {
        const result = await Review.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Anmeldelse ikke fundet' });
        res.json({ message: 'Anmeldelse slettet' });
    } catch {
        res.status(404).json({ error: 'Anmeldelse ikke fundet' });
    }
});

// ADMIN – alle anmeldelser (inkl. skjulte)
server.get('/admin/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ created: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── OPHOLD ──────────────────────────────────────────────────
server.get('/stays', async (req, res) => {
    try {
        const filter = req.query.persons ? { numberOfPersons: req.query.persons } : {};
        const stays = await Stay.find(filter).sort({ created: -1 });
        res.json(stays);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.get('/stays/:id', async (req, res) => {
    try {
        const stay = await Stay.findById(req.params.id);
        if (!stay) return res.status(404).json({ error: 'Ophold ikke fundet' });
        res.json(stay);
    } catch {
        res.status(404).json({ error: 'Ophold ikke fundet' });
    }
});

server.post('/stays', async (req, res) => {
    try {
        const { title, numberOfPersons, price, image } = req.body;
        if (!title || !numberOfPersons || !price || !image) {
            return res.status(400).json({ error: 'title, numberOfPersons, price og image er påkrævet' });
        }
        const stay = await Stay.create({
            title,
            teaser:            req.body.teaser            || '',
            description:       req.body.description       || '',
            numberOfPersons:   String(numberOfPersons),
            discountInPercent: req.body.discountInPercent || 0,
            price,
            includes:          req.body.includes          || [],
            image,
            isActive:          req.body.isActive !== undefined ? req.body.isActive : true,
        });
        res.status(201).json(stay);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.put('/stays/:id', async (req, res) => {
    try {
        const stay = await Stay.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!stay) return res.status(404).json({ error: 'Ophold ikke fundet' });
        res.json(stay);
    } catch {
        res.status(404).json({ error: 'Ophold ikke fundet' });
    }
});

server.delete('/stays/:id', async (req, res) => {
    try {
        const result = await Stay.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Ophold ikke fundet' });
        res.json({ message: 'Ophold slettet' });
    } catch {
        res.status(404).json({ error: 'Ophold ikke fundet' });
    }
});

// ── KONTAKTBESKEDER ─────────────────────────────────────────
server.post('/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'name, email og message er påkrævet' });
        }
        const msg = await Message.create({
            name, email,
            category: req.body.category || '',
            message,
            status: 'ny',
        });
        res.status(201).json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.get('/admin/messages', async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const total      = await Message.countDocuments();
        const totalPages = Math.ceil(total / limit) || 1;
        const data       = await Message.find()
            .sort({ created: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.json({ data, page, totalPages, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.patch('/admin/messages/:id/status', async (req, res) => {
    try {
        const msg = await Message.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        );
        if (!msg) return res.status(404).json({ error: 'Besked ikke fundet' });
        res.json(msg);
    } catch {
        res.status(404).json({ error: 'Besked ikke fundet' });
    }
});

server.patch('/admin/messages/:id/reply', async (req, res) => {
    try {
        const { reply } = req.body;
        if (!reply || !reply.trim()) {
            return res.status(400).json({ error: 'Svar-tekst er påkrævet' });
        }
        const msg = await Message.findByIdAndUpdate(
            req.params.id,
            { reply: reply.trim(), repliedAt: new Date(), status: 'besvaret' },
            { new: true }
        );
        if (!msg) return res.status(404).json({ error: 'Besked ikke fundet' });
        res.json(msg);
    } catch {
        res.status(404).json({ error: 'Besked ikke fundet' });
    }
});

server.delete('/admin/messages/:id', async (req, res) => {
    try {
        const result = await Message.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Besked ikke fundet' });
        res.json({ message: 'Besked slettet' });
    } catch {
        res.status(404).json({ error: 'Besked ikke fundet' });
    }
});

// ── NYHEDSBREV / ABONNENTER ─────────────────────────────────
server.post('/subscribers', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Gyldig e-mail er påkrævet' });
        }
        const normalised = email.trim().toLowerCase();
        const already = await Subscriber.findOne({ email: normalised });
        if (already) return res.status(409).json({ error: 'E-mailen er allerede tilmeldt' });
        const sub = await Subscriber.create({ email: normalised });
        res.status(201).json(sub);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.get('/admin/subscribers', async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const total      = await Subscriber.countDocuments();
        const totalPages = Math.ceil(total / limit) || 1;
        const data       = await Subscriber.find()
            .sort({ subscribedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.json({ data, page, totalPages, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.patch('/admin/subscribers/:id', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Gyldig e-mail er påkrævet' });
        }
        const normalised = email.trim().toLowerCase();
        const dup = await Subscriber.findOne({ email: normalised, _id: { $ne: req.params.id } });
        if (dup) return res.status(409).json({ error: 'E-mailen er allerede i brug' });
        const sub = await Subscriber.findByIdAndUpdate(
            req.params.id,
            { email: normalised },
            { new: true }
        );
        if (!sub) return res.status(404).json({ error: 'Abonnent ikke fundet' });
        res.json(sub);
    } catch {
        res.status(404).json({ error: 'Abonnent ikke fundet' });
    }
});

server.delete('/admin/subscribers/:id', async (req, res) => {
    try {
        const result = await Subscriber.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Abonnent ikke fundet' });
        res.json({ message: 'Abonnent fjernet' });
    } catch {
        res.status(404).json({ error: 'Abonnent ikke fundet' });
    }
});

// ── BOOKINGER ───────────────────────────────────────────────
server.post('/bookings', async (req, res) => {
    try {
        const { name, email, stayId, checkIn, checkOut } = req.body;
        if (!name || !email || !stayId || !checkIn || !checkOut) {
            return res.status(400).json({ error: 'name, email, stayId, checkIn og checkOut er påkrævet' });
        }
        const stay = await Stay.findById(stayId).catch(() => null);
        const booking = await Booking.create({
            name, email,
            stayId,
            stayTitle: stay ? stay.title : '',
            checkIn, checkOut,
            guests:  req.body.guests  || 1,
            message: req.body.message || '',
            status:  'ny',
        });
        res.status(201).json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.get('/admin/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ created: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.patch('/admin/bookings/:id/status', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        );
        if (!booking) return res.status(404).json({ error: 'Booking ikke fundet' });
        res.json(booking);
    } catch {
        res.status(404).json({ error: 'Booking ikke fundet' });
    }
});

server.delete('/admin/bookings/:id', async (req, res) => {
    try {
        const result = await Booking.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Booking ikke fundet' });
        res.json({ message: 'Booking slettet' });
    } catch {
        res.status(404).json({ error: 'Booking ikke fundet' });
    }
});

// ── Start server ────────────────────────────────────────────
server.listen(port, () => {
    console.log('Serveren kører på port http://localhost:' + port);
});
