import yargs from 'yargs';
import dateFormat from 'dateformat';

export type Format = 'bson' | 'json';
export type Compress = 'none' | 'gz' | 'br';

export interface IBaseArgs {
    chunkSize: number;
    format: Format;
    compress: Compress;
    quiet: boolean;
    multiDatabase: boolean,
    filter?: string;
    rename?: string;
    ignoreNonEmpty?: boolean;
    prune?: boolean;
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
            }).option('chunk-size', {
                alias: 'c',
                describe: 'Number of documents read/write at once',
                type: 'number',
                default: 1000
            });
        })
        .command('restore <file> <url>', 'Restore a backup', yargs => {
            return yargs.positional('file', {
                describe: 'Backup file'
            }).positional('url', {
                describe: 'Database URL'
            }).option('chunk-size', {
                alias: 'c',
                describe: 'Number of documents read/write at once',
                type: 'number',
                default: 1000
            })
        })
        .command('migrate <from> <to>', 'Copy from one database to another', yargs => {
            return yargs.positional('from', {
                describe: 'From Database'
            }).positional('to', {
                describe: 'To Database'
            }).option('chunk-size', {
                alias: 'c',
                describe: 'Number of documents read/write at once',
                type: 'number',
                default: 100
            })
        })
        
        .option('format', {
            alias: 'F',
            describe: 'File format (ignored in migrate), default: bson',
            choices: [ 'bson', 'json' ]
        })
        .option('compress', {
            alias: 'C',
            describe: 'File compression (ignored in migrate), default: none',
            choices: [ 'none', 'gz', 'br' ],
        })
        .option('quiet', {
            alias: 'q',
            describe: 'Supress any non error output',
            type: 'boolean',
            default: false
        }).option('multi-database', {
            alias: 'm',
            describe: 'Process multiple databases',
            type: 'boolean',
            default: false
        }).option('filter', {
            describe: 'Filter for db names (use with --multi-database)'
        }).option('rename', {
            alias: 'r',
            describe: 'Code to rename databases in multi-database mode',
        }).option('ignore-non-empty', {
            alias: 'i',
            describe: 'Ignore non-empty databases',
            type: 'boolean',
            default: false
        }).option('prune', {
            describe: 'Prune database before importing',
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
                stdout: args.stdout,
                multiDatabase: args.multiDatabase,
                filter: args.filter,
                rename: args.rename
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
                quiet: args.quiet,
                multiDatabase: args.multiDatabase,
                filter: args.filter,
                rename: args.rename,
                ignoreNonEmpty: args.ignoreNonEmpty,
                prune: args.prune
            }
        case 'migrate':
            return {
                cmd: 'migrate',
                from: args.from,
                to: args.to,
                chunkSize: args.chunkSize,
                format: 'bson',
                compress: 'none',
                quiet: args.quiet,
                multiDatabase: args.multiDatabase,
                filter: args.filter,
                rename: args.rename,
                ignoreNonEmpty: args.ignoreNonEmpty,
                prune: args.prune
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