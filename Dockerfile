FROM node:10

WORKDIR /dfotose

# Bundle app source
COPY . .

# Install all dependencies
RUN npm install
RUN npm install -g gulp pm2

# Build the app
RUN gulp server:build
RUN gulp config:copy
RUN gulp client:copy
RUN gulp client:build

RUN sh setup-kerberos.sh

EXPOSE 4000
