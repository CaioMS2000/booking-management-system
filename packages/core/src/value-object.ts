export abstract class ValueObject<ValueType> {
	protected readonly _value: ValueType

	protected constructor(value: ValueType) {
		this._value = value
	}

	public get value() {
		return this._value
	}

	public equals(vo: ValueObject<unknown>) {
		if (vo === null || vo === undefined) {
			return false
		}

		if (vo._value === undefined) {
			return false
		}

		return JSON.stringify(vo._value) === JSON.stringify(this._value)
	}
}
