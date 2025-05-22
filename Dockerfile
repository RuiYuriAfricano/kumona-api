FROM node:18-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Gerar cliente Prisma e compilar
RUN npx prisma generate
RUN npm run build

# Remover arquivos de desenvolvimento
RUN npm prune --production

# Imagem final
FROM node:18-alpine

WORKDIR /app

# Copiar arquivos compilados e dependências
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Criar diretório para arquivos temporários
RUN mkdir -p /app/temp && chmod 777 /app/temp

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "run", "start:prod"]
