FROM node:10

# Create app directory
WORKDIR /usr/src/app

COPY src ./src
COPY package*.json ./

RUN npm install

CMD [ "npm", "start" ]