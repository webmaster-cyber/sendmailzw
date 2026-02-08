FROM nginx:1.23.3-alpine

COPY config/nginx.conf /etc/nginx/nginx.conf
COPY config/nginx.ssl.conf /etc/nginx/nginx.ssl.conf
COPY client-next/dist/ /usr/share/nginx/html/

CMD sh -c 'if [[ -e /config/use_ssl ]] && grep -q "1" /config/use_ssl; then nginx -g "daemon off;" -c /etc/nginx/nginx.ssl.conf; else nginx -g "daemon off;" -c /etc/nginx/nginx.conf; fi'
