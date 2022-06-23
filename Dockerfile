FROM node:alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=prod
COPY . .
EXPOSE 8181
CMD [ "node", "bin/www" ]

# docker build --rm -f "Dockerfile" -t web-for-testing:latest .
# docker run -d --name web-for-testing -p 8181:8181 web-for-testing