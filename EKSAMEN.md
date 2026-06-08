# Gittes Glamping Backoffice — Eksamensforberedelse

> Svar baseret på vores egen kode. Omskriv med dine egne ord og øv dig i at forklare mundtligt.

---

## React-side: `/eksamen` (til præsentation)

Siden oprettes i `glamping-main` som en ny route: `http://localhost:5173/eksamen`

### Fil der skal oprettes
```
src/pages/Eksamen.jsx
```

### Route der skal tilføjes i `App.jsx` (eller router-filen)
```jsx
<Route path="/eksamen" element={<Eksamen />} />
```

### Hvordan siden skal se ud

- **Mørk baggrund** — samme mørkegrønne tema som resten af Gittes Glamping (`#1a2e1a` eller lignende)
- **Logo/titel øverst** — "Gittes Glamping — Eksamen 2026"
- **8 kort (cards)** — ét kort per spørgsmål, stablet under hinanden (eller 2-kolonne grid på desktop)
- **Hvert kort indeholder:**
  - Spørgsmålsnummer (fx `01`) i stor lys tekst
  - Spørgsmålets titel som overskrift
  - Svar-tekst (kort forklaring med egne ord)
  - Et kode-eksempel i en `<pre><code>` blok med mørk bagggrund og lys tekst
  - Sektion "Typiske fejl" med bullets
- **Accordion / klik-for-at-åbne** — hvert kort er lukket som standard, klik åbner det. Det gør præsentationen nemmere (vis ét spørgsmål ad gangen)
- **Fremhævet tekst** med `<strong>` / fed skrift på nøgleord (frontend, backend, API, async, await osv.)
- **Navigationsbar** med links til alle 8 spørgsmål (smooth scroll eller accordion-nav i venstre side)
- **Ingen login krævet** — siden er åben uden auth

### Farver og stil (match glamping-temaet)
```
Baggrund:        #1a2e1a  (mørk skovgrøn)
Kort baggrund:   #2a3f2a  (lidt lysere grøn)
Tekst:           #f5f0e8  (varm hvid/creme)
Accentfarve:     #c8a96e  (guld/beige — samme som glamping branding)
Kode-blokke:     #111  baggrund, #a8ff78 grøn tekst
Spørgsmålsnr:    #c8a96e  stor og fed
```

### Komponenter der skal laves
```
src/pages/Eksamen.jsx         → hovedsiden med alle 8 spørgsmål
src/components/EksamenCard.jsx → genbrugelig kortkomponent
```

### Props til `EksamenCard`
```jsx
<EksamenCard
  number="01"
  title="Hvad er frontend, backend, API og database?"
  answer="Frontend er det brugeren ser..."
  codeExample={`Frontend (React) → POST /activity → activityHandler.js → MongoDB`}
  errors={['Tro at frontend og backend er det samme', 'Glemme at starte backenden']}
/>
```

### Rækkefølge på kortene (samme som PDF)
1. Hvad er frontend, backend, API og database?
2. Hvad er Postman, og hvordan bruger vi det?
3. Hvad er MongoDB, og hvordan bruger vi det?
4. Hvad sker der, når man opretter en aktivitet?
5. Hvad sker der, når man opdaterer en aktivitet?
6. Hvad betyder CRUD, GET, POST, PUT og DELETE?
7. Hvorfor bruger vi async/await og try/catch?
8. Hvordan sender komponenter data og handlinger mellem hinanden?

---

## Hvad er frontend, backend, API og database?

**Kort forklaring:**
- **Frontend** er det brugeren ser og klikker på — React-koden i `glamping-main`
- **Backend** er serveren der modtager requests og taler med databasen — Express-koden i `Gittes-glamping-backend`
- **API** er "kontrakten" imellem dem — de URL'er frontenden må kalde
- **Database** er MongoDB, hvor data rent faktisk gemmes og hentes

**Eksempel fra projektet:**
```
Frontend (React)          API-kald              Backend (Express)        Database
TabActiviteter.jsx  →  POST /activity  →  activityHandler.js  →  MongoDB (Activity)
```

Frontend kører på `http://localhost:5173`  
Backend kører på `http://localhost:3042`

**Typiske fejl:**
- Tro at frontend og backend er det samme — de kører på to forskellige porte
- Glemme at starte backenden inden frontenden prøver at hente data

---

## Hvad er Postman, og hvordan bruger vi det?

**Kort forklaring:**
Postman er et værktøj til at sende HTTP-requests direkte til backenden uden at have frontenden kørende. Det bruges til at teste om endpoints virker korrekt.

**Eksempel — test af POST /activities:**
```
URL:    POST http://localhost:3042/activities
Headers: Content-Type: application/json
Body (JSON):
{
  "title": "Kajaktur",
  "date": "Lørdage",
  "time": "10.00-12.00",
  "description": "En dejlig tur på vandet",
  "image": "https://example.com/kajak.jpg"
}
Forventet svar: 201 Created
```

**Vores endpoints at teste i Postman:**
```
GET    http://localhost:3042/activities         → hent alle
POST   http://localhost:3042/activities         → opret ny
PUT    http://localhost:3042/activities/:id     → opdater
DELETE http://localhost:3042/activities/:id     → slet

GET    http://localhost:3042/stays
POST   http://localhost:3042/stays
PUT    http://localhost:3042/stays/:id
DELETE http://localhost:3042/stays/:id

GET    http://localhost:3042/reviews
POST   http://localhost:3042/reviews
PUT    http://localhost:3042/reviews/:id
DELETE http://localhost:3042/reviews/:id
```

**Typiske fejl:**
- Glemme `Content-Type: application/json` i Headers ved POST/PUT
- Kalde en forkert URL og få 404 tilbage

---

## Hvad er MongoDB, og hvordan bruger vi det?

**Kort forklaring:**
MongoDB er en database der gemmer data som JSON-lignende dokumenter i stedet for tabeller som i SQL. Vi bruger **Mongoose** til at tale med den fra Node.js — Mongoose giver os modeller og schemas.

**Eksempel — `models/Activity.js`:**
```js
const ActivitySchema = new mongoose.Schema(
    {
        title:       { type: String, required: true },
        date:        { type: String, required: true },
        time:        { type: String, required: true },
        description: { type: String, required: true },
        image:       { type: String, required: true },
        isActive:    { type: Boolean, default: true },
        sortOrder:   { type: Number,  default: 0 },
    },
    { timestamps: { createdAt: 'created', updatedAt: false } }
);

module.exports = mongoose.model('Activity', ActivitySchema);
```

Forbindelsen oprettes i `database.js` med `mongoose.connect(process.env.MONGO_URI)`.

**Typiske fejl:**
- `MONGO_URI` ikke sat i `.env` → `MongooseError: connection failed`
- Sende data der ikke matcher schema → Mongoose validering fejler og giver 500

---

## Hvad sker der, når man opretter en aktivitet?

**Kort forklaring:**
Der sker 6 trin fra brugeren klikker "Tilføj aktivitet" til data ligger i MongoDB.

**Flowet trin for trin:**

```
1. Brugeren udfylder formularen i TabActiviteter.jsx og klikker submit

2. handleSubmit() i TabActiviteter.jsx kører:
   await createActivity(form)

3. createActivity() i activityAdminService.js sender:
   POST /activity  med JSON body { title, date, time, description, image }

4. activityRoutes.js matcher ruten og kalder createActivity() i activityHandler.js

5. activityHandler.js validerer felter og gemmer i MongoDB:
   await Activity.create({ title, date, time, description, image, isActive: true })

6. Backend svarer 201 Created med det nye objekt
   Frontend kalder loadActivities() → listen opdateres automatisk
```

**Relevant kode — `handlers/activityHandler.js`:**
```js
async function createActivity(req, res) {
    try {
        const { title, date, time, description, image } = req.body;
        if (!title || !date || !time || !description || !image) {
            return res.status(400).json({ error: 'title, date, time, description og image er påkrævet' });
        }
        const activity = await Activity.create({
            title, date, time, description, image,
            isActive: true,
            sortOrder: req.body.sortOrder || 0,
        });
        res.status(201).json(activity);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
```

**Typiske fejl:**
- Et required felt mangler → `400 Bad Request`
- Backend ikke kørende → frontend viser fejl

---

## Hvad sker der, når man opdaterer en aktivitet?

**Kort forklaring:**
Næsten det samme som oprettelse, men med `PUT` i stedet for `POST`, og URL'en indeholder aktivitetens `_id` fra MongoDB.

**Relevant kode — `handlers/activityHandler.js`:**
```js
async function updateActivity(req, res) {
    try {
        const activity = await Activity.findByIdAndUpdate(
            req.params.id,                        // id fra URL: /activity/abc123
            req.body,                             // de nye værdier fra frontend
            { new: true, runValidators: true }    // returner det opdaterede objekt
        );
        if (!activity) return res.status(404).json({ error: 'Aktivitet ikke fundet' });
        res.json(activity);
    } catch {
        res.status(404).json({ error: 'Aktivitet ikke fundet' });
    }
}
```

`{ new: true }` betyder vi får det *opdaterede* objekt tilbage, ikke det gamle.  
`runValidators: true` betyder Mongoose tjekker at data stadig matcher schema.

**Typiske fejl:**
- Sende et ugyldigt `_id` → `404 Not Found`
- Glemme `{ new: true }` → man får det gamle objekt tilbage og tror intet skete

---

## Hvad betyder CRUD, GET, POST, PUT og DELETE?

**Kort forklaring:**
CRUD er de 4 grundlæggende database-operationer. HTTP-metoderne mapper direkte til dem.

| CRUD | HTTP | Hvad det gør | Eksempel fra projektet |
|---|---|---|---|
| **C**reate | POST | Opretter nyt dokument | `POST /activity` |
| **R**ead | GET | Henter data | `GET /activities` |
| **U**pdate | PUT | Opdaterer eksisterende | `PUT /activity/:id` |
| **D**elete | DELETE | Sletter dokument | `DELETE /activity/:id` |

**Vores routes — `routes/activityRoutes.js`:**
```js
router.get('/activities',        getAllActivities);   // READ alle
router.get('/activities/:id',    getActivityById);    // READ én
router.post('/activities',       createActivity);     // CREATE
router.put('/activities/:id',    updateActivity);     // UPDATE
router.delete('/activities/:id', deleteActivity);     // DELETE
```

**Typiske fejl:**
- Bruge GET når man vil oprette — GET har ingen body, data når aldrig frem
- Bruge POST når man vil opdatere — så opretter man et nyt dokument i stedet

---

## Hvorfor bruger vi async/await og try/catch?

**Kort forklaring:**
Databasekald tager tid. `async/await` fortæller JavaScript "vent her til svaret kommer, men blokér ikke hele programmet". `try/catch` fanger fejl så serveren ikke crasher men sender en fornuftig fejlbesked tilbage.

**Eksempel fra projektet — `handlers/activityHandler.js`:**
```js
async function getAllActivities(req, res) {
    try {
        // await: vent på MongoDB svarer — uden await får man et Promise-objekt
        const activities = await Activity.find().sort({ sortOrder: 1, created: -1 });
        res.json(activities);
    } catch (err) {
        // Hvis MongoDB er nede eller svarer forkert — send 500 i stedet for at crashe
        res.status(500).json({ error: err.message });
    }
}
```

**Uden `await` ville det se sådan ud (forkert):**
```js
const activities = Activity.find(); // activities er et Promise, ikke data!
res.json(activities);               // sender {} i stedet for aktiviteter
```

**Typiske fejl:**
- Glemme `await` → får et Promise-objekt tilbage i stedet for data
- Ikke have `try/catch` → en fejl i databasekaldet crasher hele serveren

---

## Hvordan sender komponenter data og handlinger mellem hinanden?

**Kort forklaring:**
I React sendes data **ned** med props og handlinger **op** med callback-funktioner. I backoffice bruger vi service-filer til alle API-kald, og `useState` til at holde data lokalt i komponenten.

**Flowet i projektet:**
```
activityAdminService.js   →   API-kald til backend
        ↕
TabActiviteter.jsx        →   useState holder aktiviteterne lokalt
        ↕
UI (tabel + formular)     →   viser data, håndterer klik
```

**Relevant kode — `TabActiviteter.jsx`:**
```js
const [activities, setActivities] = useState([]);

// Henter fra backend og opdaterer state
const loadActivities = async () => {
    const data = await getAdminActivities(); // kalder service-filen
    setActivities(data);                     // React re-renderer tabellen
};

// Kør ved første render
useEffect(() => { loadActivities(); }, []);

// Efter sletning — hent listen igen
const handleDelete = async (activity) => {
    await deleteActivity(activity._id);
    loadActivities(); // uden dette linje viser listen stadig den slettede aktivitet
};
```

**Typiske fejl:**
- Glemme at kalde `loadActivities()` efter oprettelse/sletning → listen viser gammelt data
- Glemme `useEffect` → data hentes aldrig ved første indlæsning
