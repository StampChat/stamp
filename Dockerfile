FROM node:18 AS build
COPY package.json yarn.lock .
RUN yarn
RUN echo fuck docker

# Hosting Layer
FROM nginx AS production
COPY /deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY /dist/pwa /usr/share/nginx/html
