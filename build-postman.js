// Run: node build-postman.js
// Outputs: gittes-glamping.postman_collection.json

const fs = require('fs');

// ─── helpers ──────────────────────────────────────────────────────────────────

function url(path, vars = []) {
    const parts = path.replace(/^\//, '').split('/');
    return {
        raw: `{{baseUrl}}${path}`,
        host: ['{{baseUrl}}'],
        path: parts,
        ...(vars.length ? { variable: vars.map(v => ({ key: v, value: '' })) } : {}),
    };
}

function authHeader() {
    return [{ key: 'Authorization', value: 'Bearer {{token}}' }];
}

function jsonHeader() {
    return [{ key: 'Content-Type', value: 'application/json' }];
}

function jsonBody(obj) {
    return { mode: 'raw', raw: JSON.stringify(obj, null, 2) };
}

function test(scripts) {
    return [{ listen: 'test', script: { type: 'text/javascript', exec: scripts } }];
}

function saveVar(varName, path) {
    // path like 'data._id' or '_id' or 'data.token'
    const parts = path.split('.');
    const access = parts.map((p, i) => i === 0 ? `json.${p}` : `.${p}`).join('');
    return [
        `var json = pm.response.json();`,
        `if (${access}) pm.collectionVariables.set('${varName}', ${access});`,
    ];
}

function standardTests(statusCode = 200) {
    return [
        `pm.test('Status ${statusCode}', () => pm.response.to.have.status(${statusCode}));`,
        `pm.test('Response time < 1000ms', () => pm.expect(pm.response.responseTime).to.be.below(1000));`,
        `pm.test('Body is JSON', () => pm.response.to.be.json);`,
    ];
}

function hasFields(...fields) {
    return fields.map(f => `pm.test('Has field: ${f}', () => { var j = pm.response.json(); pm.expect(j).to.have.property('${f}'); });`);
}

// ─── folders ──────────────────────────────────────────────────────────────────

const auth = {
    name: 'Auth',
    description: 'Sign in and token verification. Sign In auto-saves {{token}}.',
    item: [
        {
            name: 'Sign In',
            description: 'POST /auth/signin — returns JWT. Token is auto-saved to {{token}}.',
            event: test([
                ...standardTests(200),
                `pm.test('Has token', () => { var j = pm.response.json(); pm.expect(j.data).to.have.property('token'); });`,
                `var j = pm.response.json(); if (j.data && j.data.token) pm.collectionVariables.set('token', j.data.token);`,
                `pm.test('Status is ok', () => pm.expect(pm.response.json().status).to.eql('ok'));`,
            ]),
            request: {
                method: 'POST',
                header: jsonHeader(),
                url: url('/auth/signin'),
                body: jsonBody({ email: 'admin@gittes.dk', password: 'hemmeligt' }),
            },
        },
        {
            name: 'Verify Token',
            description: 'POST /auth/token — validates existing JWT and returns user.',
            event: test([
                ...standardTests(200),
                `pm.test('Status is ok', () => pm.expect(pm.response.json().status).to.eql('ok'));`,
                ...hasFields('status', 'data'),
            ]),
            request: {
                method: 'POST',
                header: jsonHeader(),
                url: url('/auth/token'),
                body: jsonBody({ token: '{{token}}' }),
            },
        },
    ],
};

const users = {
    name: 'Users',
    description: 'User registration and management. Register auto-saves {{userId}}.',
    item: [
        {
            name: 'Register (opret bruger)',
            description: 'POST /users — public. Creates a new user. Auto-saves {{userId}}.',
            event: test([
                ...standardTests(201),
                ...hasFields('_id', 'name', 'email', 'role'),
                `var j = pm.response.json(); if (j._id) pm.collectionVariables.set('userId', j._id);`,
                `pm.test('No password in response', () => pm.expect(pm.response.json()).to.not.have.property('hashedPassword'));`,
            ]),
            request: {
                method: 'POST',
                header: jsonHeader(),
                url: url('/users'),
                body: jsonBody({ name: 'Test Bruger', email: 'test@gittes.dk', password: 'hemmeligt123', role: 'user' }),
            },
        },
        {
            name: 'Get Me',
            description: 'GET /users/me — requires JWT. Returns the logged-in user from token.',
            event: test([
                ...standardTests(200),
                ...hasFields('_id', 'email', 'name', 'role'),
            ]),
            request: {
                method: 'GET',
                header: authHeader(),
                url: url('/users/me'),
            },
        },
        {
            name: 'Get All Users (admin)',
            description: 'GET /users — admin JWT required.',
            event: test([
                ...standardTests(200),
                `pm.test('Response is array', () => pm.expect(pm.response.json()).to.be.an('array'));`,
            ]),
            request: {
                method: 'GET',
                header: authHeader(),
                url: url('/users'),
            },
        },
        {
            name: 'Get User by ID (admin)',
            description: 'GET /users/:id — admin JWT required. Uses {{userId}}.',
            event: test([
                ...standardTests(200),
                ...hasFields('_id', 'email', 'name'),
            ]),
            request: {
                method: 'GET',
                header: authHeader(),
                url: url('/users/:id', ['id']),
            },
        },
        {
            name: 'Update User',
            description: 'PUT /users/:id — JWT required (own user or admin). Uses {{userId}}.',
            event: test([
                ...standardTests(200),
                `pm.test('Name updated', () => pm.expect(pm.response.json().name).to.eql('Opdateret Navn'));`,
            ]),
            request: {
                method: 'PUT',
                header: [...authHeader(), ...jsonHeader()],
                url: url('/users/:id', ['id']),
                body: jsonBody({ name: 'Opdateret Navn' }),
            },
        },
        {
            name: 'Delete User (admin)',
            description: 'DELETE /users/:id — admin JWT required. Uses {{userId}}.',
            event: test([
                ...standardTests(200),
                `pm.test('Deleted message exists', () => pm.expect(pm.response.json()).to.have.property('message'));`,
            ]),
            request: {
                method: 'DELETE',
                header: authHeader(),
                url: url('/users/:id', ['id']),
            },
        },
    ],
};

const myList = {
    name: 'My List (favoritter)',
    description: 'Personal saved lists — all routes require JWT. Create/Update auto-saves {{myListId}}.',
    item: [
        {
            name: 'Create / Update My List',
            description: 'POST /mylists — creates list or updates existing by name. Auto-saves {{myListId}}.',
            event: test([
                ...standardTests(201),
                ...hasFields('_id', 'name', 'userId'),
                `var j = pm.response.json(); if (j._id) pm.collectionVariables.set('myListId', j._id);`,
            ]),
            request: {
                method: 'POST',
                header: [...authHeader(), ...jsonHeader()],
                url: url('/mylists'),
                body: jsonBody({ name: 'Mine favoritter', stayIds: [], activityIds: [] }),
            },
        },
        {
            name: 'Get My Lists',
            description: 'GET /mylists — returns all lists for logged-in user.',
            event: test([
                ...standardTests(200),
                `pm.test('Response is array', () => pm.expect(pm.response.json()).to.be.an('array'));`,
            ]),
            request: {
                method: 'GET',
                header: authHeader(),
                url: url('/mylists'),
            },
        },
        {
            name: 'Get My List by ID',
            description: 'GET /mylists/:id — uses {{myListId}}.',
            event: test([
                ...standardTests(200),
                ...hasFields('_id', 'name', 'userId'),
            ]),
            request: {
                method: 'GET',
                header: authHeader(),
                url: url('/mylists/:id', ['id']),
            },
        },
        {
            name: 'Delete My List',
            description: 'DELETE /mylists/:id — uses {{myListId}}.',
            event: test([
                ...standardTests(200),
                `pm.test('Deleted message exists', () => pm.expect(pm.response.json()).to.have.property('message'));`,
            ]),
            request: {
                method: 'DELETE',
                header: authHeader(),
                url: url('/mylists/:id', ['id']),
            },
        },
    ],
};

const stays = {
    name: 'Stays',
    description: 'Accommodation listings. Create auto-saves {{stayId}}.',
    item: [
        {
            name: 'Get All Stays',
            description: 'GET /stays — public.',
            event: test([
                ...standardTests(200),
                `pm.test('Response is array', () => pm.expect(pm.response.json()).to.be.an('array'));`,
            ]),
            request: { method: 'GET', url: url('/stays') },
        },
        {
            name: 'Get Stay by ID',
            description: 'GET /stays/:id — uses {{stayId}}.',
            event: test([
                ...standardTests(200),
                ...hasFields('_id', 'title', 'price', 'image'),
            ]),
            request: { method: 'GET', url: url('/stays/:id', ['id']) },
        },
        {
            name: 'Create Stay',
            description: 'POST /stays — auto-saves {{stayId}}.',
            event: test([
                ...standardTests(201),
                ...hasFields('_id', 'title', 'price', 'numberOfPersons'),
                `var j = pm.response.json(); if (j._id) pm.collectionVariables.set('stayId', j._id);`,
            ]),
            request: {
                method: 'POST',
                header: jsonHeader(),
                url: url('/stays'),
                body: jsonBody({
                    title: 'Test Glamping Telt',
                    teaser: 'Kort teaser',
                    description: 'Lang beskrivelse',
                    numberOfPersons: '2',
                    price: 1200,
                    discountInPercent: 0,
                    includes: ['Morgenmad', 'Wifi'],
                    image: '/uploads/test-stay.jpg',
                    isActive: true,
                }),
            },
        },
        {
            name: 'Update Stay',
            description: 'PUT /stays/:id — uses {{stayId}}.',
            event: test([
                ...standardTests(200),
                `pm.test('Price updated', () => pm.expect(pm.response.json().price).to.eql(1500));`,
            ]),
            request: {
                method: 'PUT',
                header: jsonHeader(),
                url: url('/stays/:id', ['id']),
                body: jsonBody({ price: 1500 }),
            },
        },
        {
            name: 'Delete Stay',
            description: 'DELETE /stays/:id — uses {{stayId}}.',
            event: test([
                ...standardTests(200),
                `pm.test('Deleted message exists', () => pm.expect(pm.response.json()).to.have.property('message'));`,
            ]),
            request: { method: 'DELETE', url: url('/stays/:id', ['id']) },
        },
    ],
};

const activities = {
    name: 'Activities',
    description: 'Activities/experiences. Create auto-saves {{activityId}}.',
    item: [
        {
            name: 'Get All Activities',
            description: 'GET /activities — public.',
            event: test([
                ...standardTests(200),
                `pm.test('Response is array', () => pm.expect(pm.response.json()).to.be.an('array'));`,
            ]),
            request: { method: 'GET', url: url('/activities') },
        },
        {
            name: 'Get Activity by ID',
            description: 'GET /activities/:id — uses {{activityId}}.',
            event: test([
                ...standardTests(200),
                ...hasFields('_id', 'title', 'date', 'time', 'description'),
            ]),
            request: { method: 'GET', url: url('/activities/:id', ['id']) },
        },
        {
            name: 'Create Activity',
            description: 'POST /activities — auto-saves {{activityId}}.',
            event: test([
                ...standardTests(201),
                ...hasFields('_id', 'title', 'date', 'time', 'description', 'image'),
                `var j = pm.response.json(); if (j._id) pm.collectionVariables.set('activityId', j._id);`,
            ]),
            request: {
                method: 'POST',
                header: jsonHeader(),
                url: url('/activities'),
                body: jsonBody({
                    title: 'Kajaktur',
                    date: '2026-07-01',
                    time: '10:00',
                    description: 'En dejlig kajaktur på fjorden',
                    image: '/uploads/kajak.jpg',
                    isActive: true,
                }),
            },
        },
        {
            name: 'Update Activity',
            description: 'PUT /activities/:id — uses {{activityId}}.',
            event: test([
                ...standardTests(200),
                `pm.test('Date updated', () => pm.expect(pm.response.json().date).to.eql('2026-08-01'));`,
            ]),
            request: {
                method: 'PUT',
                header: jsonHeader(),
                url: url('/activities/:id', ['id']),
                body: jsonBody({ date: '2026-08-01' }),
            },
        },
        {
            name: 'Delete Activity',
            description: 'DELETE /activities/:id — uses {{activityId}}.',
            event: test([
                ...standardTests(200),
                `pm.test('Deleted message exists', () => pm.expect(pm.response.json()).to.have.property('message'));`,
            ]),
            request: { method: 'DELETE', url: url('/activities/:id', ['id']) },
        },
    ],
};

const reviews = {
    name: 'Reviews',
    description: 'Guest reviews. Create auto-saves {{reviewId}}.',
    item: [
        {
            name: 'Get All Reviews (public)',
            description: 'GET /reviews — only isVisible:true.',
            event: test([
                ...standardTests(200),
                `pm.test('Response is array', () => pm.expect(pm.response.json()).to.be.an('array'));`,
                `pm.test('Only visible reviews', () => { pm.response.json().forEach(r => pm.expect(r.isVisible).to.be.true); });`,
            ]),
            request: { method: 'GET', url: url('/reviews') },
        },
        {
            name: 'Get All Reviews – admin (inkl. skjulte)',
            description: 'GET /admin/reviews — admin JWT required. Returns all including hidden.',
            event: test([
                ...standardTests(200),
                `pm.test('Response is array', () => pm.expect(pm.response.json()).to.be.an('array'));`,
            ]),
            request: { method: 'GET', header: authHeader(), url: url('/admin/reviews') },
        },
        {
            name: 'Get Review by ID',
            description: 'GET /reviews/:id — uses {{reviewId}}.',
            event: test([
                ...standardTests(200),
                ...hasFields('_id', 'name', 'review'),
            ]),
            request: { method: 'GET', url: url('/reviews/:id', ['id']) },
        },
        {
            name: 'Create Review',
            description: 'POST /reviews — public. Auto-saves {{reviewId}}.',
            event: test([
                ...standardTests(201),
                ...hasFields('_id', 'name', 'review', 'isVisible'),
                `var j = pm.response.json(); if (j._id) pm.collectionVariables.set('reviewId', j._id);`,
                `pm.test('isVisible is true by default', () => pm.expect(pm.response.json().isVisible).to.be.true);`,
            ]),
            request: {
                method: 'POST',
                header: jsonHeader(),
                url: url('/reviews'),
                body: jsonBody({ name: 'Mette Hansen', age: '42', stay: 'Test Glamping Telt', review: 'Fantastisk oplevelse!' }),
            },
        },
        {
            name: 'Update Review (skjul)',
            description: 'PUT /reviews/:id — admin JWT required. Uses {{reviewId}}.',
            event: test([
                ...standardTests(200),
                `pm.test('isVisible set to false', () => pm.expect(pm.response.json().isVisible).to.be.false);`,
            ]),
            request: {
                method: 'PUT',
                header: [...authHeader(), ...jsonHeader()],
                url: url('/reviews/:id', ['id']),
                body: jsonBody({ isVisible: false }),
            },
        },
        {
            name: 'Delete Review',
            description: 'DELETE /reviews/:id — admin JWT required. Uses {{reviewId}}.',
            event: test([
                ...standardTests(200),
                `pm.test('Deleted message exists', () => pm.expect(pm.response.json()).to.have.property('message'));`,
            ]),
            request: { method: 'DELETE', header: authHeader(), url: url('/reviews/:id', ['id']) },
        },
    ],
};

const bookings = {
    name: 'Bookings',
    description: 'Guest bookings. Create auto-saves {{bookingId}}.',
    item: [
        {
            name: 'Create Booking',
            description: 'POST /bookings — public. Auto-saves {{bookingId}}.',
            event: test([
                ...standardTests(201),
                ...hasFields('_id', 'name', 'email', 'stayId', 'checkIn', 'checkOut', 'status'),
                `var j = pm.response.json(); if (j._id) pm.collectionVariables.set('bookingId', j._id);`,
                `pm.test('Default status is ny', () => pm.expect(pm.response.json().status).to.eql('ny'));`,
            ]),
            request: {
                method: 'POST',
                header: jsonHeader(),
                url: url('/bookings'),
                body: jsonBody({
                    name: 'Lars Nielsen',
                    email: 'lars@example.dk',
                    stayId: '{{stayId}}',
                    checkIn: '2026-07-01',
                    checkOut: '2026-07-05',
                    guests: 2,
                    message: 'Vi glæder os!',
                }),
            },
        },
        {
            name: 'Get All Bookings (admin)',
            description: 'GET /admin/bookings — admin JWT required.',
            event: test([
                ...standardTests(200),
                `pm.test('Response is array', () => pm.expect(pm.response.json()).to.be.an('array'));`,
            ]),
            request: { method: 'GET', header: authHeader(), url: url('/admin/bookings') },
        },
        {
            name: 'Update Booking Status (admin)',
            description: 'PATCH /admin/bookings/:id/status — uses {{bookingId}}. Valid: ny, bekræftet, aflyst.',
            event: test([
                ...standardTests(200),
                `pm.test('Status updated', () => pm.expect(pm.response.json().status).to.eql('bekræftet'));`,
            ]),
            request: {
                method: 'PATCH',
                header: [...authHeader(), ...jsonHeader()],
                url: url('/admin/bookings/:id/status', ['id']),
                body: jsonBody({ status: 'bekræftet' }),
            },
        },
        {
            name: 'Delete Booking (admin)',
            description: 'DELETE /admin/bookings/:id — uses {{bookingId}}.',
            event: test([
                ...standardTests(200),
                `pm.test('Deleted message exists', () => pm.expect(pm.response.json()).to.have.property('message'));`,
            ]),
            request: { method: 'DELETE', header: authHeader(), url: url('/admin/bookings/:id', ['id']) },
        },
    ],
};

const messages = {
    name: 'Messages (Kontakt)',
    description: 'Contact form messages. Send auto-saves {{messageId}}.',
    item: [
        {
            name: 'Send Message',
            description: 'POST /contact — public. Auto-saves {{messageId}}.',
            event: test([
                ...standardTests(201),
                ...hasFields('_id', 'name', 'email', 'message', 'status'),
                `var j = pm.response.json(); if (j._id) pm.collectionVariables.set('messageId', j._id);`,
                `pm.test('Default status is ny', () => pm.expect(pm.response.json().status).to.eql('ny'));`,
            ]),
            request: {
                method: 'POST',
                header: jsonHeader(),
                url: url('/contact'),
                body: jsonBody({ name: 'Sofie Andersen', email: 'sofie@example.dk', category: 'Booking', message: 'Er der ledige telte i august?' }),
            },
        },
        {
            name: 'Get All Messages (admin)',
            description: 'GET /admin/messages — admin JWT required.',
            event: test([
                ...standardTests(200),
                `pm.test('Response is array', () => pm.expect(pm.response.json()).to.be.an('array'));`,
            ]),
            request: { method: 'GET', header: authHeader(), url: url('/admin/messages') },
        },
        {
            name: 'Update Message Status (admin)',
            description: 'PATCH /admin/messages/:id/status — uses {{messageId}}. Valid: ny, læst, besvaret, arkiveret.',
            event: test([
                ...standardTests(200),
                `pm.test('Status updated', () => pm.expect(pm.response.json().status).to.eql('læst'));`,
            ]),
            request: {
                method: 'PATCH',
                header: [...authHeader(), ...jsonHeader()],
                url: url('/admin/messages/:id/status', ['id']),
                body: jsonBody({ status: 'læst' }),
            },
        },
        {
            name: 'Reply to Message (admin)',
            description: 'PATCH /admin/messages/:id/reply — uses {{messageId}}.',
            event: test([
                ...standardTests(200),
                `pm.test('Reply saved', () => pm.expect(pm.response.json().reply).to.not.be.empty);`,
                `pm.test('Status is besvaret', () => pm.expect(pm.response.json().status).to.eql('besvaret'));`,
            ]),
            request: {
                method: 'PATCH',
                header: [...authHeader(), ...jsonHeader()],
                url: url('/admin/messages/:id/reply', ['id']),
                body: jsonBody({ reply: 'Hej Sofie, ja vi har ledige pladser!' }),
            },
        },
        {
            name: 'Delete Message (admin)',
            description: 'DELETE /admin/messages/:id — uses {{messageId}}.',
            event: test([
                ...standardTests(200),
                `pm.test('Deleted message exists', () => pm.expect(pm.response.json()).to.have.property('message'));`,
            ]),
            request: { method: 'DELETE', header: authHeader(), url: url('/admin/messages/:id', ['id']) },
        },
    ],
};

const subscribers = {
    name: 'Subscribers (Nyhedsbrev)',
    description: 'Newsletter signups. Subscribe auto-saves {{subscriberId}}.',
    item: [
        {
            name: 'Subscribe',
            description: 'POST /subscribers — public. Auto-saves {{subscriberId}}.',
            event: test([
                ...standardTests(201),
                ...hasFields('_id', 'email', 'subscribedAt'),
                `var j = pm.response.json(); if (j._id) pm.collectionVariables.set('subscriberId', j._id);`,
            ]),
            request: {
                method: 'POST',
                header: jsonHeader(),
                url: url('/subscribers'),
                body: jsonBody({ email: 'ny@subscriber.dk' }),
            },
        },
        {
            name: 'Get All Subscribers (admin)',
            description: 'GET /admin/subscribers — admin JWT required.',
            event: test([
                ...standardTests(200),
                `pm.test('Response is array', () => pm.expect(pm.response.json()).to.be.an('array'));`,
            ]),
            request: { method: 'GET', header: authHeader(), url: url('/admin/subscribers') },
        },
        {
            name: 'Update Subscriber (admin)',
            description: 'PATCH /admin/subscribers/:id — uses {{subscriberId}}.',
            event: test([...standardTests(200)]),
            request: {
                method: 'PATCH',
                header: [...authHeader(), ...jsonHeader()],
                url: url('/admin/subscribers/:id', ['id']),
                body: jsonBody({ isActive: false }),
            },
        },
        {
            name: 'Delete Subscriber (admin)',
            description: 'DELETE /admin/subscribers/:id — uses {{subscriberId}}.',
            event: test([
                ...standardTests(200),
                `pm.test('Deleted message exists', () => pm.expect(pm.response.json()).to.have.property('message'));`,
            ]),
            request: { method: 'DELETE', header: authHeader(), url: url('/admin/subscribers/:id', ['id']) },
        },
    ],
};

const upload = {
    name: 'Upload',
    description: 'Image file upload. Returns a URL path.',
    item: [
        {
            name: 'Upload Image',
            description: 'POST /upload — multipart/form-data, field name: image. Returns { url: "/uploads/..." }.',
            event: test([
                ...standardTests(201),
                `pm.test('Has url field', () => pm.expect(pm.response.json()).to.have.property('url'));`,
                `pm.test('URL starts with /uploads/', () => pm.expect(pm.response.json().url).to.include('/uploads/'));`,
            ]),
            request: {
                method: 'POST',
                url: url('/upload'),
                body: { mode: 'formdata', formdata: [{ key: 'image', type: 'file', src: '' }] },
            },
        },
    ],
};

const bulk = {
    name: 'Bulk Import',
    description: 'Seed multiple records in one call.',
    item: [
        {
            name: 'Bulk Import – én type',
            description: 'POST /bulk/:type — set :type to stays, activities, or reviews. Body is an array of objects.',
            event: test([...standardTests(200)]),
            request: {
                method: 'POST',
                header: jsonHeader(),
                url: url('/bulk/:type', ['type']),
                body: { mode: 'raw', raw: '[]' },
            },
        },
        {
            name: 'Bulk Import – alle typer',
            description: 'POST /bulk-all — body: { stays: [], activities: [], reviews: [] }.',
            event: test([...standardTests(200)]),
            request: {
                method: 'POST',
                header: jsonHeader(),
                url: url('/bulk-all'),
                body: jsonBody({ stays: [], activities: [], reviews: [] }),
            },
        },
    ],
};

// ─── assemble & write ─────────────────────────────────────────────────────────

const base = JSON.parse(fs.readFileSync('gittes-glamping.postman_collection.json', 'utf8'));

base.item = [auth, users, myList, stays, activities, reviews, bookings, messages, subscribers, upload, bulk];

// Convert folder descriptions to Postman format
base.item.forEach(folder => {
    folder.description = folder.description || '';
    folder.item.forEach(req => {
        req.description = req.description || '';
        // wrap url strings that slipped through
        if (typeof req.request.url === 'string') {
            req.request.url = { raw: req.request.url, host: ['{{baseUrl}}'], path: req.request.url.replace('{{baseUrl}}/', '').split('/') };
        }
    });
});

fs.writeFileSync('gittes-glamping.postman_collection.json', JSON.stringify(base, null, 2));
console.log('Collection written — folders:', base.item.length, '— requests:', base.item.reduce((n, f) => n + f.item.length, 0));
