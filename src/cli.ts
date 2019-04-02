import fs from 'fs-extra';
import ProgressBar from 'progress';
import { tap } from 'rxjs/operators';

import { ProgressEvent, restore, backup, BackupResult } from './index';
import { getArgs } from './utils/args';

export async function cli() {
    const args = getArgs();
    try {
        switch (args.cmd) {
            case 'backup': {
                let bar: ProgressBar;
                const res = await backup(args.url, args).pipe(
                    tap({
                        next: event => {
                            if (event instanceof ProgressEvent) {
                                if (!bar) {
                                    bar = new ProgressBar('BACKUP [:bar] :current/:total :percent :etas remaining', { width: 40, total: event.total });
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
            case 'restore': {
                let bar: ProgressBar;

                const file = await fs.readFile(args.file);
                await restore(args.url, file, args).pipe(
                    tap({
                        next: event => {
                            if (event instanceof ProgressEvent) {
                                if (!bar) {
                                    bar = new ProgressBar('RESTORE [:bar] :current/:total :percent :etas remaining', { width: 40, total: event.total });
                                }
                                bar.tick();
                            }
                        },
                        complete: () => {
                            bar.terminate();
                        }
                    })
                ).toPromise();
                break;
            }
        }
    } catch(e) {
        console.error(e.message);
        process.exit(1);
    }
}