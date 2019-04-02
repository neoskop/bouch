import yargs from 'yargs';
import dateFormat from 'dateformat';

export interface IBaseArgs {
    chunkSize: number;
    format: 'bson' | 'json';
    compress: 'none' | 'gz' | 'br';
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
                default: `backup_${dateFormat(new Date(), 'yyyy-mm-dd_HH:MM')}`
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
            choices: [ 'bson', 'json' ],
            default: 'bson'
        })
        .option('compress', {
            alias: 'C',
            describe: 'File compression',
            choices: [ 'none', 'gz', 'br' ],
            default: 'none'
        })
        .parse(argv.slice(2)) as any;


    switch (args._[0]) {
        case 'backup':
            return {
                cmd: 'backup',
                url: args.url,
                file: `${args.file}.${args.format}${args.compress !== 'none' ? `.${args.compress}` : ''}`,
                chunkSize: args.chunkSize,
                format: args.format,
                compress: args.compress
            }
        case 'restore':
            return {
                cmd: 'restore',
                url: args.url,
                file: args.file,
                chunkSize: args.chunkSize,
                format: args.format,
                compress: args.compress
            }
    }

    throw new Error(`Unknown command "${args._[0]}"`);
}