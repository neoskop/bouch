import { BackupDocuments, ISerializer } from './serializer';

function bufferReplacer(_key: string, value: any) {
    if (value && typeof value === 'object' && value.type === 'Buffer') {
        const buf = Buffer.from(value.data);
        return 'base64,' + buf.toString('base64');
    }
    return value;
}

function bufferReviver(_key: any, value: any) {
    if (typeof value === 'string' && value.startsWith('base64,')) {
        return Buffer.from(value.slice(7), 'base64');
    }
    return value;
}

export class JsonSerializer implements ISerializer {
    serialize(docs: BackupDocuments) {
        const json = JSON.stringify(docs, bufferReplacer);
        return Buffer.from(json);
    }

    serializeMulti(dbs : { [name: string]: BackupDocuments }) : Buffer {
        const json = JSON.stringify({
            ...dbs,
            '@multi': true
        }, bufferReplacer);

        return Buffer.from(json);
    }

    deserialize(buffer: Buffer) {
        const json = buffer.toString('utf8');

        const docs = JSON.parse(json, bufferReviver);

        if(!Array.isArray(docs)) {
            throw new Error('Expected single database backup');
        }

        return docs;
    }

    deserializeMulti(buffer: Buffer): { [name: string]: BackupDocuments } {
        const json = buffer.toString('utf8');

        const { '@multi': multi, ...dbs } = JSON.parse(json, bufferReviver);

        if(!multi) {
            throw new Error('Expected multi database backup');
        }

        return dbs;
    }
}