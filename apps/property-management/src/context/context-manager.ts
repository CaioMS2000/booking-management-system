import { AsyncLocalStorage } from 'node:async_hooks'

export class ContextNotFoundError extends Error {
	constructor(
		msg = 'Context not initialized. Ensure you are within a context.run() scope.'
	) {
		super(msg)
		this.name = 'ContextNotFoundError'
	}
}

export class ContextManager<TContext extends Record<string, unknown>> {
	private readonly storage = new AsyncLocalStorage<TContext>()

	run<R>(context: TContext, fn: () => R): R {
		return this.storage.run(context, fn)
	}

	get(): TContext {
		const store = this.storage.getStore()
		if (!store) throw new ContextNotFoundError()
		return store
	}

	getStore(): TContext | undefined {
		return this.storage.getStore()
	}

	enterWith(context: TContext): void {
		this.storage.enterWith(context)
	}

	hasContext(): boolean {
		return this.storage.getStore() !== undefined
	}
}
