import { defineStore } from 'pinia'
import { roleService } from '@/services/roleService'

export const useRolesStore = defineStore('roles', {
  state: () => ({
    roles: [],
    currentRole: null,
    loading: false,
    error: null,
  }),

  getters: {
    allRoles: (state) => state.roles,
    getCurrentRole: (state) => state.currentRole,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    rolesCount: (state) => state.roles.length,
  },

  actions: {
    async fetchRoles() {
      this.loading = true
      this.error = null
      try {
        const response = await roleService.getRoles()
        this.roles = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des rôles'
        throw error
      } finally {
        this.loading = false
      }
    },

    async createRole(roleData) {
      this.loading = true
      this.error = null
      try {
        const response = await roleService.createRole(roleData)
        const newRole = response.data
        this.roles.push(newRole)
        return newRole
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la création du rôle'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateRole(id, roleData) {
      this.loading = true
      this.error = null
      try {
        const response = await roleService.updateRole(id, roleData)
        const updatedRole = response.data
        const index = this.roles.findIndex(r => r.idRole === id)
        if (index !== -1) {
          this.roles[index] = updatedRole
        }
        return updatedRole
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour du rôle'
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteRole(id) {
      this.loading = true
      this.error = null
      try {
        await roleService.deleteRole(id)
        this.roles = this.roles.filter(r => r.idRole !== id)
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la suppression du rôle'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})