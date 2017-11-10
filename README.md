# redisHashScan
Scans redis for hashes and identifies keys that match a regex and optionally deletes them

## usage

`redisHashScan [options]`

### options

    -V, --version                  output the version number
    --rm                           Remove matching keys
    -c, --cluster
    -r, --host [host]              host
    -p, --port [port]              port
    -k, --match [match]            hash keys regex to scan for
    -f, --fieldMatch [fieldMatch]  hash field regex to scan for
    -h, --help                     output usage information

## examples

Scan cluster for any hashes with the key `updates:*` and the field `file:*`

`redisHashScan -cr 192.168.99.100 -k updates:* -f file:*`
