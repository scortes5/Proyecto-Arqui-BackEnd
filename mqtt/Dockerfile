FROM node:20-alpine AS builder
WORKDIR /usr/src/mqtt
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /usr/src/mqtt
COPY --from=builder /usr/src/mqtt/node_modules ./node_modules
COPY ./src ./src
EXPOSE 1883
CMD ["node", "src/index.js"]

