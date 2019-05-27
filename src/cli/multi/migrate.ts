import ProgressBar from 'progress';
import { first, flatMap } from 'rxjs/operators';

import { Backup } from '../../backup';
import { Restore } from '../../restore';
import { IMigrateArgs } from '../../utils/args';
import { getDatabases } from '../../utils/get-databases';
import { rename } from '../../utils/rename';

export async function multiMigrate(args: IMigrateArgs) {
    let bar: ProgressBar | undefined;

    const dbs = await getDatabases(args.from, args.filter);
    const from = args.from.replace(/\/$/, '');
    const to = args.to.replace(/\/$/, '');

    for (const db of dbs) {
        const dbName = rename(db, args.rename);
        const backup = new Backup(`${from}/${db}`, args);
        const restore = new Restore(`${to}/${dbName}`, args);

        if (!args.quiet) {
            backup.events.pipe(first()).subscribe(event => {
                bar = new ProgressBar('MIGRATE :db [:bar] :current/:total :percent :etas remaining', { width: 40, total: event.total });
            })

            restore.events.subscribe(() => {
                bar && bar.tick({ db: db !== dbName ? `${db} as ${dbName}` : db });
            });
        }

        await restore.ensureEmptyDatabase().toPromise();
        await backup.backup().pipe(
            flatMap(doc => restore.restore(doc))
        ).toPromise();

        bar = undefined;
    }

    bar && bar!.terminate();
}