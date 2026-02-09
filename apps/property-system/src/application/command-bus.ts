import { CommandHandlerNotFoundError } from './@errors'
import { Command, CommandHandler } from './command'

export class CommandBus {
	private handlers: Map<string, CommandHandler<any>> = new Map()

	register<T>(command: Command<T>, handler: CommandHandler<T>) {
		this.handlers.set(command.constructor.name, handler)
	}

	async execute<T>(command: Command<T>): Promise<T> {
		const key = command.constructor.name
		const handler = this.handlers.get(key) as CommandHandler<T> | undefined

		if (!handler) {
			throw new CommandHandlerNotFoundError(`Handler for ${key} not found`)
		}

		return await handler.execute(command)
	}
}
