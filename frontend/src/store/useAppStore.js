import { create } from 'zustand';

const INITIAL_FORM = {
  repoName: '',
  namespaceId: '',
  description: '',
  visibility: 'private',
  // one selection per category (null = nothing chosen yet)
  platform: null,
  projectType: null,
  projectTypeConfig: {},
  iac: null,
  infra: null,
  cicd: null,
  // array of selected feature ids
  features: [],
  // governance
  team: '',
  costCenter: '',
};

const useAppStore = create((set) => ({
  // ── Navigation ────────────────────────────────────────────────────────────
  /** 'create' | 'dashboard' | 'ci-templates' */
  currentPage: 'create',
  setCurrentPage: (page) => set({ currentPage: page }),

  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // ── Form ─────────────────────────────────────────────────────────────────
  form: { ...INITIAL_FORM },

  updateForm: (patch) =>
    set((s) => ({ form: { ...s.form, ...patch } })),

  /** Pre-fill the create form from a cloned project record (Dashboard → Create). */
  presetForm: (preset) =>
    set({
      form: { ...INITIAL_FORM, ...preset },
      currentPage: 'create',
    }),

  /** Update one key inside projectTypeConfig */
  setProjectTypeConfig: (key, value) =>
    set((s) => ({
      form: {
        ...s.form,
        projectTypeConfig: { ...s.form.projectTypeConfig, [key]: value },
      },
    })),

  /** Replace the whole config (used when switching project type to reset to defaults) */
  resetProjectTypeConfig: (defaults = {}) =>
    set((s) => ({ form: { ...s.form, projectTypeConfig: defaults } })),

  toggleFeature: (featureId) =>
    set((s) => ({
      form: {
        ...s.form,
        features: s.form.features.includes(featureId)
          ? s.form.features.filter((id) => id !== featureId)
          : [...s.form.features, featureId],
      },
    })),

  resetForm: () => set({ form: { ...INITIAL_FORM } }),

  // ── Success modal ─────────────────────────────────────────────────────────
  showSuccess: false,
  createdProject: null,
  openSuccess: (project) => set({ showSuccess: true, createdProject: project }),
  closeSuccess: () => set({ showSuccess: false, createdProject: null }),
}));

export default useAppStore;
