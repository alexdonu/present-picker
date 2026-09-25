// Details about the party, shown on the guest page. Every value is optional:
// leave one empty ('') and the part of the page that shows it disappears.
export default defineAppConfig({
  event: {
    /** Who is throwing the party, e.g. 'Ana & Mihai'. Shown in the top bar and as the signature at the bottom. */
    hosts: 'Alexandru și Luminița',
    /** e.g. 'Sâmbătă, 11 octombrie, de la 18:00' */
    when: '',
    /** e.g. 'Str. Exemplu 12, București' */
    where: '',
    /** Free text after "Confirmă", e.g. 'până pe 1 octombrie' */
    rsvpBy: '',
    /** Phone or e-mail for questions. */
    contact: '',
  },
})
