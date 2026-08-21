FROM node:22-bookworm-slim

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/src ./server/src
COPY client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
CMD ["node", "server/src/server.js"]
