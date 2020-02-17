set -e

go build -o bin/api *.go

cd bin/

ln -sf ../main.conf main.conf
