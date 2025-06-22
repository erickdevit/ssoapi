const express = require('express');
const SsoticaScraper = require('./ssoticaService');
require('dotenv').config();

const app = express();
app.use(express.json());

const scraper = new SsoticaScraper(process.env.SSOTICA_USER, process.env.SSOTICA_PASS);

app.get('/consultar-parcelas', async (req, res) => {
  const nome = req.query.nome;
  if (!nome) {
    return res.status(400).json({ error: 'O parâmetro "nome" é obrigatório.' });
  }

  try {
    const dados = await scraper.buscarParcelas(nome);
    res.json({ success: true, dados });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao consultar o sistema ssotica.', details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));