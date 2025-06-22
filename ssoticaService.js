const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const SSOTICA_LOGIN_URL = 'https://app.ssotica.com.br/login';
const SSOTICA_CONSULTA_URL = 'https://app.ssotica.com.br/financeiro/contas-a-receber/LwlRRM/listar';

const SELECTORS = {
  csrfToken: 'input[name="_token"]',
  rows: '.row',
  nome: '.cliente-nome a',
  valor: '.valor-conta-a-receber',
  parcelaInfo: '.info-parcela',
  vencimentoIconParent: '.fa-clock-o',
};

class SsoticaScraper {
  constructor(user, pass) {
    this.user = user;
    this.pass = pass;
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      timeout: 20000,
    }));
    this.csrfToken = null;
    this.isLoggedIn = false;
  }

  async login() {
    if (this.isLoggedIn) return;

    try {
      const loginPage = await this.client.get(SSOTICA_LOGIN_URL);
      const $ = cheerio.load(loginPage.data);
      this.csrfToken = $(SELECTORS.csrfToken).val();

      if (!this.csrfToken) {
        throw new Error('Token CSRF não encontrado na página de login.');
      }

      const form = new URLSearchParams({
        _token: this.csrfToken,
        login: this.user,
        password: this.pass,
      });

      await this.client.post(SSOTICA_LOGIN_URL, form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      this.isLoggedIn = true;
    } catch (error) {
      throw new Error(`Falha no login SSÓtica: ${error.message}`);
    }
  }

  async buscarParcelas(nomeBusca) {
    try {
      await this.login();

      const payload = new URLSearchParams({
        _token: this.csrfToken,
        clearFilter: '0',
        orderBy_Parcelamento: 'VENCIMENTO',
        ascDesc_Parcelamento: 'asc',
        empresa_Parcelamento: 'LwlRRM',
        nossoNumero_Parcelamento: '',
        codigoDeBarras_Parcelamento: '',
        searchTermSelect_Parcelamento: 'nome_apelido',
        searchTerm_Parcelamento: nomeBusca,
        'situacao_Parcelamento[]': 'AP',
      });

      const response = await this.client.post(SSOTICA_CONSULTA_URL, payload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const $ = cheerio.load(response.data);
      const elementos = $(SELECTORS.rows);
      const dados = elementos.map((i, el) => {
        const nome = $(el).find(SELECTORS.nome).text().trim() || '';
        const valor = $(el).find(SELECTORS.valor).text().trim() || '';
        const parcelaTexto = $(el).find(SELECTORS.parcelaInfo).text().trim();
        const parcelaMatch = parcelaTexto.match(/Parcela\s(\d+)\sde\s(\d+)/);
        const numeroParcela = parcelaMatch ? parseInt(parcelaMatch[1], 10) : null;
        const totalParcelas = parcelaMatch ? parseInt(parcelaMatch[2], 10) : null;
        const parcelaFormatada = parcelaMatch ? `Parcela ${numeroParcela} de ${totalParcelas}` : '';
        const vencimento = $(el).find(SELECTORS.vencimentoIconParent).parent().text().trim() || '';

        return {
          nome,
          valor,
          parcela: parcelaFormatada,
          numeroParcela,
          totalParcelas,
          vencimento,
        };
      }).get();

      const filtrado = dados.filter(item =>
        item.nome.toLowerCase().includes(nomeBusca.toLowerCase()) &&
        item.numeroParcela >= 1 && item.numeroParcela <= 6
      );

      const dadosUnicos = filtrado.filter((item, index, self) =>
        index === self.findIndex(t => t.nome === item.nome && t.numeroParcela === item.numeroParcela)
      );

      return dadosUnicos;

    } catch (error) {
      throw new Error(`Erro ao buscar parcelas: ${error.message}`);
    }
  }
}

module.exports = SsoticaScraper;