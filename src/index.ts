import { Observable } from 'rxjs';
import sortObject from 'sort-object-keys';

import { CouchDbApi, Doc } from './utils/couchdb-api';


// import BSON from 'bson';






export class ProgressEvent {
    constructor(public readonly loaded: number,
        public readonly total: number) { }
}

export class BackupResult {
    constructor(public readonly bson: Buffer) { }
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

export function backup(url: string, options: { chunkSize: number }): Observable<ProgressEvent | BackupResult> {
    return new Observable(sub => {
        let canceled = false;

        const api = new CouchDbApi(url);

        let skip = 0;
        let total_rows = Infinity;
        let i = 0;
        const obj: {
            [id: string]: {
                doc: Doc<{}>;
                attachments: {
                    [name: string]: {
                        content_type: string;
                        content: Buffer
                    }
                }
            }
        } = {};

        (async () => {
            while (skip <= total_rows && !canceled) {
                const res = await api.allDocs({ limit: options.chunkSize, skip });
                skip += options.chunkSize;
                total_rows = res.total_rows;

                for (const row of res.rows) {
                    obj[row.id] = {
                        doc: { ...row.doc },
                        attachments: {}
                    }
                    if (row.doc._attachments) {
                        for (const attachment in row.doc._attachments) {
                            obj[row.id].attachments[attachment] = {
                                content_type: row.doc._attachments[attachment].content_type,
                                content: await api.getAttachment(row.id, attachment)
                            }
                        }
                    }
                    delete obj[row.id].doc._rev;
                    delete obj[row.id].doc._attachments;
                    sub.next(new ProgressEvent(++i, total_rows));
                }
            }
            // sub.next(new BackupResult(BSON.serialize(obj)));
            sub.next(new BackupResult(JSON.stringify(sortObjectRecursive(obj), (_key: string, value: any) => {
                if (value && typeof value === 'object' && value.type === 'Buffer') {
                    const buf = new Buffer(value.data);
                    return 'base64,' + buf.toString('base64');
                }
                return value;
            }, 2) as any))
            sub.complete();
        })().catch(err => sub.error(err));

        return () => canceled = true;
    })
}

export function restore(url: string, bson: Buffer, options: { chunkSize: number, force?: boolean }) {
    return new Observable(sub => {
        let canceled = false;

        const api = new CouchDbApi(url);

        let i = 0;
        let skip = 0;
        const obj: {
            [id: string]: {
                doc: Doc<{}>;
                attachments: {
                    [name: string]: {
                        content_type: string;
                        content: Buffer
                    }
                }
            }
        } = JSON.parse(bson.toString('utf8'), (_key: any, value: any) => {
            if (typeof value === 'string' && value.startsWith('base64,')) {
                return new Buffer(value.slice(7), 'base64');
            }
            return value;
        });//BSON.deserialize(bson);
        const values = Object.keys(obj).map(k => obj[k]);

        (async () => {
            if (await api.databaseExists()) {
                const res = await api.allDocs({ skip: 0, limit: 1 });
                if (res.total_rows !== 0) {
                    throw new Error('Database is not empty');
                }
            } else {
                await api.createDatabase();
            }

            while (i < values.length && !canceled) {
                const slice = values.slice(skip, skip + options.chunkSize);
                skip += options.chunkSize;

                const res = await api.bulkDocs(slice.map(o => o.doc));

                const idRevMap = new Map<string, string>(res.map(r => [r.id, r.rev] as [string, string]));

                for (const obj of slice) {
                    for (const attachment in obj.attachments) {
                        const res = await api.putAttachment(obj.doc._id, attachment, idRevMap.get(obj.doc._id)!, obj.attachments[attachment].content, obj.attachments[attachment].content_type);
                        idRevMap.set(res.id, res.rev);
                    }
                    sub.next(new ProgressEvent(++i, values.length));
                }
            }
            sub.complete();
        })().catch(err => sub.error(err));

        return () => canceled = true;
    })
}