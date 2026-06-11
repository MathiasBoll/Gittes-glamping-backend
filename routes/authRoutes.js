const express = require('express');
const router  = express.Router();
const { signIn, signInWithToken } = require('../handlers/authHandler');

router.post('/auth/signin', signIn);
router.post('/auth/token',  signInWithToken);

module.exports = router;
