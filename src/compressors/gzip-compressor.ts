import { Middleware } from '../utils/pipeline';
import zlib from 'zlib';

export class GzipCompressor {
    static compress() : Middleware<Buffer, Buffer> {
        return (input : Buffer) => {
            return zlib.gzipSync(input, { level: 9 });
        }
    }

    static decompress() : Middleware<Buffer, Buffer> {
        return (input : Buffer) => {
            return zlib.gunzipSync(input);
        }
    }
}