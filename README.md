simple tool for generating VOC-styled dataset ( labels + images ).

1. deploy server
   - install go
      - `wget https://dl.google.com/go/go1.13.8.linux-amd64.tar.gz`
      - `tar -C /usr/local -xzf go1.13.8.linux-amd64.tar.gz`
      - add go to your path by for example adding this to your ~/.bashrc
          - `PATH=$PATH:/usr/local/go/bin`
   - get dependencies:
      - `go get github.com/dgrijalva/jwt-go`
      - `go get github.com/valyala/fasthttp`
   - `cd server`
   - `cp conf.schema main.conf`
   - fill in the blanks ( key , login, password, dataset path etc... )
   - `bash build.sh`
   - `cd bin && ./api`

2. run client
   - `cd client`
   - `cp src/config.js.1 src/config.js`  # and fill default api path.
   - `npm install`
   - `npm start` # for dev 
      or 
     `npm run build` # and serve files statically.

- load image directory and start labelling.