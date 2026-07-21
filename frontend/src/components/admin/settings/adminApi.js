import axios from "axios";

// Thin wrapper around the /api/admin/* Phase A endpoints.
const adminApi = {
  getDashboard: () => axios.get("/admin/dashboard").then((r) => r.data),

  getBusinessSettings: () => axios.get("/admin/business-settings").then((r) => r.data),
  updateBusinessSettings: (data) => axios.put("/admin/business-settings", data).then((r) => r.data),

  getHours: () => axios.get("/admin/hours").then((r) => r.data),
  updateHours: (operating_hours) => axios.put("/admin/hours", { operating_hours }).then((r) => r.data),
  copyHours: (source_day, target_days) => axios.post("/admin/hours/copy", { source_day, target_days }).then((r) => r.data),

  getPublicHolidays: () => axios.get("/admin/public-holidays").then((r) => r.data),
  updatePublicHoliday: (key, data) => axios.put(`/admin/public-holidays/${key}`, data).then((r) => r.data),

  getClosures: () => axios.get("/admin/closures").then((r) => r.data),
  createClosure: (data) => axios.post("/admin/closures", data).then((r) => r.data),
  updateClosure: (id, data) => axios.put(`/admin/closures/${id}`, data).then((r) => r.data),
  deleteClosure: (id) => axios.delete(`/admin/closures/${id}`).then((r) => r.data),

  getCategories: (params) => axios.get("/admin/categories", { params }).then((r) => r.data),
  createCategory: (data) => axios.post("/admin/categories", data).then((r) => r.data),
  updateCategory: (id, data) => axios.put(`/admin/categories/${id}`, data).then((r) => r.data),
  reorderCategories: (ordered_ids) => axios.put("/admin/categories/reorder", { ordered_ids }).then((r) => r.data),
  deleteCategory: (id, params) => axios.delete(`/admin/categories/${id}`, { params }).then((r) => r.data),

  getServices: (params) => axios.get("/admin/services", { params }).then((r) => r.data),
  getService: (id) => axios.get(`/admin/services/${id}`).then((r) => r.data),
  createService: (data) => axios.post("/admin/services", data).then((r) => r.data),
  updateService: (id, data) => axios.put(`/admin/services/${id}`, data).then((r) => r.data),
  archiveService: (id) => axios.delete(`/admin/services/${id}`).then((r) => r.data),
  duplicateService: (id) => axios.post(`/admin/services/${id}/duplicate`).then((r) => r.data),
  bulkServiceAction: (data) => axios.post("/admin/services/bulk", data).then((r) => r.data),

  getPricing: (params) => axios.get("/admin/pricing", { params }).then((r) => r.data),
  updatePricing: (serviceId, data) => axios.put(`/admin/pricing/${serviceId}`, data).then((r) => r.data),
  bulkUpdatePricing: (data) => axios.post("/admin/pricing/bulk-update", data).then((r) => r.data),
  getPricingHistory: (params) => axios.get("/admin/pricing/history", { params }).then((r) => r.data),
  applyScheduledPrice: (historyId) => axios.post(`/admin/pricing/history/${historyId}/apply`).then((r) => r.data),

  getDepositRules: () => axios.get("/admin/deposit-rules").then((r) => r.data),
  updateDepositRules: (data) => axios.put("/admin/deposit-rules", data).then((r) => r.data),

  getPolicies: () => axios.get("/admin/policies").then((r) => r.data),
  getPolicy: (type) => axios.get(`/admin/policies/${type}`).then((r) => r.data),
  updatePolicy: (type, data) => axios.put(`/admin/policies/${type}`, data).then((r) => r.data),
  getPolicyHistory: (type) => axios.get(`/admin/policies/${type}/history`).then((r) => r.data),

  getChangeLog: (params) => axios.get("/admin/change-log", { params }).then((r) => r.data),
};

export default adminApi;
