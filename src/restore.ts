import { defer, from, isObservable, Observable, of, Subject } from 'rxjs';
import { bufferCount, concatMap, ignoreElements } from 'rxjs/operators';

import { Attachments, BackupDocument, BackupDocuments } from './serializers/serializer';
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
                    await this.restoreAttachments(obj.doc._id, obj.attachments, idRevMap);
                    this.events.next(new ProgressEvent(++i, length));
                }                
            })),
            ignoreElements()
        )
    }

    protected async restoreAttachments(id : string, attachments : Attachments, revMap : Map<string, string>) {
        for (const attachment in attachments) {
            const res = await this.api.putAttachment(id, attachment, revMap.get(id)!, attachments[attachment].content, attachments[attachment].content_type);
            revMap.set(res.id, res.rev);
        }
    }
}
