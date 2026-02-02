


openssl genpkey -algorithm RSA -out certs/server.key
openssl req -new -key certs/server.key -out certs/server.csr
openssl x509 -req -in certs/server.csr -signkey certs/server.key -out certs/server.cert



[PWA Manifest Generator](https://awesometools.app/pwa-manifest-generator)


StandardJS config example:

  "standard": {
    // Tell StandardJS which environments to support
    "env": [
      "browser",
      "node"
    ],
    // Optional: add global variables if needed
    "globals": [
      "CustomEvent",
      "fetch"
    ],
    // Optional: if you want to include or ignore files
    "ignore": [
      "dist/",
      "node_modules/"
    ]
  }