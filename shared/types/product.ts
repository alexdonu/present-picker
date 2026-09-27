export interface PublicPick {
  id: number
  guestName: string
  quantity: number
  note: string | null
  /** True when the current visitor made this pick (and can therefore cancel it). */
  mine: boolean
  /** The guest's phone number, only once the visitor has chosen who they are; null otherwise or if unset. */
  phone: string | null
}

export interface PublicProduct {
  id: number
  name: string
  description: string | null
  link: string | null
  price: number | null
  image: string | null
  /** Sum of the quantities of all picks. */
  totalQuantity: number
  /** How many are needed in total; null means no limit. Once `totalQuantity` reaches it, nobody can pick more. */
  neededQuantity: number | null
  picks: PublicPick[]
}
