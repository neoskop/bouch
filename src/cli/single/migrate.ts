import ProgressBar from 'progress';
import { concatMap, first } from 'rxjs/operators';

import { Backup } from '../../backup';
import { Restore } from '../../restore';
import { IMigrateArgs } from '../../utils/args';

export async function singleMigrate(args: IMigrateArgs) {
    let bar: ProgressBar | undefined;

    const backup = new Backup(args.from, args);
    const restore = new Restore(args.to, args);

    if (!args.quiet) {
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