import {
	Class,
	DateInterval,
	failure,
	Money,
	Optional,
	ReservationPeriod,
	Result,
	success,
	UniqueId,
} from '@repo/core'
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

	isAvailableFor(period: ReservationPeriod, now: Date = new Date()): boolean {
		const activeIntervals = this.props.intervals.filter(
			i => !(i.status === 'HOLD' && i.expiresAt && now >= i.expiresAt)
		)

		return !activeIntervals.some(
			i =>
				(i.status === 'HOLD' ||
					i.status === 'RESERVED' ||
					i.status === 'BLOCKED') &&
				period.from < i.to &&
				period.to > i.from
		)
	}

	placeHold(
		period: ReservationPeriod,
		expiresAt: Date,
		now: Date = new Date()
	): Result<Error, Listing> {
		if (!this.isAvailableFor(period, now)) {
			return failure(new Error('Period is not available'))
		}

		const holdInterval: DateInterval = {
			from: period.from,
			to: period.to,
			status: 'HOLD',
			expiresAt,
		}

		return success(
			new Listing({
				...this.props,
				intervals: [...this.props.intervals, holdInterval],
			})
		)
	}

	confirmReservation(period: ReservationPeriod): Result<Error, Listing> {
		const holdIndex = this.props.intervals.findIndex(
			i =>
				i.status === 'HOLD' &&
				i.from.getTime() === period.from.getTime() &&
				i.to.getTime() === period.to.getTime()
		)

		if (holdIndex === -1) {
			return failure(new Error('No matching HOLD found for the given period'))
		}

		const updatedIntervals = [...this.props.intervals]
		updatedIntervals[holdIndex] = {
			from: period.from,
			to: period.to,
			status: 'RESERVED',
		}

		return success(
			new Listing({
				...this.props,
				intervals: updatedIntervals,
			})
		)
	}

	releaseInterval(period: ReservationPeriod): Result<Error, Listing> {
		const index = this.props.intervals.findIndex(
			i =>
				(i.status === 'HOLD' || i.status === 'RESERVED') &&
				i.from.getTime() === period.from.getTime() &&
				i.to.getTime() === period.to.getTime()
		)

		if (index === -1) {
			return failure(
				new Error(
					'No matching HOLD or RESERVED interval found for the given period'
				)
			)
		}

		const updatedIntervals = [...this.props.intervals]
		updatedIntervals.splice(index, 1)

		return success(
			new Listing({
				...this.props,
				intervals: updatedIntervals,
			})
		)
	}

	blockPeriod(
		period: ReservationPeriod,
		now: Date = new Date()
	): Result<Error, Listing> {
		if (!this.isAvailableFor(period, now)) {
			return failure(new Error('Period is not available'))
		}

		const blockedInterval: DateInterval = {
			from: period.from,
			to: period.to,
			status: 'BLOCKED',
		}

		return success(
			new Listing({
				...this.props,
				intervals: [...this.props.intervals, blockedInterval],
			})
		)
	}

	cleanupExpiredHolds(now: Date = new Date()): Listing {
		const activeIntervals = this.props.intervals.filter(
			i => !(i.status === 'HOLD' && i.expiresAt && now >= i.expiresAt)
		)

		return new Listing({
			...this.props,
			intervals: activeIntervals,
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
