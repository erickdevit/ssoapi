# API de Consulta de Parcelas SSÓtica

## Visão Geral

Esta API fornece um endpoint para consultar parcelas financeiras em aberto de clientes no sistema SSÓtica. Ela utiliza web scraping para realizar o login no sistema, buscar as informações e retorná-las em formato JSON.

O foco principal é permitir a integração dessa consulta com outros sistemas, automatizando a verificação de pendências financeiras de clientes específicos, filtrando pelas primeiras 6 parcelas.

## Configuração

Antes de executar a API, é necessário configurar as credenciais de acesso ao sistema SSÓtica. Crie um arquivo chamado `.env` na raiz do projeto com o seguinte conteúdo:

```ini
SSOTICA_USER=seu_usuario_ssotica
SSOTICA_PASS=sua_senha_ssotica
PORT=3000 # Opcional, define a porta da API (padrão: 3000)
```

Substitua `seu_usuario_ssotica` e `sua_senha_ssotica` pelas suas credenciais reais.

## Como Executar

1.  **Instale as dependências:**
    Certifique-se de ter o Node.js e o npm (ou Yarn) instalados.
    ```bash
    npm install
    ```
    ou
    ```bash
    yarn install
    ```

2.  **Inicie o servidor:**
    ```bash
    npm start
    ```
    ou
    ```bash
    yarn start
    ```

    O servidor será iniciado na porta especificada na variável `PORT` (padrão 3000). Você verá uma mensagem no console indicando que a API está rodando.

## Endpoints da API

### `GET /consultar-parcelas`

Este endpoint consulta as parcelas em aberto de um cliente no sistema SSÓtica.

**Parâmetros de Query:**

*   `nome` (string, obrigatório): O nome (ou parte do nome) do cliente a ser consultado. A busca não é case-sensitive.

**Exemplo de Requisição:**

Usando `curl`:

```bash
curl "http://localhost:3000/consultar-parcelas?nome=Nome%20Do%20Cliente"
```

Ou acessando diretamente no navegador:

`http://localhost:3000/consultar-parcelas?nome=Nome Do Cliente`

**Exemplo de Resposta de Sucesso (200 OK):**

```json
{
  "success": true,
  "dados": [
    {
      "nome": "Nome Do Cliente Exemplo",
      "valor": "R$ 150,00",
      "parcela": "Parcela 1 de 5",
      "numeroParcela": 1,
      "totalParcelas": 5,
      "vencimento": "10/07/2024"
    },
    {
      "nome": "Nome Do Cliente Exemplo",
      "valor": "R$ 150,00",
      "parcela": "Parcela 2 de 5",
      "numeroParcela": 2,
      "totalParcelas": 5,
      "vencimento": "10/08/2024"
    }
    // ... outras parcelas (até a 6ª, se existirem)
  ]
}
```

**Exemplo de Resposta (404 Not Found - Nenhuma parcela encontrada):**

Se o cliente for encontrado mas não tiver parcelas que correspondam aos critérios (em aberto, entre as parcelas 1 e 6).

```json
{
  "success": true,
  "message": "Nenhuma parcela encontrada para o nome fornecido com os critérios aplicados.",
  "code": "NOT_FOUND_NO_INSTALLMENTS",
  "dados": []
}
```

**Exemplos de Respostas de Erro:**

*   **400 Bad Request (Parâmetro `nome` ausente):**
    ```json
    {
      "success": false,
      "error": "O parâmetro \"nome\" é obrigatório e não pode ser vazio.",
      "code": "BAD_REQUEST_NOME_PARAM_MISSING_OR_EMPTY"
    }
    ```

*   **503 Service Unavailable (Falha no login com o SSÓtica):**
    ```json
    {
      "success": false,
      "error": "Serviço temporariamente indisponível devido a problemas de configuração ou login no sistema externo.",
      "code": "SERVICE_UNAVAILABLE_SSOTICA_AUTH_FAILURE",
      "details": "Falha no login SSÓtica: Token CSRF não encontrado. A estrutura da página de login pode ter mudado."
    }
    ```

*   **502 Bad Gateway (Falha na busca de dados no SSÓtica após login):**
    ```json
    {
      "success": false,
      "error": "Falha ao buscar dados no sistema externo após login.",
      "code": "BAD_GATEWAY_SSOTICA_SEARCH_FAILURE",
      "details": "Erro ao buscar parcelas para \"Nome Do Cliente\": Algum problema na extração dos dados."
    }
    ```

*   **500 Internal Server Error (Erro genérico):**
    ```json
    {
      "success": false,
      "error": "Falha interna ao processar a requisição.",
      "code": "INTERNAL_SERVER_ERROR_GENERIC",
      "details": "Mensagem específica do erro que ocorreu."
    }
    ```

## Casos de Uso

1.  **Integração com Sistemas de CRM/ERP:**
    Automatizar a consulta da situação financeira de um cliente diretamente de um sistema de gestão, exibindo pendências (primeiras 6 parcelas) antes de uma nova venda ou atendimento.

2.  **Notificações Automatizadas:**
    Utilizar a API como parte de um sistema maior para identificar clientes com parcelas próximas ao vencimento (dentro das 6 primeiras) e disparar lembretes.

3.  **Dashboard Financeiro Simplificado:**
    Alimentar um painel de controle que exibe rapidamente clientes com pendências financeiras iniciais, facilitando a ação da equipe de cobrança.

4.  **Validação Rápida de Crédito (Simplificada):**
    Em cenários onde uma análise de crédito completa não é necessária, a API pode fornecer um indicativo rápido se o cliente possui parcelas iniciais em aberto.

## Detalhes da Implementação

*   **Web Scraping:** A API utiliza as bibliotecas `axios` e `cheerio` para interagir com o site do SSÓtica como se fosse um navegador. Ela primeiro realiza o login para obter um cookie de sessão e um token CSRF, e depois submete um formulário de busca para listar as parcelas.
*   **Gerenciamento de Sessão:** `axios-cookiejar-support` e `tough-cookie` são usados para manter a sessão de login ativa entre as requisições.
*   **Filtragem Específica:** Após obter a lista de todas as parcelas em aberto do cliente, a API filtra para retornar apenas as parcelas de número 1 a 6.
*   **Variáveis de Ambiente:** As credenciais e a porta são gerenciadas via arquivo `.env` para segurança e flexibilidade.

**Importante:** Como esta API depende da estrutura HTML do site SSÓtica, quaisquer alterações significativas no layout ou nos seletores CSS do site podem quebrar a funcionalidade de scraping. Manutenção e atualizações podem ser necessárias caso o site alvo seja modificado.Tool output for `create_file_with_block`:
