import { IdGenerator, UniqueId } from '@repo/core'
import {
	Reservation,
	ReservationCreateInput,
} from '@/modules/booking-module/domain/models/reservation'
import { FakeIdGenerator } from '@/modules/property-module/test/fake-id-generator'

type MakeReservationParams = {
	listingId: UniqueId
	overrides?: Partial<ReservationCreateInput>
	idGenerator?: IdGenerator
}

export async function makeReservation({
	listingId,
	overrides,
	idGenerator,
}: MakeReservationParams): Promise<Reservation> {
	const generator = idGenerator ?? new FakeIdGenerator()

	const from = new Date('2026-04-01')
	const to = new Date('2026-04-05')

	const props: ReservationCreateInput = {
		listingId,
		guestId: await generator.generate(),
		period: { from, to },
		totalPrice: { valueInCents: 60000, currency: 'BRL' },
		...overrides,
	}

	return Reservation.create({
		input: props,
		idGenerator: generator,
	})
}
