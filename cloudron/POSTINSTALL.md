# Complete Your Installation

You need to set all environment variables expected by Outline for the app to work.

1. Install the [cloudron CLI](https://docs.cloudron.io/custom-apps/cli/)

    `npm install -g cloudron`

2. Download [this template script file](https://github.com/tokilabs/outline/blob/v0.56.0-cloudron/cloudron/setup-app-env.sh)
3. Follow the instructions in the file to set the variable values and save it
4. Make sure the file is executable then run it!

    ```
    S chmod +x setup-app-env.sh
    $ ./setup-app-env.sh
    ```

5. The script will use `cloudron env` to set all the environment variables

> **NOTE**
>
> If the command fails due to Cloudron not being able to contact the app
> go to the cloudron admin panel and put the app in recovery mode.
> 
> You can find that option under App config > Repair > "Enable Recovery Mode"