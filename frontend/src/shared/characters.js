// Animated barber characters. The salon picks one per staff member and the
// booking widget plays it in the avatar circle. Keys are stored on the staff
// record; the clips are static assets under /characters.
export const CHARACTERS = [
  { key: 'male-red', label: 'Red (male)' },
  { key: 'male-blue', label: 'Blue (male)' },
  { key: 'male-green', label: 'Green (male)' },
  { key: 'male-black', label: 'Black (male)' },
  { key: 'male-yellow', label: 'Yellow (male)' },
  { key: 'female-blue', label: 'Blue (female)' },
  { key: 'female-red', label: 'Red (female)' },
  { key: 'female-purple', label: 'Purple (female)' },
]

const KEYS = new Set(CHARACTERS.map((character) => character.key))

/** Clip URL for a stored key, or '' when the key is missing or unknown. */
export function characterVideo(key) {
  return key && KEYS.has(key) ? `/characters/${key}.mp4` : ''
}
