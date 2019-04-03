import { Format } from '../utils/args';
import { BsonSerializer } from './bson-serializer';
import { JsonSerializer } from './json-serializer';
import { ISerializer } from './serializer';

export class SerializerFactory {
    protected compressors = new Map<Format, ISerializer>([
        ['bson', new BsonSerializer()],
        ['json', new JsonSerializer()]
    ]);

    get(type: Format): ISerializer {
        if (this.compressors.has(type)) {
            return this.compressors.get(type)!;
        }

        return this.compressors.get('bson')!;
    }
}