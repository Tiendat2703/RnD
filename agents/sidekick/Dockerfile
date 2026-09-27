FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY scripts/build-agent.mjs scripts/build-agent.mjs
COPY server ./server
COPY shared ./shared
RUN npm run agent:build && npm prune --omit=dev

FROM node:24-bookworm-slim
RUN apt-get update -qq && apt-get install --no-install-recommends -y ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist-agent ./dist-agent
USER node
EXPOSE 8081
CMD ["node", "dist-agent/agent.js", "start"]
