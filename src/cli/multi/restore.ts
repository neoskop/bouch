import fs from 'fs-extra';
import ProgressBar from 'progress';

import { ICompressor } from '../../compressors/compressor';
import { Restore } from '../../restore';
import { ISerializer } from '../../serializers/serializer';
import { IRestoreArgs } from '../../utils/args';
import { streamToBuffer } from '../../utils/stream-to-buffer';
import { rename } from '../../utils/rename';

export async function multiRestore(args: IRestoreArgs, { serializer, compressor }: { serializer: ISerializer, compressor: ICompressor }) {
    let bar: ProgressBar | undefined;

    const file = await (args.file === '-' ? streamToBuffer(process.stdin) : fs.readFile(args.file));

    const content = await serializer.deserializeMulti(await compressor.decompress(file));
    const dbs = Object.keys(content);
    const url = args.url.replace(/\/$/, '');

    for (const db of dbs) {
        const dbName = rename(db, args.rename);
        const restore = new Restore(`${url}/${dbName}`, args);

        if (!args.quiet) {
            restore.events.subscribe(event => {
                if (!bar) {
                    bar = new ProgressBar('RESTORE :db [:bar] :current/:total :percent :etas remaining', { width: 40, total: event.total });
                }
                bar.tick({ db: db !== dbName ? `${db} as ${dbName}` : db });
            });
        }

        await restore.ensureEmptyDatabase().toPromise();
        await restore.restore(content[db]).toPromise();

        bar = undefined;
    }

    bar && bar.terminate();
}