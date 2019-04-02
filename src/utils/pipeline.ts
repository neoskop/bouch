export type Middleware<I, O> = (input : I) => O;

export class Pipeline<INPUT, STEPINPUT = INPUT, STEPOUTPUT = INPUT> {
    constructor();
    constructor(parent: Pipeline<INPUT, any, STEPINPUT>, middleware : Middleware<STEPINPUT, STEPOUTPUT>);
    constructor(protected readonly parent? : Pipeline<INPUT, any, STEPINPUT>,
                protected readonly middleware? : Middleware<STEPINPUT, STEPOUTPUT>) {

    }

    transform(input : INPUT) : STEPOUTPUT {
        if(this.parent && this.middleware) {
            const value = this.parent.transform(input);
            return this.middleware(value);
        }

        return input as unknown as STEPOUTPUT;
    }

    use<N>(middleware : Middleware<STEPOUTPUT, N>) {
        return new Pipeline<INPUT, STEPOUTPUT, N>(this, middleware);
    }
}