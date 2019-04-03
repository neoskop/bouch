import { Observable, Subject } from 'rxjs';
import sortObject from 'sort-object-keys';

import { BackupDocument } from './serializers/serializer';
import { CouchDbApi } from './utils/couchdb-api';
import { ProgressEvent } from './utils/progress-event';

export class Backup {
    readonly events = new Subject<ProgressEvent>();

    protected readonly api: CouchDbApi;

    constructor(url: string, protected readonly options: { chunkSize: number }) {
        this.api = new CouchDbApi(url);
    }

    backup(): Observable<BackupDocument> {
        return new Observable<BackupDocument>(sub => {
            let skip = 0;
            let total_rows = Infinity;
            let i = 0;
            const backupedRows = new Set<string>();

            (async () => {
                while (skip <= total_rows) {
                    const res = await this.api.allDocs({ limit: this.options.chunkSize, skip });
                    skip += this.options.chunkSize;
                    total_rows = res.total_rows;

                    for (const row of res.rows) {
                        if (backupedRows.has(row.id)) {
                            continue;
                        }
                        const doc: BackupDocument = {
                            doc: sortObjectRecursive(row.doc),
                            attachments: {}
                        }
                        if (row.doc._attachments) {
                            for (const attachment in row.doc._attachments) {
                                doc.attachments[attachment] = {
                                    content_type: row.doc._attachments[attachment].content_type,
                                    content: await this.api.getAttachment(row.id, attachment)
                                }
                            }
                        }
                        doc.attachments = sortObjectRecursive(doc.attachments);
                        delete doc.doc._rev;
                        delete doc.doc._attachments;
                        this.events.next(new ProgressEvent(++i, total_rows));
                        sub.next(doc);
                    }
                }
                sub.complete();
            })().catch(err => sub.error(err));
        });
    }
}


function sortObjectRecursive<T>(obj: T): T {
    if (obj && typeof obj === 'object' && obj.constructor === Object) {
        obj = sortObject(obj);
        for (const key in obj) {
            obj[key] = sortObjectRecursive(obj[key]);
        }
    }
    return obj;
}