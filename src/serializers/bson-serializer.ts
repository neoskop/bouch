import BSON from 'bson';

import { BackupDocuments, ISerializer } from './serializer';

export class BsonSerializer implements ISerializer {
    serialize(docs: BackupDocuments) {
        /**
         * wrap into root object, due to bson design bug
         * @see https://blog.jeaye.com/2016/09/28/bson-design-flaw/
         */
        return BSON.serialize({ docs });
    }

    serializeMulti(dbs : { [name: string]: BackupDocuments }) : Buffer {
        return BSON.serialize({ '@multi': true, ...dbs });
    }

    deserialize(buffer: Buffer) {
        const { '@multi': multi, docs } = BSON.deserialize(buffer);

        if(multi || !Array.isArray(docs)) {
            throw new Error('Expected single database backup');
        }

        return docs;
    }

    deserializeMulti(buffer: Buffer): { [name: string]: BackupDocuments } {
        const { '@multi': multi, ...dbs } = BSON.deserialize(buffer);

        if(!multi) {
            throw new Error('Expected multi database backup');
        }

        return dbs;
    }
}