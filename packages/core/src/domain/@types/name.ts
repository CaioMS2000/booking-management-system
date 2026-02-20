export type Name = string & { readonly __brand: 'Name' }
export const Name = (name: string) => name as Name
