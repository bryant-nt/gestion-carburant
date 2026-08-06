export const routes = [
  { path: '/', redirect: '/dashboard' },
  {
    path: '/',
    component: () => import('@/layouts/default.vue'),
    children: [
      {
        path: 'dashboard',
        component: () => import('@/pages/dashboard.vue'),
      },
      {
        path: 'account-settings',
        component: () => import('@/pages/account-settings.vue'),
      },
      {
        path: 'typography',
        component: () => import('@/pages/typography.vue'),
      },
      {
        path: 'icons',
        component: () => import('@/pages/icons.vue'),
      },
      {
        path: 'cards',
        component: () => import('@/pages/cards.vue'),
      },
      {
        path: 'tables',
        component: () => import('@/pages/tables.vue'),
      },
      {
        path: 'form-layouts',
        component: () => import('@/pages/form-layouts.vue'),
      },
       {
        path: 'roles',
        component: () => import('@/pages/RolesList.vue'),
      
      },
      {
        path: 'permissions',
        component: () => import('@/pages/PermissionsList.vue'),
       
      },
      {
        path: 'stations',
        component: () => import('@/pages/StationsList.vue'),
       
      },

      {
        path: 'types-carburant',
        component: () => import('@/pages/TypeCarburantList.vue'),
        
      },

      {
        path: 'types-equipement',
        component: () => import('@/pages/TypeEquipementList.vue'),
       
      },

      {
        path: 'statuts-equipement',
        component: () => import('@/pages/StatutEquipementList.vue'),
        
      },

      {
        path: 'etats-equipement',
        component: () => import('@/pages/EquipementEtatList.vue'),
      },

      {
        path: 'unites',
        component: () => import('@/pages/UnitesList.vue'),
      },

      {
        path: 'seuils-carburant',
        component: () => import('@/pages/SeuilCarburantList.vue'),
      },

      {
  path: 'stock-carburant',
  component: () => import('@/pages/StockCarburantList.vue'),

},

{
  path: 'historique-achats',
  component: () => import('@/pages/HistoriqueAchats.vue'),
},

{
  path: 'users',
  component: () => import('@/pages/UsersList.vue'),
},
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/blank.vue'),
    children: [
      {
        path: 'login',
        component: () => import('@/pages/login.vue'),
        meta: { public: true },
      },
      {
        path: 'register',
        component: () => import('@/pages/register.vue'),
        meta: { public: true },
      },
      {
        path: '/:pathMatch(.*)*',
        component: () => import('@/pages/[...error].vue'),
        meta: { public: true },
      },
    ],
  },
]