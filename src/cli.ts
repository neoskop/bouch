import fs from 'fs-extra';
import ProgressBar from 'progress';
import { tap } from 'rxjs/operators';

import { restore } from '.';
import { Backup } from './backup';
import { getArgs } from './utils/args';
import { JsonSerializer } from './serializers/json-serializer';

export async function cli() {
    const args = getArgs();
    try {
        switch (args.cmd) {
            case 'backup': {
                let bar: ProgressBar|undefined;
                const backup = new Backup(args.url, args);
                backup.registerSerializer(JsonSerializer.serialize({ space: 2 }));

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