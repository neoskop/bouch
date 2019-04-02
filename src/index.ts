import axios from 'axios';
// import BSON from 'bson';
import qs from 'querystring';
import { Observable } from 'rxjs';
import sortObject from 'sort-object-keys';

const debug = require('debug')('bouch');

export interface Attachment {
    content_type: string;
    digest: string;
    length: number;
}

export type DocMetadata = { _id: string, _rev?: string, _deleted?: boolean };

export type Doc<T extends object> = T & DocMetadata & {
    _attachments?: { [name: string]: Attachment }
}

export interface AllDocsResponseRow<T extends object> {
    id: string;
    key: string;
    value: { rev: string };
    doc: Doc<T>
}

export interface AllDocsResponse<T extends object> {
    total_rows: number;
    offset: number;
    rows: AllDocsResponseRow<T>[];
}

export async function allDocs<T extends object = {}>(url: string, { skip, limit }: { skip?: number, limit: number }): Promise<AllDocsResponse<T>> {
    const query = qs.stringify({
        include_docs: true,
        skip,
        limit
    });
    debug('allDocs', { url, query });
    const res = await axios.get<AllDocsResponse<T>>(`${url}/_all_docs?${query}`);

    return res.data;
}

export interface CreateResponse {
    ok: boolean;
    id: string;
    rev: string;
}

export type BulkDocsResponse = CreateResponse[]

export async function bulkDocs(url: string, docs : DocMetadata[]) : Promise<BulkDocsResponse> {
    debug('bulkDocs', { url });
    const res = await axios.post<BulkDocsResponse>(`${url}/_bulk_docs`, {
        docs
    });

    return res.data;
}

export async function getAttachment(url: string, id: string, name: string) : Promise<Buffer> {
    debug('getAttachment', `${url}/${id}/${name}`);
    const res = await axios.get<string>(`${url}/${id}/${name}`, {
        responseType: 'arraybuffer'
    });

    return new Buffer(res.data, 'binary');
}

export async function putAttachment(url: string, id: string, name: string, rev: string, content: Buffer, content_type: string) : Promise<CreateResponse> {
    debug('putAttachment', { url, id, name, rev, content_type });
    const res = await axios.put<CreateResponse>(`${url}/${id}/${name}?rev=${rev}`, content.toString('binary'), {
        headers: {
            'Content-Type': content_type
        }
    });

    return res.data;
}

export async function databaseExists(url: string) : Promise<boolean> {
    debug('databaseExists', { url });
    const res = await axios.get<{ error: string }>(url, { validateStatus: () => true });

    return !(res.status === 404 && res.data.error === 'not_found');
}

export async function createDatabase(url: string) : Promise<void> {
    debug('createDatabase', { url });
    await axios.put(url, '');
}

export class ProgressEvent {
    constructor(public readonly loaded: number,
                public readonly total: number) {}
}

export class BackupResult {
    constructor(public readonly bson : Buffer) {}
}

function sortObjectRecursive<T>(obj : T) : T {
    if(obj && typeof obj === 'object' && obj.constructor === Object) {
        obj = sortObject(obj);
        for(const key in obj) {
            obj[key] = sortObjectRecursive(obj[key]);
        }
    }
    return obj;
}

export function backup(url: string, options: { chunkSize: number }): Observable<ProgressEvent|BackupResult> {
    return new Observable(sub => {
        let canceled = false;


        let skip = 0;
        let total_rows = Infinity;
        let i = 0;
        const obj : { [id: string]: {
            doc: Doc<{}>;
            attachments: { [name: string]: {
                content_type: string;
                content: Buffer
            }}
        }} = {};

        (async () => {
            while(skip <= total_rows && !canceled) {
                const res = await allDocs(url, { limit: options.chunkSize, skip });
                skip += options.chunkSize;
                total_rows = res.total_rows;

                for(const row of res.rows) {
                    obj[row.id] = {
                        doc: { ...row.doc },
                        attachments: {}
                    }
                    if(row.doc._attachments) {
                        for(const attachment in row.doc._attachments) {
                            obj[row.id].attachments[attachment] = {
                                content_type: row.doc._attachments[attachment].content_type,
                                content: await getAttachment(url, row.id, attachment)
                            }
                        }
                    }
                    delete obj[row.id].doc._rev;
                    delete obj[row.id].doc._attachments;
                    sub.next(new ProgressEvent(++i, total_rows));
                }
            }
            // sub.next(new BackupResult(BSON.serialize(obj)));
            sub.next(new BackupResult(JSON.stringify(sortObjectRecursive(obj), (_key: string, value : any) => {
                if(value && typeof value === 'object' && value.type === 'Buffer') {
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

        let i = 0;
        let skip = 0;
        const obj : { [id: string]: {
            doc: Doc<{}>;
            attachments: { [name: string]: {
                content_type: string;
                content: Buffer
            }}
        }} = JSON.parse(bson.toString('utf8'), (_key: any, value : any) => {
            if(typeof value === 'string' && value.startsWith('base64,')) {
                return new Buffer(value.slice(7), 'base64');
            }
            return value;
        });//BSON.deserialize(bson);
        const values = Object.keys(obj).map(k => obj[k]);

        (async () => {
            if(await databaseExists(url)) {
                const res = await allDocs(url, { skip: 0, limit: 1 });
                if(res.total_rows !== 0) {
                    throw new Error('Database is not empty');
                }
            } else {
                await createDatabase(url);
            }

            while(i < values.length && !canceled) {
                const slice = values.slice(skip, skip + options.chunkSize);
                skip += options.chunkSize;

                const res = await bulkDocs(url, slice.map(o => o.doc));

                const idRevMap = new Map<string, string>(res.map(r => [ r.id, r.rev ] as [ string, string ]));

                for(const obj of slice) {
                    for(const attachment in obj.attachments) {
                        const res = await putAttachment(url, obj.doc._id, attachment, idRevMap.get(obj.doc._id)!, obj.attachments[attachment].content, obj.attachments[attachment].content_type);
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