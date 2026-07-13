FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./

RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

RUN mkdir -p storage/uploads

USER appuser

EXPOSE 5000

CMD ["node", "src/index.js"]