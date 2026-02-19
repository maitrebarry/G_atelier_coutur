import api from './api';

export const fetchCurrentSubscription = async () => {
  const res = await api.get('/subscription/current');
  return res.data;
};

export const fetchSubscriptionPlans = async () => {
  const res = await api.get('/subscription/plans');
  return res.data;
};

export const fetchSubscriptionPayments = async () => {
  const res = await api.get('/subscription/payments');
  return res.data;
};

export const initiateSubscriptionPayment = async (payload) => {
  const res = await api.post('/subscription/payments/initiate', payload || {});
  return res.data;
};

export const submitManualSubscriptionPayment = async ({
  planCode,
  modePaiement,
  transactionRef,
  ownerNote,
  receipt
}) => {
  const formData = new FormData();
  formData.append('planCode', planCode);
  if (modePaiement) formData.append('modePaiement', modePaiement);
  if (transactionRef) formData.append('transactionRef', transactionRef);
  if (ownerNote) formData.append('ownerNote', ownerNote);
  formData.append('receipt', receipt);

  const res = await api.post('/subscription/payments/manual-submit', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return res.data;
};
