import { Middleware } from '../utils/pipeline';
import zlib from 'zlib';

export class BrotliCompressor {
    static compress() : Middleware<Buffer, Buffer> {
        return (input : Buffer) => {
            return zlib.brotliCompressSync(input);
        }
    }

    static decompress() : Middleware<Buffer, Buffer> {
        return (input : Buffer) => {
            return zlib.brotliDecompressSync(input);
        }
    }
}