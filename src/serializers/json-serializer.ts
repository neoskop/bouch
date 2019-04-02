import { Middleware } from '../utils/pipeline';

function bufferReplacer(_key: string, value : any) {
    if (value && typeof value === 'object' && value.type === 'Buffer') {
        const buf = new Buffer(value.data);
        return 'base64,' + buf.toString('base64');
    }
    return value;
}

function bufferReviver(_key: any, value: any) {
    if (typeof value === 'string' && value.startsWith('base64,')) {
        return new Buffer(value.slice(7), 'base64');
    }
    return value;
}

export class JsonSerializer {
    static serialize({ space } : { space?: number|string } = {}) : Middleware<object, Buffer> {
        return (input : object) => {
            const json = JSON.stringify(input, bufferReplacer, space);
            return new Buffer(json);
        }
    }

    static deserialize() : Middleware<Buffer, object> {
        return (input : Buffer) => {
            const json = input.toString('utf8');

            return JSON.parse(json, bufferReviver);
        }
    }
}