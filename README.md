# @neoskop/bouch

> Bouch is an CLI Tool to backup and restore CouchDB and PouchDB databases.  
> You can choose betwen JSON and BSON format and Gzip, Brotli or no compression

## Install

```sh
$ yarn global add @neoskop/bouch
$ npm install -g @neoskop/bouch
```

## Usage

### Backup

```sh
$ bouch backup http://localhost:5984/dbname
```

```sh
$ bouch backup --help
bouch backup <url>

Backup a couchdb database

Positionals:
  url  Database URL                                                   [required]

Options:
  --help            Show help                                          [boolean]
  --version         Show version number                                [boolean]
  --format, -F      File format (ignored in migrate)   [choices: "bson", "json"]
  --compress, -C    File compression (ignored in migrate)
                                                   [choices: "none", "gz", "br"]
  --quiet, -q       Supress any non error output      [boolean] [default: false]
  --file, -f        File to create
  --stdout          Output to stdout instead of file  [boolean] [default: false]
  --chunk-size, -c  Number of documents read/write at once
                                                        [number] [default: 1000]
```

### Restore

```sh
$ bouch restore backup-file.bson http://localhost:5984/dbname
```

```sh
$ bouch restore --help
bouch restore <file> <url>

Restore a backup

Positionals:
  file  Backup file                                                   [required]
  url   Database URL                                                  [required]

Options:
  --help            Show help                                          [boolean]
  --version         Show version number                                [boolean]
  --format, -F      File format (ignored in migrate)   [choices: "bson", "json"]
  --compress, -C    File compression (ignored in migrate)
                                                   [choices: "none", "gz", "br"]
  --quiet, -q       Supress any non error output      [boolean] [default: false]
  --chunk-size, -c  Number of documents read/write at once
                                                        [number] [default: 1000]
```

### Migrate

```sh
$ bouch migrate http://localhost:5984/dbname http://localhost:5984/dbname-new
```

```sh
$ bouch migrate --help
bouch migrate <from> <to>

Copy from one database to another

Positionals:
  from  From Database                                                 [required]
  to    To Database                                                   [required]

Options:
  --help            Show help                                          [boolean]
  --version         Show version number                                [boolean]
  --format, -F      File format (ignored in migrate)   [choices: "bson", "json"]
  --compress, -C    File compression (ignored in migrate)
                                                   [choices: "none", "gz", "br"]
  --quiet, -q       Supress any non error output      [boolean] [default: false]
  --chunk-size, -c  Number of documents read/write at once
                                                         [number] [default: 100]
```

## License

MIT License

Copyright (c) 2019 Neoskop GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Sponsor

[Neoskop GmbH](https://neoskop.de)