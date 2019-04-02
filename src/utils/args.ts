import yargs from 'yargs';
import dateFormat from 'dateformat';

export type Format = 'bson' | 'json';
export type Compress = 'none' | 'gz' | 'br';

export interface IBaseArgs {
    chunkSize: number;
    format: Format;
    compress: Compress;
    quiet: boolean;
}

export interface IBackupArgs extends IBaseArgs {
    cmd: 'backup';
    file: string;
    url: string;
    stdout: boolean;
}

export interface IRestoreArgs extends IBaseArgs {
    cmd: 'restore';
    url: string;
    file: string;
}

export interface IMigrateArgs extends IBaseArgs {
    cmd: 'migrate';
    from: string;
    to: string;
}


export function getArgs(argv = process.argv): IBackupArgs | IRestoreArgs | IMigrateArgs {
    const args = yargs
        .command('backup <url>', 'Backup a couchdb database', yargs => {
            return yargs.positional('url', {
                describe: 'Database URL'
            }).option('file', {
                alias: 'f',
                describe: 'File to create'
            }).option('stdout', {
                describe: 'Output to stdout instead of file',
                type: 'boolean',
                default: false
            });
        })
        .command('restore <file> <url>', 'Restore a backup', yargs => {
            return yargs.positional('file', {
                describe: 'Backup file'
            }).positional('url', {
                describe: 'Database URL'
            })
        })
        .command('migrate <from> <to>', 'Copy from one database to another', yargs => {
            return yargs.positional('from', {
                describe: 'From Database'
            }).positional('to', {
                describe: 'To Database'
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
        .option('quiet', {
            alias: 'q',
            describe: 'Supress any non error output',
            type: 'boolean',
            default: false
        })
        .parse(argv.slice(2)) as any;

    switch (args._[0]) {
        case 'backup':
            return {
                cmd: 'backup',
                url: args.url,
                file: args.file || `backup_${dateFormat(new Date(), 'yyyy-mm-dd_HH:MM')}.${args.format || 'bson'}${args.compress && args.compress !== 'none' ? `.${args.compress}` : ''}`,
                chunkSize: args.chunkSize,
                format: args.format || 'bson',
                compress: args.compress || 'none',
                quiet: args.quiet || args.stdout,
                stdout: args.stdout
            }
        case 'restore':
            const defaults = parseFileName(args.file);

            const format = args.format || defaults && defaults.format || 'bson';
            const compress = args.compress || defaults && defaults.compress || 'none';

            if(!format) {
                throw new Error('Cannot resolve format from filename, please provide it via `--format (gz|br)`.')
            }

            return {
                cmd: 'restore',
                url: args.url,
                file: args.file === true ? '-' : args.file,
                chunkSize: args.chunkSize,
                format: format,
                compress: compress,
                quiet: args.quiet
            }
        case 'migrate':
            return {
                cmd: 'migrate',
                from: args.from,
                to: args.to,
                chunkSize: args.chunkSize,
                format: 'bson',
                compress: 'none',
                quiet: args.quiet
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