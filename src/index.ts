import axios from 'axios';
import qs from 'querystring';
import BSON from 'bson';
import { Observable } from 'rxjs';

const debug = require('debug')('bouch');

export interface Attachment {
    content_type: string;
    digest: string;
    length: number;
}

export type Doc<T extends object> = T & {
    _id: string;
    _rev?: string;
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

export async function getAttachment(url: string, id: string, name: string) : Promise<Buffer> {
    debug('getAttachment', `${url}/${id}/${name}`);
    const res = await axios.get<string>(`${url}/${id}/${name}`, {
        responseType: 'arraybuffer'
    });

    return new Buffer(res.data, 'binary');
}

export class ProgressEvent {
    constructor(public readonly loaded: number,
                public readonly total: number) {}
}

export class BackupResult {
    constructor(public readonly bson : Buffer) {}
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
            sub.next(new BackupResult(BSON.serialize(obj)));
            sub.complete();
        })().catch(err => sub.error(err));

        return () => canceled = true;
    })
}