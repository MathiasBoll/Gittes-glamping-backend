const express = require('express');

const server = express();
const port = 3042;

//Bestemmer hvem der må tilgå serveren, og hvordan den skal håndtere det. I dette tilfælde tillader vi alle at tilgå serveren, og vi tillader at sende data i JSON format.
const cors = require('cors');
server.use(cors());

server.use(express.json());    

let activities = require('./activities.json');
let reviews = require('./reviews.json');
let stays = require('./stays.json');

server.get('/activities', (req, res) => {
    res.json(activities);
})

server.get('/reviews', (req, res) => {
    res.json(reviews);
})

server.get('/stays', (req, res) => {
    res.json(stays);
})

server.listen(port, () => {
    console.log('Serveren kører på port http://localhost:' + port);
})

