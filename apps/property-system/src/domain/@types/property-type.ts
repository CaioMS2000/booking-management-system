export const PropertyType = ['Apartment', 'House', 'Room'] as const
export type PropertyType = (typeof PropertyType)[number]
