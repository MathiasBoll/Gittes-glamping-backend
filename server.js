const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const server = express();
const port = 3042;

// Tillader frontend på localhost:5173 at kalde API'et
server.use(cors({ origin: 'http://localhost:5173' }));

// Gør at serveren kan læse JSON fra request body (POST/PUT)
server.use(express.json());

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
// ACTIVITIES – GET alle
// ──────────────────────────────────────────────
server.get('/activities', (req, res) => {
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
// STAYS – GET alle
// ──────────────────────────────────────────────
server.get('/stays', (req, res) => {
    res.json(stays);
});

server.listen(port, () => {
    console.log('Serveren kører på port http://localhost:' + port);
});

