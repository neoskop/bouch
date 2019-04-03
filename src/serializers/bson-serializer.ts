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

    deserialize(buffer: Buffer) {
        return BSON.deserialize(buffer).docs;
    }
}