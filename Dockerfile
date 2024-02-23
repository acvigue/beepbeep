FROM node:lts-slim as builder

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

FROM node:lts-slim as runner

ENV NODE_ENV production

# Create app directory
WORKDIR /usr/src/app

RUN npx playwright install --with-deps webkit

USER node

# Install app dependencies
COPY --from=builder /usr/src/app/ ./

EXPOSE 3000
CMD [ "yarn", "start" ]