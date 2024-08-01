FROM node:20.11.1-alpine

WORKDIR /app

COPY ./app .

COPY ./app/src/local.config.example ./src/local.config.ts

RUN npm install

RUN npm run build

CMD npm run start:prod
