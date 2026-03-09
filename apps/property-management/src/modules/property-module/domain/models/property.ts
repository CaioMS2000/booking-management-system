import {
	Address,
	Class,
	IdGenerator,
	IncrementalIdGenerator,
	Optional,
	PropertyType,
	UniqueId,
} from '@repo/core'

export type PropertyProps = {
	id: UniqueId
	hostId: UniqueId
	publicId: number
	name: string
	description: string
	capacity: number
	propertyType: PropertyType
	address: Address
	imagesUrls: string[]
	deletedAt: Date | null
}

export type PropertyCreateInput = Omit<
	Optional<PropertyProps, 'imagesUrls' | 'deletedAt'>,
	'id' | 'publicId'
>

export type PropertyUpdateInput = Partial<
	Pick<
		PropertyProps,
		| 'name'
		| 'description'
		| 'capacity'
		| 'propertyType'
		| 'address'
		| 'imagesUrls'
	>
>

type CreateParams = {
	idGenerator: IdGenerator
	incrementalIdGenerator: IncrementalIdGenerator
	input: PropertyCreateInput
	id?: UniqueId
}

export class Property extends Class<PropertyProps> {
	constructor(protected readonly props: PropertyProps) {
		super()
	}

	get id() {
		return this.props.id
	}

	get hostId() {
		return this.props.hostId
	}

	get name() {
		return this.props.name
	}

	get description() {
		return this.props.description
	}

	get capacity() {
		return this.props.capacity
	}

	get type() {
		return this.props.propertyType
	}

	get publicId() {
		return this.props.publicId
	}

	get address() {
		return this.props.address
	}

	get imagesUrls() {
		return this.props.imagesUrls
	}

	get deletedAt() {
		return this.props.deletedAt
	}

	get isDeleted() {
		return this.props.deletedAt !== null
	}

	update(input: PropertyUpdateInput): Property {
		return new Property({
			...this.props,
			...input,
		})
	}

	delete(): Property {
		return new Property({
			...this.props,
			deletedAt: new Date(),
		})
	}

	static async create({
		input,
		idGenerator,
		incrementalIdGenerator,
		id,
	}: CreateParams) {
		const {
			hostId,
			name,
			description,
			capacity,
			address,
			propertyType,
			imagesUrls = [],
			deletedAt = null,
		} = input

		const publicId = await incrementalIdGenerator.generate()

		if (!id) {
			id = await idGenerator.generate()
		}

		return new Property({
			id,
			hostId,
			name,
			description,
			capacity,
			address,
			propertyType,
			publicId,
			imagesUrls,
			deletedAt,
		})
	}
}
