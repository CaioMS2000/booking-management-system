export type Resources = {
	[key: string]: unknown
}

export abstract class Class<T extends Resources> {
	protected abstract readonly resources: T
}

function printIt(x: any) {
	console.log(x)
}

type SomeClassResources = {
	someProperty: string
	someFunction: (...args: any[]) => void
}

class SomeClass extends Class<SomeClassResources> {
	constructor(protected readonly resources: SomeClassResources) {
		super()
	}
	get someProperty() {
		return this.resources.someProperty
	}

	someFunction(...args: any[]) {
		return this.resources.someFunction(...args)
	}
}
const x = new SomeClass({
	someProperty: 'Any string value, does not matter what',
	someFunction: printIt,
})
