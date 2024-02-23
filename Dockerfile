FROM node:lts-alpine as builder

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json yarn.lock ./

RUN apk add --no-cache build-base g++ python3

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

FROM node:lts-alpine

ENV NODE_ENV production
USER node

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY --from=builder /usr/src/app/ ./

EXPOSE 3000
CMD [ "yarn", "start" ]
