# Installation en local

Dépendances à installer :
- node dans la bonne version, à voir selon ce que vous indiquera l'installation (NVM est une option intéressante pour avoir la bonne version de node selon les projets). Aujourd'hui  il faut node 14.15 ou node 16.10 ou node >=18.0.0.
- yarn
- docker
- postgresql

Les instructions ci-dessous vont faire tourner un outline en local de la façon suivante :

- la base de données PGSQL de votre poste (modif par rapport à l'env fourni par outline) ;
- les dépendances redis et S3 dans des conteneurs docker orchestrés par docker-compose (comme dans l'env fourni par outline) ;
- le serveur de développement outline exécuté directement sur votre poste via node et yarn (comme fourni par outline).

## Installation

```
cp .env.sample .env
```

Ensuite ouvrez le fichier .env :

- générez les clés `SECRET_KEY` et `UTILS_SECRET` comme indiqué ;
- configurez un client avec autologin dans le SSO opérateur, puis complétez les variables `OIDC_CLIENT_ID` et `OIDC_CLIENT_SECRET`.

Ouvrez une console PostgreSQL : 

```
psql
```

Créez-y les utilisateurs et les bases de données : 

```
CREATE USER outline_team PASSWORD 'outline_pwd';
CREATE DATABASE outline_db OWNER outline_team;
CREATE DATABASE outline_db_test OWNER outline_team;
ALTER USER outline_team CREATEDB;
```

Lancez ensuite l'app :

```
make up
```

Suivez ensuite les indications laissées par les messages d'erreur.

Vous aurez peut-être besoin de changer de version de nodeJS (`nvm` conseillé) pour satisfaire les dépendances, et de réinstaller yarn après avoir changé de version.

> Error response from daemon: Ports are not available: exposing port TCP 127.0.0.1:5432 -> 0.0.0.0:0: listen tcp 127.0.0.1:5432: bind: address already in use
