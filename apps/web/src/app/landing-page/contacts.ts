/**
 * Contatti pubblici dello studio, usati dai bottoni icona del finale.
 * Finché telefono/Instagram sono vuoti i bottoni restano visibili e portano al form (#contatti).
 */
export const CONTACTS = {
  email: 'childhood.friendship.official@gmail.com',
  /** Formato internazionale, es. '+39 333 1234567'. */
  phone: '',
  /** Solo l'handle, senza @, es. 'childhoodfriendship'. */
  instagram: ''
} as const;
