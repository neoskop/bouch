import { CommandFactory } from './cli/command-factory';
import { CompressorFactory } from './compressors/compressor-factory';
import { SerializerFactory } from './serializers/serializer-factory';
import { getArgs } from './utils/args';

export async function cli() {
    try {
        const args = getArgs();

        const compressor = new CompressorFactory().get(args.compress);
        const serializer = new SerializerFactory().get(args.format);
        const command = new CommandFactory().get(args.cmd, args.multiDatabase ? 'multi' : 'single');

        await command(args, { serializer, compressor });
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}