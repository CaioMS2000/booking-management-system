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

export type Result<L, R> = Failure<L, R> | Success<L, R>

export const failure = <L>(value: L): Result<L, never> => {
	return new Failure(value)
}

export const success = <R>(value: R): Result<never, R> => {
	return new Success(value)
}
