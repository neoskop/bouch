import { Subject } from 'rxjs';

import { CouchDbApi, Doc } from './utils/couchdb-api';
import { ProgressEvent } from './utils/progress-event';
import { Middleware, Pipeline } from './utils/pipeline';

export class Restore {
    readonly events = new Subject<ProgressEvent>();

    protected readonly api : CouchDbApi;

    protected deserializer?: Middleware<Buffer, object>;
    protected decompressor?: Middleware<Buffer, Buffer>;

    constructor(url : string, protected readonly options : { chunkSize: number }) {
        this.api = new CouchDbApi(url);
    }

    registerDeserializer(fn : Middleware<Buffer, object>) : void {
        this.deserializer = fn;
    } 

    registerDecompressor(fn : Middleware<Buffer, Buffer>) : void {
        this.decompressor = fn;
    }

    async restore(content : Buffer) : Promise<void> {
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
        } = this.transform(content) as any;
        const values = Object.keys(obj).map(k => obj[k]);

        if (await this.api.databaseExists()) {
            const res = await this.api.allDocs({ skip: 0, limit: 1 });
            if (res.total_rows !== 0) {
                throw new Error('Database is not empty');
            }
        } else {
            await this.api.createDatabase();
        }

        while (i < values.length) {
            const slice = values.slice(skip, skip + this.options.chunkSize);
            skip += this.options.chunkSize;

            const res = await this.api.bulkDocs(slice.map(o => o.doc));

            const idRevMap = new Map<string, string>(res.map(r => [r.id, r.rev] as [string, string]));

            for (const obj of slice) {
                for (const attachment in obj.attachments) {
                    const res = await this.api.putAttachment(obj.doc._id, attachment, idRevMap.get(obj.doc._id)!, obj.attachments[attachment].content, obj.attachments[attachment].content_type);
                    idRevMap.set(res.id, res.rev);
                }
                this.events.next(new ProgressEvent(++i, values.length));
            }
        }
    }

    protected transform(input : Buffer) : object {
        if(!this.deserializer) {
            throw new Error('Missing deserializer');
        }

        let pipeline = this.decompressor ? new Pipeline<Buffer>().use(this.decompressor) : new Pipeline<Buffer>();;

        return pipeline.use(this.deserializer).transform(input);
    }
}