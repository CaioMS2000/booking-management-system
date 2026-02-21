// export class UniqueEntityId {
// 	private value: string

// 	toString() {
// 		return this.value
// 	}

// 	toValue() {
// 		return this.value
// 	}

// 	constructor(value: string) {
// 		this.value = value
// 	}

// 	public equals(id: UniqueEntityId) {
// 		return id.toValue() === this.value
// 	}
// }

// export type UniqueEntityId = string & { __uniqueEntityIdBrand: never }
export type UniqueId = string & { readonly __brand: 'UniqueId' }
export const UniqueId = (id: string) => id as UniqueId
