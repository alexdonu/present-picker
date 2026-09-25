/** Someone on the guest list. The name may also stand for a couple or a family, e.g. "Ana și Mihai". */
export interface Guest {
  id: number
  name: string
}

export interface AdminGuest extends Guest {
  /** In how many gifts this guest is listed. */
  pickCount: number
}
