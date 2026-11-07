FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,id=sentinel-npm,target=/root/.npm npm ci
COPY . .
RUN npm run build
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER 1000:1000
CMD ["node", "server.js"]
