import { defineStore } from 'pinia'
import { permissionService } from '@/services/permissionService'

export const usePermissionsStore = defineStore('permissions', {
  state: () => ({
    permissions: [],
    currentPermission: null,
    loading: false,
    error: null,
  }),

  getters: {
    allPermissions: (state) => state.permissions,
    getCurrentPermission: (state) => state.currentPermission,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    permissionsCount: (state) => state.permissions.length,
  },

  actions: {
    // Charger toutes les permissions
    async fetchPermissions() {
      this.loading = true
      this.error = null
      try {
        const response = await permissionService.getPermissions()
        this.permissions = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des permissions'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger une permission par ID
    async fetchPermissionById(id) {
      this.loading = true
      this.error = null
      try {
        const response = await permissionService.getPermissionById(id)
        this.currentPermission = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement de la permission'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Créer une nouvelle permission
    async createPermission(permissionData) {
      this.loading = true
      this.error = null
      try {
        const response = await permissionService.createPermission(permissionData)
        const newPermission = response.data
        this.permissions.push(newPermission)
        return newPermission
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la création de la permission'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour une permission
    async updatePermission(id, permissionData) {
      this.loading = true
      this.error = null
      try {
        const response = await permissionService.updatePermission(id, permissionData)
        const updatedPermission = response.data
        const index = this.permissions.findIndex(p => p.idPermission === id)
        if (index !== -1) {
          this.permissions[index] = updatedPermission
        }
        if (this.currentPermission?.idPermission === id) {
          this.currentPermission = updatedPermission
        }
        return updatedPermission
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour de la permission'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Supprimer une permission
    async deletePermission(id) {
      this.loading = true
      this.error = null
      try {
        await permissionService.deletePermission(id)
        this.permissions = this.permissions.filter(p => p.idPermission !== id)
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la suppression de la permission'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Réinitialiser l'état
    resetState() {
      this.permissions = []
      this.currentPermission = null
      this.error = null
      this.loading = false
    }
  }
})