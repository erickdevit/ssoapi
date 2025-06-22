const { buscarParcelas } = require('../services/ssoticaService');

const consultarParcelas = async (req, res) => {
    const { nomeCliente } = req.body;

    if (!nomeCliente) {
        return res.status(400).json({ success: false, message: 'O campo nomeCliente é obrigatório.' });
    }

    try {
        const dados = await buscarParcelas(nomeCliente);
        res.json({ success: true, dados });
    } catch (error) {
        console.error('Erro na consulta:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao consultar as parcelas',
            error: error.message,
        });
    }
};

module.exports = { consultarParcelas };
