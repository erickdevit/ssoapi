require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes/ssoticaRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', routes);

const port = process.env.PORT || 3189;
app.listen(port, () => {
    console.log(`✅ API rodando na porta ${port}`);
});
