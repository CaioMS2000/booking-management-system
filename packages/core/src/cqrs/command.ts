import { UniqueId } from '@repo/core'

export abstract class Command<TResult = void> {
	readonly __resultType?: TResult
	protected constructor(public readonly id: UniqueId) {}
}

export type CommandResult<T> = T extends Command<infer R> ? R : never

export abstract class CommandHandler<TCommand extends Command<any>> {
	abstract execute(command: TCommand): Promise<CommandResult<TCommand>>
}
