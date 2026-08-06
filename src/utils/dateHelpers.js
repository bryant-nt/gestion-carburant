// Convertir un tableau de date en objet Date
export const arrayToDate = (dateArray) => {
  if (!dateArray || !Array.isArray(dateArray) || dateArray.length === 0) {
    return null
  }
  // [année, mois, jour, heure, minute, seconde]
  const [year, month, day, hour, minute, second] = dateArray
  return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0)
}

// Formater une date en string local
export const formatDate = (dateArray) => {
  if (!dateArray || !Array.isArray(dateArray) || dateArray.length === 0) {
    return '-'
  }
  const date = arrayToDate(dateArray)
  if (!date) return '-'
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Formater seulement la date (sans heure)
export const formatDateOnly = (dateArray) => {
  if (!dateArray || !Array.isArray(dateArray) || dateArray.length === 0) {
    return '-'
  }
  const date = arrayToDate(dateArray)
  if (!date) return '-'
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}