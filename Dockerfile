FROM node:6.9.1
# replace this with your application's default port
WORKDIR /app
COPY ./tsconfig.json .
COPY ./package.json .
COPY ./src ./src
COPY ./config ./config
COPY ./adam.json ./adam.json
#RUN ls -la ./node_modules/
RUN npm i --unsafe-perm
RUN npm i typescript
#RUN ls -la ./node_modules/chaoscraft-shared
RUN node ./node_modules/typescript/bin/tsc
RUN npm uninstall typescript
EXPOSE 80
VOLUME /content
ENV NODE_ENV=production

CMD node dist/App.js