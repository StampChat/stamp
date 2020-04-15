echo 'Generating Proof-of-Payment protobuffers...'
../../node_modules/protoc/protoc/bin/protoc --proto_path=./proto --js_out=import_style=commonjs,binary:. ./proto/*.proto