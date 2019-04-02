import axios from 'axios';
import qs from 'querystring';

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

export interface CreateResponse {
    ok: boolean;
    id: string;
    rev: string;
}

export type BulkDocsResponse = CreateResponse[]


export class CouchDbApi {
    constructor(protected readonly url: string) {

    }

    async allDocs<T extends object = {}>({ skip, limit }: { skip?: number, limit: number }): Promise<AllDocsResponse<T>> {
        const query = qs.stringify({
            include_docs: true,
            skip,
            limit
        });
        debug('allDocs', this.url, query);
        const res = await axios.get<AllDocsResponse<T>>(`${this.url}/_all_docs?${query}`);

        return res.data;
    }

    async bulkDocs(docs : DocMetadata[]) : Promise<BulkDocsResponse> {
        debug('bulkDocs', this.url);
        const res = await axios.post<BulkDocsResponse>(`${this.url}/_bulk_docs`, {
            docs
        });

        return res.data;
    }

    async getAttachment(id: string, name: string) : Promise<Buffer> {
        debug('getAttachment', `${this.url}/${id}/${name}`);
        const res = await axios.get<string>(`${this.url}/${id}/${name}`, {
            responseType: 'arraybuffer'
        });

        return new Buffer(res.data, 'binary');
    }

    async putAttachment(id: string, name: string, rev: string, content: Buffer, content_type: string) : Promise<CreateResponse> {
        debug('putAttachment', this.url, { id, name, rev, content_type });
        const res = await axios.put<CreateResponse>(`${this.url}/${id}/${name}?rev=${rev}`, content.toString('binary'), {
            headers: {
                'Content-Type': content_type
            }
        });

        return res.data;
    }

    async databaseExists() : Promise<boolean> {
        debug('databaseExists', this.url);
        const res = await axios.get<{ error: string }>(this.url, { validateStatus: () => true });

        return !(res.status === 404 && res.data.error === 'not_found');
    }

    async createDatabase() : Promise<void> {
        debug('createDatabase', this.url);
        await axios.put(this.url, '');
    }
}