FROM node:24-alpine
WORKDIR /app
COPY server.mjs artists.mjs covers.mjs ./
COPY public ./public
EXPOSE 3000
CMD ["node", "server.mjs"]
