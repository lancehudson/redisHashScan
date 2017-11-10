#!/usr/bin/env node

const program = require('commander');
const Redis = require('ioredis');

const package = require('./package.json');

program
  .version(package.version)
  .description(package.description)
  .option('--rm', 'Remove matching keys')
  .option('-c, --cluster')
  .option('-r, --host [host]', 'host', '127.0.0.1')
  .option('-p, --port [port]', 'port', '6379')
  .option('-k, --match [match]', 'hash keys regex to scan for')
  .option('-f, --fieldMatch [fieldMatch]', 'hash field regex to scan for');


program.on('--help', () => {
  console.log('  Examples:');
  console.log('');
  console.log('    $ redisHashScan -cr 192.168.99.100 -k updates:* -f file:*');
  console.log('');
});

program.parse(process.argv);

const scan = async (cluster, host, port, match, fieldMatch, remove) => {
  let redis;
  if (cluster) {
    console.log('Connecting to Cluster');
    redis = new Redis.Cluster([{port: port, host: host}]);
  } else {
    console.log('Connecting to Redis');
    redis = new Redis(port, host);
  }

  // console.log(await redis.info());

  let masters;
  if (cluster) {
    // Get Masters
    masters = redis.nodes('master');
  } else {
    masters = [redis];
  }

  const streamOpts = {};
  if (match) {
    streamOpts.match = match;
  }

  const hstreamOpts = {};
  if (fieldMatch) {
    hstreamOpts.match = fieldMatch;
  }

  // Scan all masters
  Promise.all(
    masters.map((node) => {
    const stream = node.scanStream(streamOpts);

    return new Promise( async (resolve, reject) => {
      stream.on('data', async (keys) => {
        const hashs = [];
        for (let i in keys) {
          let type = await redis.type(keys[i]);
          if (type == 'hash') {
            hashs.push(keys[i]);
          }
        }

        if (hashs.length == 0) {
          return;
        }

        await Promise.all(hashs.map((hash) => {
          const hstream = node.hscanStream(hash, hstreamOpts);
          return new Promise( async (hresolve, hreject) => {
            hstream.on('data', async ([field, value]) => {
              if (!field) {
                return
              }

              console.log(`Found ${hash} - ${field} - ${value}`);
              if (remove) {
                console.log(`Removing ${hash} - ${field}`);
                console.log(await redis.hdel(hash, field));
              }
            });

            hstream.on('error', hreject);
            hstream.on('end', hresolve);
          });
        }));
      });

      stream.on('error', reject);
      stream.on('end', resolve);
    });
  })).then(() => {
    console.log('Done');
    redis.quit();
  });

}

scan(program.cluster, program.host, program.port, program.match, program.fieldMatch);
