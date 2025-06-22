const express = require('express');
const router = express.Router();
const { consultarParcelas } = require('../controllers/ssoticaController');

router.post('/consultar', consultarParcelas);

module.exports = router;
