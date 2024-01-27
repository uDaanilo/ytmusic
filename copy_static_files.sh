#! /bin/sh

srcDir=$(pwd)/src/static
distDir=$(pwd)/dist/static

find "$srcDir" -type f -not -name "*.ts" | while read -r file; do
  dir=$(dirname "${file/$srcDir/$distDir}")
  mkdir -p "$dir"
  cp "$file" "$dir"
done