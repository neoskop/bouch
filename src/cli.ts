import fs from 'fs-extra';
import ProgressBar from 'progress';
import { defer, of } from 'rxjs';
import { concatMap, first, toArray } from 'rxjs/operators';

import { Backup } from './backup';
import { CompressorFactory } from './compressors/compressor-factory';
import { Restore } from './restore';
import { SerializerFactory } from './serializers/serializer-factory';
import { getArgs } from './utils/args';
import { streamToBuffer } from './utils/stream-to-buffer';

export async function cli() {
    try {
        const args = getArgs();

        const compressor = new CompressorFactory().get(args.compress);
        const serializer = new SerializerFactory().get(args.format);

        switch (args.cmd) {
            case 'backup': {
                let bar: ProgressBar|undefined;
                const backup = new Backup(args.url, args);

                if(!args.quiet) {
                    backup.events.subscribe(event => {
                        if (!bar) {
                            bar = new ProgressBar('BACKUP [:bar] :current/:total :percent :etas remaining', { width: 40, total: event.total });
                        }
                        bar.tick();
                    });
                }

                const content = await backup.backup().pipe(
                    toArray(),
                    concatMap(docs => defer(async () => await serializer.serialize(docs))),
                    concatMap(buffer => defer(async () => await compressor.compress(buffer)))
                ).toPromise();

                bar && bar.terminate();

                if(args.stdout) {
                    process.stdout.write(content);
                } else {
                    await fs.writeFile(args.file, content);
                }

                break;
            }
            case 'restore': {
                let bar: ProgressBar|undefined;

                const file = await (args.file === '-' ? streamToBuffer(process.stdin) : fs.readFile(args.file));

                const restore = new Restore(args.url, args);

                if(!args.quiet) {
                    restore.events.subscribe(event => {
                        if (!bar) {
                            bar = new ProgressBar('RESTORE [:bar] :current/:total :percent :etas remaining', { width: 40, total: event.total });
                        }
                        bar.tick();
                    });
                }

                await restore.ensureEmptyDatabase().toPromise();

                await of(file).pipe(
                    concatMap(buffer => defer(async () => await compressor.decompress(buffer))),
                    concatMap(buffer => defer(async () => serializer.deserialize(buffer))),
                    concatMap(docs => restore.restore(docs))
                ).toPromise();

                bar && bar.terminate();
                break;
            }
            case 'migrate': {
                let bar: ProgressBar|undefined;

                const backup = new Backup(args.from, args);
                const restore = new Restore(args.to, args);

                if(!args.quiet) {
                    backup.events.pipe(first()).subscribe(event => {
                        bar = new ProgressBar('MIGRATE [:bar] :current/:total :percent :etas remaining', { width: 40, total: event.total });
                    })

                    restore.events.subscribe(() => {
                        bar && bar.tick();
                    });
                }

                await restore.ensureEmptyDatabase().pipe(
                    concatMap(() => backup.backup()),
                    obs => restore.restore(obs)
                ).toPromise();

                bar && bar!.terminate();
            }
        }
    } catch(e) {
        console.error(e.message);
        process.exit(1);
    }
}