import zlib from 'zlib';

import { ICompressor } from './compressor';

export class BrotliCompressor implements ICompressor {
    compress(input: Buffer) {
        return zlib.brotliCompressSync(input);
    }

    decompress(input: Buffer) {
        return zlib.brotliDecompressSync(input);
    }
}