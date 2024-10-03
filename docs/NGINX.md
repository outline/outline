# Running outline in subfolder
Not every use-case has the luxury of having a dedicated subdomain for outline.
This example shows how to set up a server at `https://domain.tld/wiki`

```bash
cd /srv/

git clone git@github.com:outline/outline.git 
# or
git clone git@github.com:TimRepke/outline.git

cd outline
yarn install --frozen-lockfile
export NODE_ENV=production
yarn build
yarn sequelize db:create --env=production-ssl-disabled
yarn sequelize db:migrate --env=production-ssl-disabled
yarn start
```

## .env file
(excerpt)
```dotenv
CDN_URL=https://domain.tld/wikistatic/
FORCE_HTTPS=false
NODE_ENV=production
URL=https://domain.tld/wiki
PORT=3000
BASENAME=/wiki
COLLABORATION_URL=https://domain.tld/wiki
```

## nginx config
```
# Proxy for outline wiki
location ^~ /wiki/static {
    index index.html;
    alias /srv/outline/build/app/;
    add_header "Service-Worker-Allowed" "/";
    add_header "Access-Control-Allow-Origin" "*";
}
location /wiki/ {
    include proxy_params;
    add_header "Service-Worker-Allowed" "/";
    add_header "Access-Control-Allow-Origin" "*";

    proxy_pass_request_headers      on;
    proxy_pass http://127.0.0.1:3000/;
}
```

## systemd config