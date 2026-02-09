// import { appContext } from '@/application-context'
import { UniqueEntityID } from '@repo/core'

export abstract class BasicCommand {
	protected constructor(public readonly id: UniqueEntityID) {}

	// Exemple
	// static async create(id?: UniqueEntityID): Promise<Command>{
	//     let resolvedId: UniqueEntityID
	//     if(id){
	//         resolvedId = id
	//     } else {
	//         const context = appContext.get()
	//         const idGenerator = context.idGenerator.V4
	//         const newId = await idGenerator.generate()
	//         resolvedId = newId
	//     }
	//     return new Command(resolvedId)
	// }
}

export abstract class CommandWithResult<ResultType> {
	readonly resultType?: ResultType
	protected constructor(public readonly id: UniqueEntityID) {}
}

export type Command<ResultType = unknown> =
	| BasicCommand
	| CommandWithResult<ResultType>

export abstract class CommandHandler<T = unknown> {
	abstract execute(command: Command<T>): Promise<T>
}
