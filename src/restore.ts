import { defer, from, isObservable, Observable, of, Subject } from 'rxjs';
import { bufferCount, concatMap, ignoreElements } from 'rxjs/operators';

import { BackupDocument, BackupDocuments } from './serializers/serializer';
import { CouchDbApi } from './utils/couchdb-api';
import { ProgressEvent } from './utils/progress-event';

export class Restore {
    readonly events = new Subject<ProgressEvent>();

    protected readonly api : CouchDbApi;

    constructor(url : string, protected readonly options : { chunkSize: number }) {
        this.api = new CouchDbApi(url);
    }

    ensureEmptyDatabase() : Observable<void> {
        return defer(async () => {
            if (await this.api.databaseExists()) {
                const res = await this.api.allDocs({ skip: 0, limit: 1 });
                if (res.total_rows !== 0) {
                    throw new Error('Database is not empty');
                }
            } else {
                await this.api.createDatabase();
            }
        })
    }

    restore(docs : BackupDocument | BackupDocuments | Observable<BackupDocument>) : Observable<void> {
        let i = 0;
        const length = Array.isArray(docs) ? docs.length : isObservable(docs) ? Infinity : 1;

        const obs = Array.isArray(docs) || isObservable(docs) ? from(docs) : of(docs);

        return obs.pipe(
            bufferCount(this.options.chunkSize),
            concatMap(docs => defer(async () => {
                const res = await this.api.bulkDocs(docs.map(o => o.doc));
                const idRevMap = new Map<string, string>(res.map(r => [r.id, r.rev] as [string, string]));

                for (const obj of docs) {
                    for (const attachment in obj.attachments) {
                        const res = await this.api.putAttachment(obj.doc._id, attachment, idRevMap.get(obj.doc._id)!, obj.attachments[attachment].content, obj.attachments[attachment].content_type);
                        idRevMap.set(res.id, res.rev);
                    }
                    this.events.next(new ProgressEvent(++i, length));
                }
            })),
            ignoreElements()
        )
    }
}