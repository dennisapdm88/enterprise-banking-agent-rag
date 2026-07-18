FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json tsconfig.json ./
RUN npm install

FROM deps AS builder
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev
COPY --from=builder /app/dist ./dist
RUN addgroup -S app && adduser -S app -G app
USER app
CMD ["node", "dist/index.js"]