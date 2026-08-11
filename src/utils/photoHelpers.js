const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export const getPhotoUrl = (path) => {
  if (!path) return null
  
  // Si le chemin commence déjà par http, le retourner tel quel
  if (path.startsWith('http')) return path
  
  // Récupérer le token
  const token = localStorage.getItem('accessToken')
  
  // Construire l'URL avec le token en paramètre
  if (token) {
    return `${API_URL}/${path}?token=${token}`
  }
  
  return `${API_URL}/${path}`
}

// Version alternative : obtenir l'URL sans token
export const getPhotoUrlPublic = (path) => {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${API_URL}/${path}`
}

// Extraire le nom du fichier depuis le chemin
export const getFileName = (path) => {
  if (!path) return ''
  const parts = path.split('/')
  return parts[parts.length - 1]
}

// Vérifier si une photo existe
export const hasPhoto = (path) => {
  return !!path && path.trim() !== ''
}