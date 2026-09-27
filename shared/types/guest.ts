/** Someone on the guest list. The name may also stand for a couple or a family, e.g. "Ana și Mihai". */
export interface Guest {
  id: number
  name: string
}

export interface AdminGuest extends Guest {
  /** In how many gifts this guest is listed. */
  pickCount: number
  phone: string | null
}

/** A guest list entry with a phone number, shown to other guests once they have chosen who they are. */
export interface DirectoryGuest extends Guest {
  phone: string | null
}
