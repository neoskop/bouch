import fs from 'fs-extra';
import ProgressBar from 'progress';
import { defer } from 'rxjs';
import { concatMap, toArray } from 'rxjs/operators';

import { Backup } from '../../backup';
import { ICompressor } from '../../compressors/compressor';
import { ISerializer } from '../../serializers/serializer';
import { IBackupArgs } from '../../utils/args';

export async function singleBackup(args: IBackupArgs, { serializer, compressor }: { serializer: ISerializer, compressor: ICompressor }) {
    let bar: ProgressBar | undefined;
    const backup = new Backup(args.url, args);

    if (!args.quiet) {
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

    if (args.stdout) {
        process.stdout.write(content);
    } else {
        await fs.writeFile(args.file, content);
    }
}