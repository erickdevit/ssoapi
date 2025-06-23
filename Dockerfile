# Usar uma imagem Node.js oficial como base
FROM node:20-alpine

# Definir o diretório de trabalho no container
WORKDIR /usr/src/app

# Copiar package.json e yarn.lock (ou package-lock.json se você usar npm)
# Isso aproveita o cache de camadas do Docker, reinstalando dependências apenas se elas mudarem
COPY package.json yarn.lock ./

# Instalar as dependências do projeto
# Se você usa npm, substitua 'yarn install --frozen-lockfile' por 'npm ci'
RUN yarn install --frozen-lockfile

# Copiar o restante dos arquivos da aplicação para o diretório de trabalho
COPY . .

# Expor a porta em que a aplicação roda (o padrão é 3000, mas pode ser sobrescrito pela variável de ambiente PORT)
# O EXPOSE não publica a porta, apenas documenta qual porta o container escutará.
# A publicação real acontece no `docker run` ou `docker-compose.yml`.
EXPOSE 3000

# Variável de ambiente para a porta, caso não seja definida externamente
ENV PORT=3000

# Comando para iniciar a aplicação
CMD ["yarn", "start"]
