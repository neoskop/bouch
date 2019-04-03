import { ICompressor } from './compressor';

export class NoneCompressor implements ICompressor {
    compress(input: Buffer) {
        return input
    }

    decompress(input: Buffer) {
        return input
    }
}