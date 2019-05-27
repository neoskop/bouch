import fs from 'fs-extra';
import ProgressBar from 'progress';
import { toArray } from 'rxjs/operators';

import { Backup } from '../../backup';
import { ICompressor } from '../../compressors/compressor';
import { BackupDocuments, ISerializer } from '../../serializers/serializer';
import { IBackupArgs } from '../../utils/args';
import { getDatabases } from '../../utils/get-databases';

export async function multiBackup(args: IBackupArgs, { serializer, compressor }: { serializer: ISerializer, compressor: ICompressor }) {
    let bar: ProgressBar | undefined;
    const dbs = await getDatabases(args.url, args.filter);
    const url = args.url.replace(/\/$/, '');
    const content: { [db: string]: BackupDocuments } = {};

    for (const db of dbs) {
        const backup = new Backup(`${url}/${db}`, args);

        if (!args.quiet) {
            backup.events.subscribe(event => {
                if (!bar) {
                    bar = new ProgressBar('BACKUP :db [:bar] :current/:total :percent :etas remaining', { width: 40, total: event.total });
                }
                bar.tick({ db });
            });
        }

        content[db] = await backup.backup().pipe(toArray()).toPromise();

        bar = undefined;
    }
    
    bar && bar.terminate();

    const buffer = await compressor.compress(await serializer.serializeMulti(content));


    if (args.stdout) {
        process.stdout.write(buffer);
    } else {
        await fs.writeFile(args.file, buffer);
    }
}