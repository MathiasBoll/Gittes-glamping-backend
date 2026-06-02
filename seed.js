/**
 * seed.js – importer eksisterende JSON-data til MongoDB
 * Kør én gang: node seed.js
 * Springer over hvis samlingen allerede indeholder data.
 */
require('dotenv').config();
const mongoose  = require('mongoose');
const fs        = require('fs');
const path      = require('path');

const Activity  = require('./models/Activity');
const Review    = require('./models/Review');
const Stay      = require('./models/Stay');
const Message   = require('./models/Message');
const Subscriber = require('./models/Subscriber');
const Booking   = require('./models/Booking');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gittes-glamping';

function readJSON(file) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return [];
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) || [];
    } catch {
        return [];
    }
}

async function seed(Model, records, label, mapFn) {
    const count = await Model.countDocuments();
    if (count > 0) {
        console.log(`  ⏭  ${label}: ${count} poster findes allerede – springer over`);
        return;
    }
    if (!records.length) {
        console.log(`  ⏭  ${label}: ingen data i JSON-filen – springer over`);
        return;
    }
    const docs = records.map(mapFn);
    await Model.insertMany(docs, { ordered: false });
    console.log(`  ✅  ${label}: indlæste ${docs.length} poster`);
}

async function main() {
    await mongoose.connect(MONGODB_URI);
    console.log('Forbundet til MongoDB:', MONGODB_URI);

    const activities  = readJSON('activities.json');
    const reviews     = readJSON('reviews.json');
    const stays       = readJSON('stays.json');
    const messages    = readJSON('messages.json');
    const subscribers = readJSON('subscribers.json');
    const bookings    = readJSON('bookings.json');

    await seed(Activity, activities, 'Aktiviteter', (a) => ({
        title:       a.title,
        date:        a.date,
        time:        a.time || '',
        description: a.description,
        image:       a.image || '',
        isActive:    a.isActive !== false,
        sortOrder:   a.sortOrder || 0,
        created:     a.created ? new Date(a.created) : new Date(),
    }));

    await seed(Review, reviews, 'Anmeldelser', (r) => ({
        name:      r.name,
        age:       r.age || '',
        stay:      r.stay || '',
        review:    r.review,
        isVisible: r.isVisible !== false,
        created:   r.created ? new Date(r.created) : new Date(),
    }));

    await seed(Stay, stays, 'Ophold', (s) => ({
        title:             s.title,
        teaser:            s.teaser || '',
        description:       s.description || '',
        numberOfPersons:   String(s.numberOfPersons || ''),
        discountInPercent: s.discountInPercent || 0,
        price:             s.price || 0,
        includes:          Array.isArray(s.includes) ? s.includes : [],
        image:             s.image || '',
        isActive:          s.isActive !== false,
        created:           s.created ? new Date(s.created) : new Date(),
    }));

    await seed(Message, messages, 'Beskeder', (m) => ({
        name:      m.name,
        email:     m.email,
        category:  m.category || '',
        message:   m.message,
        status:    ['ny', 'læst', 'besvaret', 'arkiveret'].includes(m.status) ? m.status : 'ny',
        reply:     m.reply || '',
        repliedAt: m.repliedAt ? new Date(m.repliedAt) : undefined,
        created:   m.created ? new Date(m.created) : new Date(),
    }));

    await seed(Subscriber, subscribers, 'Abonnenter', (s) => ({
        email:        (s.email || '').toLowerCase().trim(),
        subscribedAt: s.subscribedAt ? new Date(s.subscribedAt) : new Date(),
    }));

    await seed(Booking, bookings, 'Bookinger', (b) => ({
        name:      b.name,
        email:     b.email,
        stayId:    String(b.stayId || ''),
        stayTitle: b.stayTitle || '',
        checkIn:   b.checkIn,
        checkOut:  b.checkOut,
        guests:    b.guests || 1,
        message:   b.message || '',
        status:    ['ny', 'bekræftet', 'aflyst'].includes(b.status) ? b.status : 'ny',
        created:   b.created ? new Date(b.created) : new Date(),
    }));

    await mongoose.disconnect();
    console.log('Seed færdig.');
}

main().catch((err) => {
    console.error('Seed fejlede:', err.message);
    process.exit(1);
});
