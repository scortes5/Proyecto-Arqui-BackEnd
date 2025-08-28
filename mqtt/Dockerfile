FROM node:20
WORKDIR /usr/src/mqtt
COPY package*.json ./
RUN npm install --production
COPY ./src ./src
EXPOSE 1883
CMD ["node", "src/index.js"]

