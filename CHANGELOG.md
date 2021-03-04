# Separation changes
* Index file changed
    * exporting the component instead of just rendering the element into the page
    * Moved all effects into `useEffect` of the resulting component
    * Wrapped all variables with `useMemo`
* Stores root file - instead of creating store on import,added create function
* Replaced `setImmediate` with own polyfill, because babel corejs configuration
is built-in into gatsby and cannot be accessed    
* Added two dynamic variables to webpack - packages version
* Changed environment variables, mostly from `env.*` to `process.env.GATSBY_*`
only some variables like `DEPLOYMENT`, `NODE_ENV` are left as-is
* Changed `ApiClient` 
    * include `GATSBY_OUTLINE_BACKEND_URL`as base path for requests
    * Moved CF_AUTHORIZATION to function where it's used to prevent cookie access on server
* Changed `SocketProvider` file to replace `window.location.origin`
with `GATSBY_OUTLINE_BACKEND_URL`
