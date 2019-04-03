export interface ICompressor {
    compress(buffer: Buffer): Buffer | Promise<Buffer>;
    decompress(buffer: Buffer): Buffer | Promise<Buffer>;
}