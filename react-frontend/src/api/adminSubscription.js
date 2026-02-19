import api from './api';

export const fetchAdminSubscriptionPlans = async () => {
  const res = await api.get('/admin/subscriptions/plans');
  return res.data;
};

export const createAdminSubscriptionPlan = async (payload) => {
  const res = await api.post('/admin/subscriptions/plans', payload);
  return res.data;
};

export const updateAdminSubscriptionPlan = async (code, payload) => {
  const res = await api.put(`/admin/subscriptions/plans/${encodeURIComponent(code)}`, payload);
  return res.data;
};

export const deleteAdminSubscriptionPlan = async (code) => {
  const res = await api.delete(`/admin/subscriptions/plans/${encodeURIComponent(code)}`);
  return res.data;
};

export const fetchAdminAtelierSubscriptions = async () => {
  const res = await api.get('/admin/subscriptions/ateliers');
  return res.data;
};

export const activateAdminAtelierSubscription = async (atelierId, payload) => {
  const res = await api.post(`/admin/subscriptions/ateliers/${atelierId}/activate`, payload || {});
  return res.data;
};

export const suspendAdminAtelierSubscription = async (atelierId) => {
  const res = await api.post(`/admin/subscriptions/ateliers/${atelierId}/suspend`);
  return res.data;
};

export const updateAdminAtelierSubscriptionDates = async (atelierId, payload) => {
  const res = await api.put(`/admin/subscriptions/ateliers/${atelierId}/dates`, payload);
  return res.data;
};

export const fetchAdminSubscriptionPayments = async (status) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await api.get(`/admin/subscriptions/payments${query}`);
  return res.data;
};

export const approveAdminSubscriptionPayment = async (paymentId) => {
  const res = await api.post(`/admin/subscriptions/payments/${paymentId}/approve`);
  return res.data;
};

export const rejectAdminSubscriptionPayment = async (paymentId, reason) => {
  const res = await api.post(`/admin/subscriptions/payments/${paymentId}/reject`, { reason });
  return res.data;
};
