import { Command, CommandHandler, CommandResult } from './command'
import { CommandHandlerNotFoundError } from './@errors'

type CommandClass<T extends Command<any>> = abstract new (...args: any[]) => T

export class CommandBus {
	private handlers = new Map<CommandClass<any>, CommandHandler<any>>()

	register<TCommand extends Command<any>>(
		commandClass: CommandClass<TCommand>,
		handler: CommandHandler<TCommand>
	) {
		this.handlers.set(commandClass, handler)
	}

	async execute<TCommand extends Command<any>>(
		command: TCommand
	): Promise<CommandResult<TCommand>> {
		const handler = this.handlers.get(
			command.constructor as CommandClass<TCommand>
		) as CommandHandler<TCommand> | undefined

		if (!handler) {
			throw new CommandHandlerNotFoundError(
				`Handler for ${command.constructor.name} not found`
			)
		}

		return await handler.execute(command)
	}
}
