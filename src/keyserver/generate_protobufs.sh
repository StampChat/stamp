echo 'Generating Keyserver protobuffers...'
protoc --proto_path=./proto --js_out=import_style=commonjs,binary:. ./proto/*.proto