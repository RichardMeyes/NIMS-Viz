FROM node:lts
WORKDIR /frontend/
COPY ./ ./
RUN npm install -g @angular/cli@8.2.0
RUN npm install -f node-sass
RUN npm install
RUN npm run build

FROM nginx
COPY --from=0 /frontend/dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf

CMD nginx -g "daemon off; error_log /dev/stderr error;"
