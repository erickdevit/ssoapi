const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const user = process.env.SSOTICA_USER;
const pass = process.env.SSOTICA_PASS;

const jar = new CookieJar();
const client = wrapper(axios.create({
    jar,
    withCredentials: true,
    timeout: 20000,
}));

async function buscarParcelas(nomeBusca) {
    const loginUrl = 'https://app.ssotica.com.br/login';
    const consultaUrl = 'https://app.ssotica.com.br/financeiro/contas-a-receber/LwlRRM/listar';

    const loginPage = await client.get(loginUrl);
    const $login = cheerio.load(loginPage.data);
    const csrfToken = $login('input[name="_token"]').val();

    if (!csrfToken) {
        throw new Error('Token CSRF não encontrado na página de login.');
    }

    await client.post(loginUrl, new URLSearchParams({
        _token: csrfToken,
        login: user,
        password: pass,
    }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const payload = new URLSearchParams({
        _token: csrfToken,
        clearFilter: '0',
        orderBy_Parcelamento: 'VENCIMENTO',
        ascDesc_Parcelamento: 'asc',
        empresa_Parcelamento: 'LwlRRM',
        nossoNumero_Parcelamento: '',
        codigoDeBarras_Parcelamento: '',
        searchTermSelect_Parcelamento: 'nome_apelido',
        searchTerm_Parcelamento: nomeBusca,
        'situacao_Parcelamento[]': 'AP'
    });

    const response = await client.post(consultaUrl, payload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const $ = cheerio.load(response.data);
    const elementos = $('.row');
    const dados = elementos.map((i, el) => {
        const nome = $(el).find('.cliente-nome a').text().trim() || '';
        const valor = $(el).find('.valor-conta-a-receber').text().trim() || '';
        const parcelaTexto = $(el).find('.info-parcela').text().trim();
        const parcelaMatch = parcelaTexto.match(/Parcela\s(\d+)\sde\s(\d+)/);
        const numeroParcela = parcelaMatch ? parseInt(parcelaMatch[1]) : null;
        const totalParcelas = parcelaMatch ? parseInt(parcelaMatch[2]) : null;
        const parcelaFormatada = parcelaMatch ? `Parcela ${numeroParcela} de ${totalParcelas}` : '';
        const vencimento = $(el).find('.fa-clock-o').parent().text().trim() || '';

        return {
            nome,
            valor,
            parcela: parcelaFormatada,
            numeroParcela,
            totalParcelas,
            vencimento
        };
    }).get();

    const filtrado = dados.filter(item => item.nome.toLowerCase().includes(nomeBusca.toLowerCase()))
        .filter(item => item.numeroParcela >= 1 && item.numeroParcela <= 6);

    const dadosUnicos = filtrado.filter(
        (item, index, self) =>
            index === self.findIndex(
                t => t.nome === item.nome && t.numeroParcela === item.numeroParcela
            )
    );

    return dadosUnicos;
}

module.exports = { buscarParcelas };
