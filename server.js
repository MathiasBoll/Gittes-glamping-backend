const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const server = express();
const port = 3042;

// Tillader frontend på localhost:5173 at kalde API'et
server.use(cors({ origin: 'http://localhost:5173' }));

// Gør at serveren kan læse JSON fra request body (POST/PUT)
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
    const url = `http://localhost:${port}/uploads/${req.file.filename}`;
    res.status(201).json({ url });
});

// Hjælpefunktion: gemmer ændringer til activities.json på disken
// Så data ikke forsvinder når serveren genstarter
const ACTIVITIES_PATH = path.join(__dirname, 'activities.json');
const saveActivities = () => {
    fs.writeFileSync(ACTIVITIES_PATH, JSON.stringify(activities, null, 2));
};

// Hjælpefunktion: genererer et simpelt unikt id baseret på tidsstempel
const generateId = () => Date.now().toString();

// Indlæs data fra JSON-filer
let activities = require('./activities.json');
let reviews = require('./reviews.json');
let stays = require('./stays.json');

// ──────────────────────────────────────────────
// ACTIVITIES – GET alle (støtter ?date=YYYY-MM-DD filter)
// ──────────────────────────────────────────────
server.get('/activities', (req, res) => {
    const { date } = req.query;
    if (date) return res.json(activities.filter(a => a.date === date));
    res.json(activities);
});

// ──────────────────────────────────────────────
// ACTIVITIES – GET én aktivitet via id
// ──────────────────────────────────────────────
server.get('/activities/:id', (req, res) => {
    const activity = activities.find(a => String(a.id) === String(req.params.id));
    if (!activity) return res.status(404).json({ error: 'Aktivitet ikke fundet' });
    res.json(activity);
});

// ──────────────────────────────────────────────
// ACTIVITIES – POST (opret ny aktivitet)
// ──────────────────────────────────────────────
server.post('/activities', (req, res) => {
    const { title, date, time, description, image } = req.body;

    // Validering: tjek at påkrævede felter er udfyldt
    if (!title || !date || !time || !description || !image) {
        return res.status(400).json({ error: 'title, date, time, description og image er påkrævet' });
    }

    const newActivity = {
        id: generateId(),
        title,
        date,
        time,
        description,
        image,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        sortOrder: req.body.sortOrder || 0,
        created: new Date().toISOString(),
    };

    activities.push(newActivity);
    saveActivities(); // gem til disk
    res.status(201).json(newActivity);
});

// ──────────────────────────────────────────────
// ACTIVITIES – PUT (opdater eksisterende aktivitet)
// ──────────────────────────────────────────────
server.put('/activities/:id', (req, res) => {
    const index = activities.findIndex(a => String(a.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Aktivitet ikke fundet' });

    // Slå eksisterende data sammen med de nye værdier
    activities[index] = { ...activities[index], ...req.body, id: activities[index].id };
    saveActivities(); // gem til disk
    res.json(activities[index]);
});

// ──────────────────────────────────────────────
// ACTIVITIES – DELETE (slet aktivitet)
// ──────────────────────────────────────────────
server.delete('/activities/:id', (req, res) => {
    const index = activities.findIndex(a => String(a.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Aktivitet ikke fundet' });

    activities.splice(index, 1);
    saveActivities(); // gem til disk
    res.json({ message: 'Aktivitet slettet' });
});

// ──────────────────────────────────────────────
// REVIEWS – GET alle
// ──────────────────────────────────────────────
server.get('/reviews', (req, res) => {
    res.json(reviews);
});

// ──────────────────────────────────────────────
// REVIEWS – hjælpefunktion til at gemme
// ──────────────────────────────────────────────
const REVIEWS_PATH = path.join(__dirname, 'reviews.json');
const saveReviews = () => {
    fs.writeFileSync(REVIEWS_PATH, JSON.stringify(reviews, null, 2));
};

// ──────────────────────────────────────────────
// REVIEWS – POST (opret ny anmeldelse)
// ──────────────────────────────────────────────
server.post('/reviews', (req, res) => {
    const { name, age, stay, review } = req.body;
    if (!name || !review) {
        return res.status(400).json({ error: 'name og review er påkrævet' });
    }
    const newReview = {
        id: generateId(),
        name,
        age: age || '',
        stay: stay || '',
        review,
        isVisible: true,
        created: new Date().toISOString(),
    };
    reviews.push(newReview);
    saveReviews();
    res.status(201).json(newReview);
});

// ──────────────────────────────────────────────
// REVIEWS – PUT (opdater anmeldelse)
// ──────────────────────────────────────────────
server.put('/reviews/:id', (req, res) => {
    const index = reviews.findIndex(r =>
        String(r.id) === String(req.params.id) ||
        String(r._id) === String(req.params.id)
    );
    if (index === -1) return res.status(404).json({ error: 'Anmeldelse ikke fundet' });
    const existingId = reviews[index].id || reviews[index]._id;
    reviews[index] = { ...reviews[index], ...req.body };
    if (reviews[index]._id !== undefined) reviews[index]._id = existingId;
    else reviews[index].id = existingId;
    saveReviews();
    res.json(reviews[index]);
});

// ──────────────────────────────────────────────
// REVIEWS – DELETE (slet anmeldelse)
// ──────────────────────────────────────────────
server.delete('/reviews/:id', (req, res) => {
    const index = reviews.findIndex(r =>
        String(r.id) === String(req.params.id) ||
        String(r._id) === String(req.params.id)
    );
    if (index === -1) return res.status(404).json({ error: 'Anmeldelse ikke fundet' });
    reviews.splice(index, 1);
    saveReviews();
    res.json({ message: 'Anmeldelse slettet' });
});

// ──────────────────────────────────────────────
// ADMIN/REVIEWS – GET alle (inkl. skjulte, sorteret nyeste øverst)
// ──────────────────────────────────────────────
server.get('/admin/reviews', (req, res) => {
    const sorted = [...reviews].sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json(sorted);
});

// ──────────────────────────────────────────────
// STAYS – GET alle (støtter ?persons=N filter)
// ──────────────────────────────────────────────
server.get('/stays', (req, res) => {
    const { persons } = req.query;
    if (persons) return res.json(stays.filter(s => String(s.numberOfPersons) === String(persons)));
    res.json(stays);
});

// ──────────────────────────────────────────────
// STAYS – GET ét ophold via id
// ──────────────────────────────────────────────
server.get('/stays/:id', (req, res) => {
    const stay = stays.find(s =>
        String(s.id) === String(req.params.id) ||
        String(s._id) === String(req.params.id)
    );
    if (!stay) return res.status(404).json({ error: 'Ophold ikke fundet' });
    res.json(stay);
});

// ──────────────────────────────────────────────
// STAYS – hjælpefunktion til at gemme
// ──────────────────────────────────────────────
const STAYS_PATH = path.join(__dirname, 'stays.json');
const saveStays = () => {
    fs.writeFileSync(STAYS_PATH, JSON.stringify(stays, null, 2));
};

// ──────────────────────────────────────────────
// STAYS – POST (opret nyt ophold)
// ──────────────────────────────────────────────
server.post('/stays', (req, res) => {
    const { title, numberOfPersons, price, image, teaser } = req.body;
    if (!title || !numberOfPersons || !price || !image) {
        return res.status(400).json({ error: 'title, numberOfPersons, price og image er påkrævet' });
    }
    const newStay = {
        id: generateId(),
        title,
        teaser: teaser || '',
        numberOfPersons,
        price,
        image,
        isActive: true,
        created: new Date().toISOString(),
    };
    stays.push(newStay);
    saveStays();
    res.status(201).json(newStay);
});

// ──────────────────────────────────────────────
// STAYS – PUT (opdater ophold)
// ──────────────────────────────────────────────
server.put('/stays/:id', (req, res) => {
    const index = stays.findIndex(s =>
        String(s.id) === String(req.params.id) ||
        String(s._id) === String(req.params.id)
    );
    if (index === -1) return res.status(404).json({ error: 'Ophold ikke fundet' });
    const existingId = stays[index].id || stays[index]._id;
    stays[index] = { ...stays[index], ...req.body };
    if (stays[index]._id !== undefined) stays[index]._id = existingId;
    else stays[index].id = existingId;
    saveStays();
    res.json(stays[index]);
});

// ──────────────────────────────────────────────
// STAYS – DELETE (slet ophold)
// ──────────────────────────────────────────────
server.delete('/stays/:id', (req, res) => {
    const index = stays.findIndex(s =>
        String(s.id) === String(req.params.id) ||
        String(s._id) === String(req.params.id)
    );
    if (index === -1) return res.status(404).json({ error: 'Ophold ikke fundet' });
    stays.splice(index, 1);
    saveStays();
    res.json({ message: 'Ophold slettet' });
});

// ──────────────────────────────────────────────
// MESSAGES – indlæs fra fil
// ──────────────────────────────────────────────
const MESSAGES_PATH = path.join(__dirname, 'messages.json');
let messages = [];
try {
    messages = JSON.parse(fs.readFileSync(MESSAGES_PATH, 'utf8'));
} catch {
    messages = [];
}
const saveMessages = () => {
    fs.writeFileSync(MESSAGES_PATH, JSON.stringify(messages, null, 2));
};

// ──────────────────────────────────────────────
// CONTACT – POST (offentlig kontaktformular)
// ──────────────────────────────────────────────
server.post('/contact', (req, res) => {
    const { name, email, category, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'name, email og message er påkrævet' });
    }
    const newMessage = {
        id: generateId(),
        name,
        email,
        category: category || '',
        message,
        status: 'ny',
        created: new Date().toISOString(),
    };
    messages.push(newMessage);
    saveMessages();
    res.status(201).json(newMessage);
});

// ──────────────────────────────────────────────
// ADMIN/MESSAGES – GET alle beskeder
// ──────────────────────────────────────────────
server.get('/admin/messages', (req, res) => {
    const sorted = [...messages].sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json(sorted);
});

// ──────────────────────────────────────────────
// ADMIN/MESSAGES – PATCH status (ny | læst | besvaret | arkiveret)
// ──────────────────────────────────────────────
server.patch('/admin/messages/:id/status', (req, res) => {
    const index = messages.findIndex(m => String(m.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Besked ikke fundet' });
    messages[index].status = req.body.status || messages[index].status;
    saveMessages();
    res.json(messages[index]);
});

// ──────────────────────────────────────────────
// ADMIN/MESSAGES – PATCH reply (gem svar-tekst og sæt status besvaret)
// ──────────────────────────────────────────────
server.patch('/admin/messages/:id/reply', (req, res) => {
    const index = messages.findIndex(m => String(m.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Besked ikke fundet' });
    const { reply } = req.body;
    if (!reply || !reply.trim()) return res.status(400).json({ error: 'Svar-tekst er påkrævet' });
    messages[index].reply = reply.trim();
    messages[index].repliedAt = new Date().toISOString();
    messages[index].status = 'besvaret';
    saveMessages();
    res.json(messages[index]);
});

// ──────────────────────────────────────────────
// ADMIN/MESSAGES – DELETE (slet besked)
// ──────────────────────────────────────────────
server.delete('/admin/messages/:id', (req, res) => {
    const index = messages.findIndex(m => String(m.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Besked ikke fundet' });
    messages.splice(index, 1);
    saveMessages();
    res.json({ message: 'Besked slettet' });
});

// ──────────────────────────────────────────────
// SUBSCRIBERS – indlæs fra fil
// ──────────────────────────────────────────────
const SUBSCRIBERS_PATH = path.join(__dirname, 'subscribers.json');
let subscribers = [];
try {
    subscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_PATH, 'utf8'));
} catch {
    subscribers = [];
}
const saveSubscribers = () => {
    fs.writeFileSync(SUBSCRIBERS_PATH, JSON.stringify(subscribers, null, 2));
};

// ──────────────────────────────────────────────
// SUBSCRIBERS – POST (tilmeld nyhedsbrev)
// ──────────────────────────────────────────────
server.post('/subscribers', (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Gyldig e-mail er påkrævet' });
    }
    const already = subscribers.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (already) {
        return res.status(409).json({ error: 'E-mailen er allerede tilmeldt' });
    }
    const newSub = {
        id: generateId(),
        email: email.trim().toLowerCase(),
        subscribedAt: new Date().toISOString(),
    };
    subscribers.push(newSub);
    saveSubscribers();
    res.status(201).json(newSub);
});

// ──────────────────────────────────────────────
// ADMIN/SUBSCRIBERS – GET alle
// ──────────────────────────────────────────────
server.get('/admin/subscribers', (req, res) => {
    const sorted = [...subscribers].sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt));
    res.json(sorted);
});

// ──────────────────────────────────────────────
// ADMIN/SUBSCRIBERS – DELETE
// ──────────────────────────────────────────────
server.delete('/admin/subscribers/:id', (req, res) => {
    const index = subscribers.findIndex(s => String(s.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Abonnent ikke fundet' });
    subscribers.splice(index, 1);
    saveSubscribers();
    res.json({ message: 'Abonnent fjernet' });
});

// ──────────────────────────────────────────────
// BOOKINGS – indlæs fra fil
// ──────────────────────────────────────────────
const BOOKINGS_PATH = path.join(__dirname, 'bookings.json');
let bookings = [];
try {
    bookings = JSON.parse(fs.readFileSync(BOOKINGS_PATH, 'utf8'));
} catch {
    bookings = [];
}
const saveBookings = () => {
    fs.writeFileSync(BOOKINGS_PATH, JSON.stringify(bookings, null, 2));
};

// ──────────────────────────────────────────────
// BOOKINGS – POST (opret booking)
// ──────────────────────────────────────────────
server.post('/bookings', (req, res) => {
    const { name, email, stayId, checkIn, checkOut, guests, message } = req.body;
    if (!name || !email || !stayId || !checkIn || !checkOut) {
        return res.status(400).json({ error: 'name, email, stayId, checkIn og checkOut er påkrævet' });
    }
    const stay = stays.find(s => String(s.id) === String(stayId) || String(s._id) === String(stayId));
    if (!stay) return res.status(404).json({ error: 'Ophold ikke fundet' });
    const newBooking = {
        id: generateId(),
        name,
        email,
        stayId,
        stayTitle: stay.title,
        checkIn,
        checkOut,
        guests: guests || 1,
        message: message || '',
        status: 'ny',
        created: new Date().toISOString(),
    };
    bookings.push(newBooking);
    saveBookings();
    res.status(201).json(newBooking);
});

// ──────────────────────────────────────────────
// ADMIN/BOOKINGS – GET alle (sorteret nyeste øverst)
// ──────────────────────────────────────────────
server.get('/admin/bookings', (req, res) => {
    const sorted = [...bookings].sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json(sorted);
});

// ──────────────────────────────────────────────
// ADMIN/BOOKINGS – PATCH status (ny | bekræftet | aflyst)
// ──────────────────────────────────────────────
server.patch('/admin/bookings/:id/status', (req, res) => {
    const index = bookings.findIndex(b => String(b.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Booking ikke fundet' });
    bookings[index].status = req.body.status || bookings[index].status;
    saveBookings();
    res.json(bookings[index]);
});

// ──────────────────────────────────────────────
// ADMIN/BOOKINGS – DELETE
// ──────────────────────────────────────────────
server.delete('/admin/bookings/:id', (req, res) => {
    const index = bookings.findIndex(b => String(b.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Booking ikke fundet' });
    bookings.splice(index, 1);
    saveBookings();
    res.json({ message: 'Booking slettet' });
});

server.listen(port, () => {
    console.log('Serveren kører på port http://localhost:' + port);
});

