# API de Consulta de Parcelas SSÓtica

## Visão Geral

Esta API fornece um endpoint para consultar parcelas financeiras de clientes no sistema SSÓtica, permitindo filtrar por diferentes situações de parcela. Ela utiliza web scraping para realizar o login no sistema, buscar as informações (em todos os períodos de data) e retorná-las em formato JSON.

O foco principal é permitir a integração dessa consulta com outros sistemas, automatizando a verificação da situação financeira de clientes específicos (filtrando pelas primeiras 6 parcelas encontradas que correspondam aos critérios).

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

## Como Executar com Docker

Com o Docker e Docker Compose instalados, você pode facilmente construir e executar a API em um ambiente containerizado.

1.  **Crie o arquivo `.env`:**
    Assim como na execução local, crie um arquivo `.env` na raiz do projeto com suas credenciais SSÓtica e, opcionalmente, a porta:
    ```ini
    SSOTICA_USER=seu_usuario_ssotica
    SSOTICA_PASS=sua_senha_ssotica
    PORT=3000 # Opcional, padrão 3000. Esta porta será usada pelo host.
    ```
    **Importante:** Certifique-se de que o arquivo `.env` esteja no seu `.gitignore` para não ser enviado ao seu repositório Git. O `.dockerignore` já está configurado para não incluir o `.env` na imagem Docker; as variáveis são injetadas em tempo de execução.

2.  **Construa e inicie o container com Docker Compose:**
    No terminal, na raiz do projeto (onde o `docker-compose.yml` está localizado), execute:
    ```bash
    docker-compose up --build
    ```
    Este comando irá construir a imagem Docker (se ainda não foi construída ou se houve alterações) e iniciar o container. Para execuções futuras, você pode usar apenas `docker-compose up`.

3.  **Acessando a API:**
    A API estará acessível em `http://localhost:<PORTA>`, onde `<PORTA>` é o valor que você definiu para `PORT` no arquivo `.env` (ou 3000 se não definido).
    Por exemplo: `http://localhost:3000/consultar-parcelas?nome=Nome%20Do%20Cliente`

4.  **Parando o container:**
    Para parar o container, pressione `CTRL+C` no terminal onde o `docker-compose up` está rodando, ou execute em outro terminal:
    ```bash
    docker-compose down
    ```

**Alternativa: Executando com comandos Docker (sem Docker Compose)**

Se preferir não usar Docker Compose:

1.  **Construa a imagem Docker:**
    No terminal, na raiz do projeto (onde o `Dockerfile` está localizado), execute:
    ```bash
    docker build -t ssotica-api .
    ```

2.  **Execute o container Docker:**
    Você precisará passar as variáveis de ambiente diretamente. Substitua `seu_usuario`, `sua_senha` e `sua_porta` pelos valores corretos:
    ```bash
    docker run -d -p <SUA_PORTA_NO_HOST>:3000 \
      -e SSOTICA_USER="seu_usuario_ssotica" \
      -e SSOTICA_PASS="sua_senha_ssotica" \
      -e PORT=3000 \
      --name ssotica-api-container \
      ssotica-api
    ```
    *   `-d`: Executa o container em modo detached (em segundo plano).
    *   `-p <SUA_PORTA_NO_HOST>:3000`: Mapeia a porta `<SUA_PORTA_NO_HOST>` do seu computador para a porta 3000 dentro do container (onde a aplicação está escutando, conforme definido pela variável `PORT` interna ou o `EXPOSE` no Dockerfile).
    *   `-e VARIAVEL="valor"`: Define as variáveis de ambiente.
    *   `--name ssotica-api-container`: Dá um nome ao container para facilitar o gerenciamento.
    *   `ssotica-api`: Nome da imagem que você construiu.

    A API estará acessível em `http://localhost:<SUA_PORTA_NO_HOST>`.

3.  **Para ver os logs do container:**
    ```bash
    docker logs ssotica-api-container
    ```

4.  **Para parar o container:**
    ```bash
    docker stop ssotica-api-container
    ```

5.  **Para remover o container:**
    ```bash
    docker rm ssotica-api-container
    ```

## Endpoints da API

### `GET /consultar-parcelas`

Este endpoint consulta as parcelas de um cliente no sistema SSÓtica, com flexibilidade para filtrar por situação. A busca de período é sempre realizada em todas as datas.

**Parâmetros de Query:**

*   `nome` (string, obrigatório): O nome (ou parte do nome) do cliente a ser consultado. A busca não é case-sensitive.
*   `situacoes` (string, opcional): Uma string com códigos de situação da parcela separados por vírgula (ex: `AP,PG,AT`).
    *   Códigos válidos: `AP` (Em aberto), `PG` (Pago), `AT` (Em atraso), `CA` (Cancelado), `RE` (Renegociado).
    *   Se omitido, o padrão é buscar apenas `AP` (Em aberto).
    *   Para buscar todas as situações, envie o parâmetro `situacoes` com um valor vazio (ex: `situacoes=`) ou com o valor especial `TODAS` (ex: `situacoes=TODAS`). A implementação no servidor deve traduzir isso para um array vazio ao chamar o serviço de busca.

**Exemplo de Requisição:**

Usando `curl`:

```bash
curl "http://localhost:3000/consultar-parcelas?nome=Nome%20Do%20Cliente"
```

Para buscar situações específicas (Em Aberto e Pago):
```bash
curl "http://localhost:3000/consultar-parcelas?nome=Nome%20Do%20Cliente&situacoes=AP,PG"
```

Para buscar todas as situações:
```bash
curl "http://localhost:3000/consultar-parcelas?nome=Nome%20Do%20Cliente&situacoes="
```
ou
```bash
curl "http://localhost:3000/consultar-parcelas?nome=Nome%20Do%20Cliente&situacoes=TODAS"
```

Ou acessando diretamente no navegador:

`http://localhost:3000/consultar-parcelas?nome=Nome Do Cliente&situacoes=AP,PG`

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
    Utilizar a API como parte de um sistema maior para identificar clientes com parcelas próximas ao vencimento (dentro das 6 primeiras, filtrando por situação 'AP' e 'AT') e disparar lembretes.

3.  **Dashboard Financeiro Abrangente:**
    Alimentar um painel de controle que exibe clientes com pendências ('AP', 'AT'), parcelas pagas recentemente ('PG'), ou renegociadas ('RE'), facilitando diferentes ações da equipe financeira.

4.  **Análise de Histórico de Pagamento (Simplificada):**
    Consultar parcelas pagas ('PG') para entender o comportamento recente de pagamento de um cliente.

5.  **Validação Rápida de Crédito (Aprimorada):**
    Verificar se o cliente possui parcelas em aberto ('AP') ou em atraso ('AT') para uma análise de crédito simplificada.

## Detalhes da Implementação

*   **Web Scraping:** A API utiliza as bibliotecas `axios` e `cheerio` para interagir com o site do SSÓtica como se fosse um navegador. Ela primeiro realiza o login para obter um cookie de sessão e um token CSRF, e depois submete um formulário de busca para listar as parcelas.
*   **Gerenciamento de Sessão:** `axios-cookiejar-support` e `tough-cookie` são usados para manter a sessão de login ativa entre as requisições.
*   **Filtragem:**
    *   **Período:** A busca sempre considera todos os períodos de data (o filtro `tipoPeriodo_Parcelamento` é enviado como vazio).
    *   **Situação:** Permite filtrar por uma ou mais situações de parcela (`AP`, `PG`, `AT`, `CA`, `RE`) ou buscar todas as situações. O padrão é `AP` (Em aberto).
    *   **Quantidade:** Após obter a lista de parcelas do cliente que correspondem aos filtros de situação e período, a API filtra para retornar apenas as parcelas de número 1 a 6.
*   **Variáveis de Ambiente:** As credenciais e a porta são gerenciadas via arquivo `.env` para segurança e flexibilidade.

**Importante:** Como esta API depende da estrutura HTML do site SSÓtica, quaisquer alterações significativas no layout ou nos seletores CSS do site podem quebrar a funcionalidade de scraping. Manutenção e atualizações podem ser necessárias caso o site alvo seja modificado.Tool output for `create_file_with_block`:
