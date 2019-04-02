import { Middleware } from '../utils/pipeline';
import BSON from 'bson';

export class BsonSerializer {
    static serialize() : Middleware<object, Buffer> {
        return (input : object) => {
            return BSON.serialize(input);
        }
    }

    static deserialize() : Middleware<Buffer, object> {
        return (input : Buffer) => {
            return BSON.deserialize(input);
        }
    }
}