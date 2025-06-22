const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

// URLs base do sistema SSÓtica
const SSOTICA_BASE_URL = 'https://app.ssotica.com.br';
const SSOTICA_LOGIN_URL = `${SSOTICA_BASE_URL}/login`;
const SSOTICA_CONSULTA_URL = `${SSOTICA_BASE_URL}/financeiro/contas-a-receber/LwlRRM/listar`; // LwlRRM parece ser um ID de empresa

// Seletores CSS para extração de dados da página HTML
const SELECTORS = {
  csrfToken: 'input[name="_token"]', // Token CSRF para segurança
  rows: '.row', // Linha que contém informações de uma parcela
  nomeCliente: '.cliente-nome a', // Nome do cliente
  valorParcela: '.valor-conta-a-receber', // Valor da parcela
  infoParcela: '.info-parcela', // Texto contendo "Parcela X de Y"
  iconeVencimento: '.fa-clock-o', // Ícone próximo à data de vencimento
};

// Constantes para configuração da busca
const DEFAULT_ORDER_BY = 'VENCIMENTO';
const DEFAULT_ORDER_DIRECTION = 'asc';
const DEFAULT_SITUACAO_PARCELA = 'AP'; // "AP" = Aberta/Pendente
const DEFAULT_EMPRESA_ID = 'LwlRRM'; // ID da empresa padrão para consulta

// Limites para filtro de número de parcelas (requisito específico)
const MIN_NUMERO_PARCELA = 1;
const MAX_NUMERO_PARCELA = 6;

class SsoticaServiceError extends Error {
  constructor(message, type = 'GenericServiceError') {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
  }
}

class SsoticaScraper {
  constructor(user, pass, requestTimeout = 20000) {
    if (!user || !pass) {
      throw new SsoticaServiceError('Usuário e senha do SSÓtica são obrigatórios.', 'ConfigurationError');
    }
    this.user = user;
    this.pass = pass;
    this.jar = new CookieJar(); // Jarra de cookies para manter a sessão
    this.client = wrapper(axios.create({ // Cliente Axios configurado
      jar: this.jar,
      withCredentials: true, // Permite o envio de cookies
      timeout: requestTimeout, // Timeout para as requisições
      headers: {
        // Simula um navegador comum para evitar bloqueios simples
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
      }
    }));
    this.csrfToken = null; // Token CSRF, obtido após o primeiro acesso
    this.isLoggedIn = false; // Flag para controlar o estado do login
  }

  /**
   * Realiza o login no sistema SSÓtica.
   * Obtém o token CSRF da página de login e o utiliza para autenticar.
   */
  async login() {
    if (this.isLoggedIn) {
      console.log('Login já realizado, pulando etapa.');
      return;
    }

    console.log('Iniciando processo de login no SSÓtica...');
    try {
      // 1. Acessar a página de login para obter o cookie XSRF-TOKEN
      console.log('Acessando página de login para obter cookies...');
      await this.client.get(SSOTICA_LOGIN_URL); // Esta chamada armazena os cookies no jar

      // 2. Extrair o XSRF-TOKEN do cookieJar
      // O tough-cookie armazena cookies de forma assíncrona, mas para getCookieStringSync, precisamos da URL.
      // Para getCookiesSync, também precisamos da URL.
      const cookies = await this.jar.getCookies(SSOTICA_LOGIN_URL);
      const xsrfCookie = cookies.find(cookie => cookie.key === 'XSRF-TOKEN');

      if (!xsrfCookie) {
        console.error('Cookie XSRF-TOKEN não encontrado após acessar a página de login.');
        throw new SsoticaServiceError('Cookie XSRF-TOKEN não encontrado. O servidor não enviou o cookie esperado.', 'LoginError.XSRFTokenMissing');
      }
      this.csrfToken = decodeURIComponent(xsrfCookie.value); // O valor do cookie pode estar URL encoded
      console.log('XSRF-TOKEN (do cookie) obtido com sucesso.');

      // 3. Preparar dados do formulário de login
      const loginFormParams = new URLSearchParams({
        _token: this.csrfToken, // Usar o token do cookie aqui
        email: this.user,
        password: this.pass,
      });
      
      console.log('Enviando formulário de login com os seguintes dados:', Object.fromEntries(loginFormParams));

      // 4. Enviar a requisição de login (POST) com o cabeçalho X-XSRF-TOKEN
      const loginPostResponse = await this.client.post(SSOTICA_LOGIN_URL, loginFormParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-XSRF-TOKEN': this.csrfToken, // Adicionar o token CSRF como cabeçalho
        },
      });

      // Validação do sucesso do login
      // Ex: verificar se foi redirecionado para o dashboard ou se o corpo da resposta indica sucesso.
      // Por enquanto, consideramos sucesso se não houver erro e o status for 2xx.
      // E crucialmente, se a URL final não for a de login (indicando redirecionamento por falha)
      // Ou se o corpo da resposta não contiver mensagens de erro comuns.
      const responseURL = loginPostResponse.request.res.responseUrl;
      const responseBody = loginPostResponse.data;

      // Log para depuração
      // console.log('Login POST Response URL:', responseURL);
      // console.log('Login POST Response Body (primeiros 500 chars):', responseBody.substring(0, 500));


      if (loginPostResponse.status >= 200 && loginPostResponse.status < 300) {
        // Verifica se fomos redirecionados de volta para a página de login ou se há mensagens de erro.
        // Essas são heurísticas e podem precisar de ajuste se o SSÓtica mudar suas respostas de erro.
        const isLoginFailedPage = responseURL.includes('/login');
        const hasErrorMessage = /usu.rio ou senha inv.lidos/i.test(responseBody) || /login inv.lido/i.test(responseBody);

        if (isLoginFailedPage || hasErrorMessage) {
          console.warn('Login no SSÓtica falhou: Usuário ou senha inválidos, ou outra condição de falha na página de login.');
          // Log do corpo da resposta pode ser útil aqui em produção, mas com cuidado para não vazar dados sensíveis.
          // console.error('Corpo da resposta da falha de login:', responseBody);
          throw new SsoticaServiceError('Usuário ou senha inválidos.', 'LoginError.InvalidCredentials');
        }

        this.isLoggedIn = true;
        console.log('Login no SSÓtica realizado com sucesso.');

      } else {
        // Se o status HTTP em si já indica um erro.
        console.warn(`Falha no POST de login. Status: ${loginPostResponse.status}`);
        throw new SsoticaServiceError(`Falha na requisição de login. Status: ${loginPostResponse.status}`, 'LoginError.RequestFailed');
      }

    } catch (error) {
      console.error('Falha detalhada no login SSÓtica:', error.message); // Log apenas da mensagem para não poluir com stacktrace completo sempre
      if (error instanceof SsoticaServiceError) throw error;
      throw new SsoticaServiceError(`Falha no login SSÓtica: ${error.message}`, 'LoginError.RequestFailed');
    }
  }

  /**
   * Extrai os dados de uma única linha de parcela do HTML.
   * @param {cheerio.CheerioAPI} $ - Instância do Cheerio para o contexto da linha.
   * @param {cheerio.Element} rowElement - O elemento da linha.
   * @returns {object|null} Objeto com dados da parcela ou null se dados essenciais não forem encontrados.
   */
  _parseParcelaRow($, rowElement) {
    const el = $(rowElement);

    const nomeCliente = el.find(SELECTORS.nomeCliente).text().trim();
    const valorParcela = el.find(SELECTORS.valorParcela).text().trim();
    const infoParcelaTexto = el.find(SELECTORS.infoParcela).text().trim();

    // Extrai "X" e "Y" de "Parcela X de Y"
    const parcelaMatch = infoParcelaTexto.match(/Parcela\s*(\d+)\s*de\s*(\d+)/i);
    const numeroParcela = parcelaMatch ? parseInt(parcelaMatch[1], 10) : null;
    const totalParcelas = parcelaMatch ? parseInt(parcelaMatch[2], 10) : null;
    const parcelaFormatada = parcelaMatch ? `Parcela ${numeroParcela} de ${totalParcelas}` : infoParcelaTexto; // Fallback para texto original

    // A data de vencimento está no texto do elemento pai do ícone de relógio.
    // Ex: <span class="text-danger"> <i class="fa fa-clock-o"></i> 01/01/2024 </span>
    // Precisamos pegar o texto do span, não apenas do ícone.
    const vencimentoTextoCompleto = el.find(SELECTORS.iconeVencimento).parent().text().trim();
    const vencimento = vencimentoTextoCompleto.replace(/[\s\S]*?(\d{2}\/\d{2}\/\d{4})[\s\S]*/, '$1').trim(); // Extrai apenas a data DD/MM/YYYY

    if (!nomeCliente || !valorParcela) {
      // Considerar inválido se não houver nome ou valor.
      console.warn('Linha de parcela ignorada por falta de nome ou valor:', el.html());
      return null;
    }

    return {
      nome: nomeCliente,
      valor: valorParcela,
      parcela: parcelaFormatada,
      numeroParcela,
      totalParcelas,
      vencimento,
    };
  }

  /**
   * Busca parcelas no sistema SSÓtica com base no nome do cliente.
   * @param {string} nomeBusca - Nome (ou parte do nome) do cliente a ser buscado.
   * @returns {Promise<Array<object>>} Uma promessa que resolve para um array de objetos de parcela.
   */
  async buscarParcelas(nomeBusca) {
    if (!nomeBusca || typeof nomeBusca !== 'string' || nomeBusca.trim() === '') {
      throw new SsoticaServiceError('O nome para busca é obrigatório.', 'InvalidInputError');
    }
    const nomeBuscaNormalizado = nomeBusca.trim().toLowerCase();

    console.log(`Iniciando busca de parcelas para: "${nomeBusca}"`);
    try {
      await this.login(); // Garante que o login foi feito

      // Payload para a requisição POST de busca de parcelas.
      // Simula os filtros aplicados na interface web do SSÓtica.
      const searchPayload = new URLSearchParams({
        _token: this.csrfToken,
        clearFilter: '0', // Indica para não limpar filtros pré-existentes (comportamento padrão da UI)
        orderBy_Parcelamento: DEFAULT_ORDER_BY,
        ascDesc_Parcelamento: DEFAULT_ORDER_DIRECTION,
        empresa_Parcelamento: DEFAULT_EMPRESA_ID, // ID da empresa
        nossoNumero_Parcelamento: '', // Campo "Nosso Número" (não utilizado na busca por nome)
        codigoDeBarras_Parcelamento: '', // Campo "Código de Barras" (não utilizado)
        searchTermSelect_Parcelamento: 'nome_apelido', // Tipo de busca: por nome/apelido
        searchTerm_Parcelamento: nomeBusca, // Termo da busca (nome do cliente)
        'situacao_Parcelamento[]': DEFAULT_SITUACAO_PARCELA, // Filtro por situação da parcela (Abertas/Pendentes)
        tipoPeriodo_Parcelamento: '', // Adicionado para exibir todas as parcelas

         });

      console.log('Payload da busca:', Object.fromEntries(searchPayload)); // Log para verificar o payload
      console.log('Enviando requisição de busca de parcelas...');
      const response = await this.client.post(SSOTICA_CONSULTA_URL, searchPayload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      console.log('Resposta da busca de parcelas recebida.');

      const $ = cheerio.load(response.data);
      const rows = $(SELECTORS.rows);
      console.log(`Encontradas ${rows.length} linhas de dados brutos na página.`);

      const parcelasExtraidas = [];
      rows.each((i, el) => {
        const parcelaData = this._parseParcelaRow($, el);
        if (parcelaData) {
          parcelasExtraidas.push(parcelaData);
        }
      });
      console.log(`Extraídas ${parcelasExtraidas.length} parcelas após parsing inicial.`);

      // Filtragem 1: Pelo nome do cliente (mais preciso, caso a busca do SSÓtica traga resultados parciais)
      // e pelo intervalo de número de parcelas (1 a 6).
      const parcelasFiltradas = parcelasExtraidas.filter(item =>
        item.nome.toLowerCase().includes(nomeBuscaNormalizado) &&
        item.numeroParcela >= MIN_NUMERO_PARCELA &&
        item.numeroParcela <= MAX_NUMERO_PARCELA
      );
      console.log(`Restaram ${parcelasFiltradas.length} parcelas após filtro por nome e número da parcela (1-6).`);

      // Filtragem 2: Remover duplicatas (baseado em nome e número da parcela)
      // Isso pode ocorrer se a mesma parcela aparecer múltiplas vezes na listagem por algum motivo.
      const parcelasUnicas = [];
      const  seen = new Set(); // Para rastrear combinações de nome + numeroParcela já vistas

      for (const item of parcelasFiltradas) {
        const key = `${item.nome}|${item.numeroParcela}`;
        if (!seen.has(key)) {
          parcelasUnicas.push(item);
          seen.add(key);
        }
      }
      console.log(`Restaram ${parcelasUnicas.length} parcelas após remoção de duplicatas.`);

      if (parcelasUnicas.length === 0) {
        console.log(`Nenhuma parcela encontrada para "${nomeBusca}" que corresponda aos critérios.`);
      }

      return parcelasUnicas;

    } catch (error) {
      console.error(`Erro detalhado ao buscar parcelas para "${nomeBusca}":`, error);
      if (error instanceof SsoticaServiceError) throw error;
      throw new SsoticaServiceError(`Erro ao buscar parcelas para "${nomeBusca}": ${error.message}`, 'SearchError');
    }
  }
}

module.exports = SsoticaScraper;
