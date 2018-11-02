FROM node:8.10.0

# instala python para o node-gyp utilizado pelo bunyan
RUN apt-get update && \
apt-get install -y python2.7

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "npm", "start" ]
