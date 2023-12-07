FROM node:alpine
ENV NODE_ENV=production
WORKDIR /app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 8181
VOLUME [ "/app/uploads", "/app/public", "/app/data", "app/log" ]
CMD [ "node", "bin/www" ]

# docker build --rm -f "Dockerfile" -t web-for-testing:latest .
# docker run -d --name web-for-testing -p 8181:8181 web-for-testing
