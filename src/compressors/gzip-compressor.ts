import zlib from 'zlib';

import { ICompressor } from './compressor';

export class GzipCompressor implements ICompressor {
    compress(input: Buffer) {
        return zlib.gzipSync(input, { level: 9 });
    }

    decompress(input: Buffer) {
        return zlib.gunzipSync(input);
    }
}