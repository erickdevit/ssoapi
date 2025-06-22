# SSÓtica API V2

API para consultar parcelas em aberto na tela de Contas a Receber do sistema SSÓtica.

## 🚀 Como rodar

1. Clone o repositório ou extraia o ZIP.
2. Instale as dependências:

```
npm install
```

3. Configure o arquivo `.env`:

```
SSOTICA_USER=seu_usuario
SSOTICA_PASS=sua_senha
PORT=3189
```

4. Inicie a API:

```
npm start
```

A API estará rodando em:

```
http://localhost:3189/api/consultar
```

## 📦 Exemplo de requisição

**POST** `http://localhost:3189/api/consultar`

Corpo da requisição:

```json
{
  "nomeCliente": "Sueli"
}
```

Resposta:

```json
{
  "success": true,
  "dados": [
    {
      "nome": "Sueli Durante da Rocha",
      "valor": "R$ 200,00",
      "parcela": "Parcela 1 de 6",
      "numeroParcela": 1,
      "totalParcelas": 6,
      "vencimento": "21/06/2025"
    }
  ]
}
```
