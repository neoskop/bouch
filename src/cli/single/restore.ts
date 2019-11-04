import fs from 'fs-extra';
import ProgressBar from 'progress';
import { defer, of } from 'rxjs';
import { concatMap } from 'rxjs/operators';

import { ICompressor } from '../../compressors/compressor';
import { Restore } from '../../restore';
import { ISerializer } from '../../serializers/serializer';
import { IRestoreArgs } from '../../utils/args';
import { streamToBuffer } from '../../utils/stream-to-buffer';

export async function singleRestore(args: IRestoreArgs, { serializer, compressor }: { serializer: ISerializer, compressor: ICompressor }) {
    let bar: ProgressBar | undefined;

    const file = await (args.file === '-' ? streamToBuffer(process.stdin) : fs.readFile(args.file));

    const restore = new Restore(args.url, args);

    if (!args.quiet) {
        restore.events.subscribe(event => {
            if (!bar) {
                bar = new ProgressBar('RESTORE [:bar] :current/:total :percent :etas remaining', { width: 40, total: event.total });
            }
            bar.tick();
        });
    }

    if(await restore.ensureEmptyDatabase().toPromise()) {
        await of(file).pipe(
            concatMap(buffer => defer(async () => await compressor.decompress(buffer))),
            concatMap(buffer => defer(async () => serializer.deserialize(buffer))),
            concatMap(docs => restore.restore(docs))
        ).toPromise();
    }

    bar && bar.terminate();
}