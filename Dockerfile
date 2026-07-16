FROM nginx:alpine

COPY prototype/dist.html /usr/share/nginx/html/index.html
COPY nginx-utf8.conf /etc/nginx/conf.d/utf8.conf

EXPOSE 80
