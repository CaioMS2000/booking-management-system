import { Class } from '@repo/core'

type SystemSettingProps = {
	createdAt: Date
	updatedAt: Date
	value: unknown
	description: string | null
	key: string
	updatedBy: string | null
	deletedAt: Date | null
}

export class SystemSetting extends Class<SystemSettingProps> {
	constructor(protected props: SystemSettingProps) {
		super()
	}

	static create(input: SystemSettingProps) {
		return new SystemSetting(input)
	}

	get createdAt() {
		return this.props.createdAt
	}

	get updatedAt() {
		return this.props.updatedAt
	}

	get value() {
		return this.props.value
	}

	get description() {
		return this.props.description
	}

	get key() {
		return this.props.key
	}

	get updatedBy() {
		return this.props.updatedBy
	}

	get deletedAt() {
		return this.props.deletedAt
	}
}
