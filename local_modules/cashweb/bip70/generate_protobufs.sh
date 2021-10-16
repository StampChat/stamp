echo 'Generating Authorization Wrapper protobuffers...'
../../../node_modules/protoc/protoc/bin/protoc \
  --proto_path=./proto \
  --js_out=import_style=commonjs,binary:. \
  --ts_out=. \
  ./proto/*.proto