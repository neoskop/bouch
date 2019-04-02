import fs from 'fs-extra';
import ProgressBar from 'progress';

import { Backup } from './backup';
import { Restore } from './restore';
import { JsonSerializer } from './serializers/json-serializer';
import { BsonSerializer } from './serializers/bson-serializer';
import { GzipCompressor } from './compressors/gzip-compressor';
import { BrotliCompressor} from './compressors/brotli-compressor';
import { getArgs } from './utils/args';

export async function cli() {
    try {
        const args = getArgs();
        
        switch (args.cmd) {
            case 'backup': {
                let bar: ProgressBar|undefined;
                const backup = new Backup(args.url, args);
                backup.registerSerializer(args.format === 'json' ? JsonSerializer.serialize({ space: 2 }) : BsonSerializer.serialize());

                if(args.compress === 'gz') {
                    backup.registerCompressor(GzipCompressor.compress())
                } else if(args.compress === 'br') {
                    backup.registerCompressor(BrotliCompressor.compress())
                }

                backup.events.subscribe(event => {
                    if (!bar) {
                        bar = new ProgressBar('BACKUP [:bar] :current/:total :percent :etas remaining', { width: 40, total: event.total });
                    }
                    bar.tick();
                });

                const content = await backup.backup();

                bar && bar.terminate();

                await fs.writeFile(args.file, content);

                break;
            }
            case 'restore': {
                let bar: ProgressBar|undefined;

                const file = await fs.readFile(args.file);

                const restore = new Restore(args.url, args);
                restore.registerDeserializer(args.format === 'json' ? JsonSerializer.deserialize() : BsonSerializer.deserialize());

                if(args.compress === 'gz') {
                    restore.registerDecompressor(GzipCompressor.decompress())
                } else if(args.compress === 'br') {
                    restore.registerDecompressor(BrotliCompressor.decompress())
                }

                restore.events.subscribe(event => {
                    if (!bar) {
                        bar = new ProgressBar('RESTORE [:bar] :current/:total :percent :etas remaining', { width: 40, total: event.total });
                    }
                    bar.tick();
                });
                await restore.restore(file);

                bar && bar.terminate();
                break;
            }
        }
    } catch(e) {
        console.error(e.message);
        process.exit(1);
    }
}