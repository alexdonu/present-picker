export interface PublicPick {
  id: number
  guestName: string
  quantity: number
  note: string | null
  /** True when the current visitor made this pick (and can therefore cancel it). */
  mine: boolean
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
  picks: PublicPick[]
}
