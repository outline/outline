FROM gitpod/workspace-postgres
                    
USER gitpod

## Install Nodejs 13.x
RUN curl https://gitlab.com/MadeByThePinsTeam-DevLabs/bash-scripts-temps/-/raw/master/templates/nodejs/deb_install_13x.sh | bash -