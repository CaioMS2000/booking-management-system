type ConstructorWithGenerics<T> = new (...args: any[]) => T
type Constructor = new (...args: any[]) => any

function isConstructor(value: unknown): value is Constructor {
	try {
		Reflect.construct(String, [], value as any)
		return true
	} catch {
		return false
	}
}

// Error
export class Failure<L, R> {
	readonly value: L

	constructor(value: L) {
		this.value = value
	}

	isSuccess(): this is Success<L, R> {
		return false
	}

	isFailure(): this is Failure<L, R> {
		return true
	}
}

// Success
export class Success<L, R> {
	readonly value: R

	constructor(value: R) {
		this.value = value
	}

	isSuccess(): this is Success<L, R> {
		return true
	}

	isFailure(): this is Failure<L, R> {
		return false
	}
}

export type Either<L, R> = Failure<L, R> | Success<L, R>

export function failure<L extends Constructor>(
	value: L
): Either<InstanceType<L>, never>
export function failure<L>(value: L): Either<L, never>
export function failure<L>(value: L | Constructor): Either<any, never> {
	if (isConstructor(value)) {
		return new Failure(new value())
	}

	return new Failure(value)
}

export function success<R extends Constructor>(
	value: R
): Either<never, InstanceType<R>>
export function success<R>(value: R): Either<never, R>
export function success<R>(value: R | Constructor): Either<never, any> {
	if (isConstructor(value)) {
		return new Success(new value())
	}

	return new Success(value)
}
