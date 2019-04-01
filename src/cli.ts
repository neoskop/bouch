import { getArgs } from './utils/args';
import { backup, ProgressEvent, BackupResult } from './index';
import { tap } from 'rxjs/operators';
import ProgressBar from 'progress';
import fs from 'fs-extra';

export async function cli() {
    const args = getArgs();

    switch (args.cmd) {
        case 'backup':
            let bar: ProgressBar;
            const res = await backup(args.url, args).pipe(
                tap({
                    next: event => {
                        if (event instanceof ProgressEvent) {
                            if (!bar) {
                                bar = new ProgressBar('[:bar] :current/:total :percent :etas remaining', { width: 40, total: event.total });
                            }
                            bar.tick();
                        }
                    },
                    complete: () => {
                        bar.terminate();
                    }
                })
            ).toPromise() as BackupResult;

            await fs.writeFile(args.file, res.bson);

            break;
    }
}