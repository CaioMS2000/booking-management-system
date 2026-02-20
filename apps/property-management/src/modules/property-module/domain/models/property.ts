import { Address, Class, Optional, PropertyType, UniqueId } from '@repo/core'

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
}

export type PropertyCreateInput = Optional<PropertyProps, 'imagesUrls'>

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

	static create(input: PropertyCreateInput) {
		const {
			hostId,
			id,
			name,
			description,
			capacity,
			address,
			propertyType,
			publicId,
			imagesUrls = [],
		} = input

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
		})
	}
}
