import fs from 'fs';

export function rename(name: string, code?: string) : string {
    if(!code) {
        return name;
    }
    if(code.startsWith('@')) {
        code = fs.readFileSync(code.substr(1), 'utf8');
    }

    return new Function('name', code.includes('return') ? code : `return ${code}`)(name);
}