export type Props = {
	[key: string]: unknown
}

export abstract class Class<T extends Props> {
	protected abstract readonly props: T
}
