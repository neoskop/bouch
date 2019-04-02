export function streamToBuffer(stream : NodeJS.ReadableStream) : Promise<Buffer> {
    const buffers : Buffer[] = [];

    return new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('data', chunk => buffers.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(buffers)))
    });
}
