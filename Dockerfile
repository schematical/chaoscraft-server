FROM node:4.2
# replace this with your application's default port
WORKDIR /app
COPY . .
RUN npm i --unsafe-perm
EXPOSE 3000
VOLUME /content

CMD node dist/App.js