import yargs from 'yargs';
import dateFormat from 'dateformat';

export interface IBaseArgs {
    chunkSize: number;
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
                default: `backup_${dateFormat(new Date(), 'yyyy-mm-dd_HH:MM')}.bson`
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
        .parse(argv.slice(2)) as any;


    switch (args._[0]) {
        case 'backup':
            return {
                cmd: 'backup',
                url: args.url,
                file: args.file,
                chunkSize: args.chunkSize
            }
        case 'restore':
            return {
                cmd: 'restore',
                url: args.url,
                file: args.file,
                chunkSize: args.chunkSize
            }
    }

    throw new Error(`Unknown command "${args._[0]}"`);
}