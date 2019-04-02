import yargs from 'yargs';
import dateFormat from 'dateformat';

export type Format = 'bson' | 'json';
export type Compress = 'none' | 'gz' | 'br';

export interface IBaseArgs {
    chunkSize: number;
    format: Format;
    compress: Compress;
}

export interface IBackupArgs extends IBaseArgs {
    cmd: 'backup';
    file: string;
    url: string;
}

export interface IRestoreArgs extends IBaseArgs {
    cmd: 'restore';
    url: string;
    file: string;
}


export function getArgs(argv = process.argv): IBackupArgs | IRestoreArgs {
    const args = yargs
        .command('backup <url>', 'Backup a couchdb database', yargs => {
            return yargs.positional('url', {
                describe: 'Database URL'
            }).option('file', {
                alias: 'f',
                describe: 'File to create',
            });
        })
        .command('restore <file> <url>', 'Restore a backup', yargs => {
            return yargs.positional('file', {
                describe: 'Backup file'
            }).positional('url', {
                describe: 'Database URL'
            })
        })
        .option('chunk-size', {
            alias: 'c',
            describe: 'Number of documents read/write at once',
            type: 'number',
            default: 1000
        })
        .option('format', {
            alias: 'F',
            describe: 'File format',
            choices: [ 'bson', 'json' ]
        })
        .option('compress', {
            alias: 'C',
            describe: 'File compression',
            choices: [ 'none', 'gz', 'br' ]
        })
        .parse(argv.slice(2)) as any;


    switch (args._[0]) {
        case 'backup':
            return {
                cmd: 'backup',
                url: args.url,
                file: args.file || `backup_${dateFormat(new Date(), 'yyyy-mm-dd_HH:MM')}.${args.format || 'bson'}${args.compress !== 'none' ? `.${args.compress}` : ''}`,
                chunkSize: args.chunkSize,
                format: args.format || 'bson',
                compress: args.compress || 'none'
            }
        case 'restore':
            const defaults = parseFileName(args.file);

            const format = args.format || defaults && defaults.format;
            const compress = args.compress || defaults && defaults.compress || 'none';

            if(!format) {
                throw new Error('Cannot resolve format from filename, please provide it via `--format (gz|br)`.')
            }

            return {
                cmd: 'restore',
                url: args.url,
                file: args.file,
                chunkSize: args.chunkSize,
                format: format,
                compress: compress
            }
    }

    throw new Error(`Unknown command "${args._[0]}"`);
}

const FILENAME_REGEXP = /^(.*?)(?:\.(bson|json)(?:\.(gz|br))?)?$/;
function parseFileName(name : string) : { format: Format, compress: Compress } | null {
    const res = FILENAME_REGEXP.exec(name);
    if(!res || !res[2]) {
        return null;
    }

    return {
        format: res[2] as Format,
        compress: res[3] as Compress || 'none'
    }
}