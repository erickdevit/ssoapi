const express = require('express');
const SsoticaScraper = require('./ssoticaService'); // Renomeado para SsoticaScraper no arquivo de serviço
require('dotenv').config(); // Carrega variáveis de ambiente do .env

const app = express();
app.use(express.json()); // Middleware para parsear JSON no corpo das requisições

// Validação das variáveis de ambiente essenciais
if (!process.env.SSOTICA_USER || !process.env.SSOTICA_PASS) {
  console.error("ERRO: As variáveis de ambiente SSOTICA_USER e SSOTICA_PASS são obrigatórias.");
  process.exit(1); // Encerra a aplicação se não estiverem configuradas
}

let scraper;
try {
  scraper = new SsoticaScraper(process.env.SSOTICA_USER, process.env.SSOTICA_PASS);
} catch (error) {
  console.error("Falha ao instanciar o SsoticaScraper:", error.message);
  process.exit(1); // Encerra se houver erro na instanciação (ex: usuário/senha faltando)
}


app.get('/consultar-parcelas', async (req, res) => {
  const nome = req.query.nome;

  // Validação básica do parâmetro 'nome'
  if (!nome || typeof nome !== 'string' || nome.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'O parâmetro "nome" é obrigatório e não pode ser vazio.',
      code: 'BAD_REQUEST_NOME_PARAM_MISSING_OR_EMPTY'
    });
  }

  // Sanitização simples (remover espaços excessivos)
  const nomeSanitizado = nome.trim();

  console.log(`[API] Recebida requisição para consultar parcelas do cliente: "${nomeSanitizado}"`);

  try {
    const dados = await scraper.buscarParcelas(nomeSanitizado);

    if (dados.length === 0) {
      console.log(`[API] Nenhuma parcela encontrada para "${nomeSanitizado}"`);
      return res.status(404).json({
        success: true, // A requisição foi bem sucedida, mas não encontrou dados
        message: 'Nenhuma parcela encontrada para o nome fornecido com os critérios aplicados.',
        code: 'NOT_FOUND_NO_INSTALLMENTS',
        dados: []
      });
    }

    console.log(`[API] ${dados.length} parcela(s) encontrada(s) para "${nomeSanitizado}"`);
    res.json({ success: true, dados });

  } catch (error) {
    console.error(`[API] Erro ao consultar o sistema SSÓtica para "${nomeSanitizado}":`, error);

    // Mapeamento de erros do serviço para respostas HTTP mais específicas
    if (error.name === 'SsoticaServiceError') {
      switch (error.type) {
        case 'ConfigurationError':
        case 'LoginError.CSRFTokenMissing':
        case 'LoginError.RequestFailed':
          return res.status(503).json({ // Service Unavailable
            success: false,
            error: 'Serviço temporariamente indisponível devido a problemas de configuração ou login no sistema externo.',
            code: 'SERVICE_UNAVAILABLE_SSOTICA_AUTH_FAILURE',
            details: error.message
          });
        case 'InvalidInputError':
          return res.status(400).json({ // Bad Request (embora já validado antes)
            success: false,
            error: 'Entrada inválida para o serviço de busca.',
            code: 'BAD_REQUEST_SERVICE_INPUT_INVALID',
            details: error.message
          });
        case 'SearchError':
          return res.status(502).json({ // Bad Gateway
            success: false,
            error: 'Falha ao buscar dados no sistema externo após login.',
            code: 'BAD_GATEWAY_SSOTICA_SEARCH_FAILURE',
            details: error.message
          });
        default:
          return res.status(500).json({
            success: false,
            error: 'Erro interno no serviço de consulta ao SSÓtica.',
            code: 'INTERNAL_SERVICE_ERROR_SSOTICA',
            details: error.message
          });
      }
    }

    // Erro genérico do servidor
    res.status(500).json({
      success: false,
      error: 'Falha interna ao processar a requisição.',
      code: 'INTERNAL_SERVER_ERROR_GENERIC',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API SSÓtica Consulta rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}/consultar-parcelas?nome=SEU_CLIENTE`);
});