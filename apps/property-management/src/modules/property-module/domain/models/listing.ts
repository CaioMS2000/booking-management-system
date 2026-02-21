import { Class, DateInterval, Money, Optional, UniqueId } from '@repo/core'
import { appContext } from '@/application-context'

export type ListingProps = {
	id: UniqueId
	propertyId: UniqueId
	publicId: number
	pricePerNight: Money
	intervals: DateInterval[]
	deletedAt: Date | null
}

export type ListingCreateInput = Omit<
	Optional<ListingProps, 'intervals' | 'deletedAt'>,
	'id' | 'publicId'
>

export type ListingUpdateInput = Partial<
	Pick<ListingProps, 'pricePerNight' | 'intervals'>
>

export class Listing extends Class<ListingProps> {
	constructor(protected readonly props: ListingProps) {
		super()
	}

	static async create(input: ListingCreateInput, id?: UniqueId) {
		const {
			pricePerNight,
			propertyId,
			intervals = [],
			deletedAt = null,
		} = input
		const context = appContext.get()
		const publicId = await context.idGenerator.Incremental.generate()

		if (!id) {
			id = await context.idGenerator.V7.generate()
		}

		return new Listing({
			id,
			propertyId,
			pricePerNight,
			publicId,
			intervals,
			deletedAt,
		})
	}

	update(input: ListingUpdateInput): Listing {
		return new Listing({
			...this.props,
			...input,
		})
	}

	delete(): Listing {
		return new Listing({
			...this.props,
			deletedAt: new Date(),
		})
	}

	get id() {
		return this.props.id
	}

	get propertyId() {
		return this.props.propertyId
	}

	get publicId() {
		return this.props.publicId
	}

	get pricePerNight() {
		return this.props.pricePerNight
	}

	get intervals() {
		return this.props.intervals
	}

	get deletedAt() {
		return this.props.deletedAt
	}

	get isDeleted() {
		return this.props.deletedAt !== null
	}
}
