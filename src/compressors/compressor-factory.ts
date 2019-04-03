import { Compress } from '../utils/args';
import { BrotliCompressor } from './brotli-compressor';
import { ICompressor } from './compressor';
import { GzipCompressor } from './gzip-compressor';
import { NoneCompressor } from './none-compressor';

export class CompressorFactory {
    protected compressors = new Map<Compress, ICompressor>([
        ['gz', new GzipCompressor()],
        ['br', new BrotliCompressor()],
        ['none', new NoneCompressor()]
    ]);

    get(type: Compress): ICompressor {
        if (this.compressors.has(type)) {
            return this.compressors.get(type)!;
        }

        return this.compressors.get('none')!;
    }
}