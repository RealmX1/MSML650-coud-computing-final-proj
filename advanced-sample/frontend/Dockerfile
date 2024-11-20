FROM node:16

# Create app directory and set permissions
WORKDIR /home/node/app
RUN chown -R node:node /home/node/app

# Switch to node user
USER node

# Install app dependencies
COPY --chown=node:node package*.json ./

RUN npm install
RUN npm install --only=dev
RUN npm install chokidar -D

# Bundle app source
COPY --chown=node:node . .

CMD [ "npm", "start" ]