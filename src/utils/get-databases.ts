import { Minimatch } from 'minimatch';

import { CouchDbApi } from './couchdb-api';

export async function getDatabases(url: string, filter?: string): Promise<string[]> {
    let dbs = await new CouchDbApi(url).allDbs();

    if (filter) {
        const mm = new Minimatch(filter);
        dbs = dbs.filter(db => mm.match(db));
    }

    return dbs;
}