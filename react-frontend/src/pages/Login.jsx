import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { setAuthData } from '../api/api';
import Swal from 'sweetalert2';
import '../assets/css/index.css';
import { fetchSubscriptionPlans, submitManualSubscriptionPayment } from '../api/subscription';
import { fetchAdminSubscriptionPayments, approveAdminSubscriptionPayment, rejectAdminSubscriptionPayment } from '../api/adminSubscription';

const backgroundImages = [
  { url: '/assets/images/jupe0.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe1.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe2.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe4.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe5.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe6.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe7.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe8.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe9.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/jupe10.jpg', title: 'Collection Jupe' },
  { url: '/assets/images/model1.png', title: 'Modèle Exclusive' },
  { url: '/assets/images/model2.png', title: 'Modèle Exclusive' },
  { url: '/assets/images/model3.jpg', title: 'Nouvelle Collection' },
  { url: '/assets/images/model4.jpg', title: 'Nouvelle Collection' },
  { url: '/assets/images/model5.jpg', title: 'Nouvelle Collection' }
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      navigate('/home');
    }
  }, [navigate]);

  // Si l'utilisateur est marqué comme bloqué (après un login précédent), afficher le modal bloqué
  useEffect(() => {
    try {
      const blocked = localStorage.getItem('smb_sub_blocked') === '1';
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token || !blocked) return;
      void showBlockedSubscriptionFlow();
    } catch (e) {
      /* ignore */
    }
  }, []);

  // Carousel auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + backgroundImages.length) % backgroundImages.length);
  };

  // --- Bloqué / réabonnement (parité JAKO‑DANAYA) ---
  const openRenewSubscriptionModal = async () => {
    try {
      const plans = await fetchSubscriptionPlans();
      const planList = Array.isArray(plans) ? plans : [];
      const defaultPlanCode = planList[0]?.code || 'MENSUEL';
      const planOptions = planList.map(p => `<option value="${p.code}">${p.libelle} (${p.code}) - ${p.prix ?? '?'} ${p.devise ?? 'XOF'}</option>`).join('') || `<option value="MENSUEL">MENSUEL</option>`;

      const ask = await Swal.fire({
        title: 'Soumettre une preuve de réabonnement',
        html: `
          <label class="form-label mt-1">Formule d'abonnement</label>
          <select id="swal-sub-plan" class="swal2-input" style="margin:0 0 10px 0;width:100%">${planOptions}</select>
          <label class="form-label mt-1">Canal utilisé</label>
          <select id="swal-sub-mode" class="swal2-input" style="margin:0 0 10px 0;width:100%">
            <option value="ORANGE_MONEY">Orange Money</option>
            <option value="WAVE">Wave</option>
            <option value="MOBICASH">MobiCash</option>
          </select>

          <div id="swal-payment-numbers" style="margin:6px 0 10px 0; font-size:0.95rem; color:#444; display:flex; gap:8px; flex-wrap:wrap; align-items:center">
            <span style="color:#888; margin-right:6px">Numéros utiles :</span>
            <span id="swal-pn-loading">chargement...</span>
          </div>

          <label class="form-label">Référence transfert (optionnel)</label>
          <input id="swal-sub-ref" class="swal2-input" style="margin:0 0 10px 0;width:100%" placeholder="Ex: OM123456" />

          <label class="form-label">Preuve (photo reçu) — vous pouvez <b>prendre une photo</b> ci‑dessous ou joindre un fichier</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <div style="flex:1;min-width:220px">
              <video id="swal-video" autoplay playsinline style="width:100%;background:#000;border:1px solid #e9ecef;max-height:360px"></video>
              <div style="display:flex;gap:6px;margin-top:6px">
                <button id="swal-capture-btn" type="button" class="swal2-confirm swal2-styled" style="background:#0d6efd;border:none;padding:6px 10px">Prendre la photo</button>
                <button id="swal-reset-capture" type="button" class="swal2-cancel swal2-styled" style="background:#6c757d;border:none;padding:6px 10px">Réinitialiser</button>
              </div>
              <canvas id="swal-canvas" style="display:none"></canvas>
              <input type="hidden" id="swal-sub-proof-dataurl" />
            </div>
            <div style="flex:1;min-width:220px">
              <div style="margin-bottom:8px;color:#666">Aperçu :</div>
              <img id="swal-preview" src="" alt="preuve" style="width:100%;max-height:360px;object-fit:contain;border:1px solid #e9ecef;padding:6px;background:#fff" />
              <div style="margin-top:8px">
                <label class="form-label">Ou joindre un fichier</label>
                <input id="swal-sub-proof" type="file" accept="image/*" class="swal2-file" style="display:block;width:100%;margin-top:6px" />
              </div>
            </div>
          </div>

          <label class="form-label">Note (optionnel)</label>
          <input id="swal-sub-note" class="swal2-input" style="margin:0;width:100%" placeholder="Infos utiles" />
        `,
        showCancelButton: true,
        confirmButtonText: 'Soumettre',
        cancelButtonText: 'Annuler',
        didOpen: async (popup) => {
          // load manual payment numbers
          try {
            const init = await (await import('../api/subscription')).initiateSubscriptionPayment({ planCode: defaultPlanCode });
            const nums = init?.manualPaymentNumbers || null;
            const container = popup.querySelector('#swal-payment-numbers');
            const loading = popup.querySelector('#swal-pn-loading');
            if (loading) loading.remove();
            if (nums && typeof nums === 'object') {
              Object.keys(nums).forEach((k) => {
                const v = nums[k];
                const el = document.createElement('a');
                el.href = '#';
                el.dataset.payNumber = v;
                el.dataset.payProvider = k;
                el.style.marginRight = '8px';
                el.style.color = '#0d6efd';
                el.style.textDecoration = 'underline';
                el.innerText = `${k.replace('_', ' ')}: ${v}`;
                el.addEventListener('click', (ev) => {
                  ev.preventDefault();
                  try { navigator.clipboard.writeText(v); } catch (e) { /* ignore */ }
                  const refInput = popup.querySelector('#swal-sub-ref');
                  if (refInput) refInput.value = v;
                  el.innerText = `${k.replace('_', ' ')}: ${v} (copié)`;
                  setTimeout(() => { el.innerText = `${k.replace('_', ' ')}: ${v}`; }, 1200);
                });
                container.appendChild(el);
              });
            } else {
              const span = document.createElement('span');
              span.style.color = '#888';
              span.innerText = 'numéros indisponibles';
              container.appendChild(span);
            }
          } catch (e) {
            const popupEl = Swal.getPopup();
            const container = popupEl && popupEl.querySelector('#swal-payment-numbers');
            if (container) container.innerHTML = '<span style="color:#888">numéros indisponibles</span>';
          }

          // setup camera preview + capture
          try {
            const video = popup.querySelector('#swal-video');
            const preview = popup.querySelector('#swal-preview');
            const canvas = popup.querySelector('#swal-canvas');
            const captureBtn = popup.querySelector('#swal-capture-btn');
            const resetBtn = popup.querySelector('#swal-reset-capture');

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
                video.srcObject = stream;
                video.play().catch(() => {});
                popup._swalStream = stream;
              } catch (err) {
                if (captureBtn) captureBtn.style.display = 'none';
                if (video) video.style.display = 'none';
              }
            } else {
              if (captureBtn) captureBtn.style.display = 'none';
              if (video) video.style.display = 'none';
            }

            captureBtn?.addEventListener('click', () => {
              if (!video || !canvas) return;
              canvas.width = video.videoWidth || 1280;
              canvas.height = video.videoHeight || 720;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              preview.src = dataUrl;
              const hidden = popup.querySelector('#swal-sub-proof-dataurl');
              if (hidden) hidden.value = dataUrl;
              const fileInput = popup.querySelector('#swal-sub-proof');
              if (fileInput) fileInput.value = '';
            });

            resetBtn?.addEventListener('click', () => {
              const hidden = popup.querySelector('#swal-sub-proof-dataurl');
              if (hidden) hidden.value = '';
              const preview = popup.querySelector('#swal-preview');
              if (preview) preview.src = '';
            });
          } catch (e) {
            // ignore camera setup errors
          }
        },
        willClose: () => {
          const popup = Swal.getPopup();
          if (popup && popup._swalStream) {
            try { popup._swalStream.getTracks().forEach(t => t.stop()); } catch (e) { /* ignore */ }
            popup._swalStream = null;
          }
        },
        preConfirm: async () => {
          const selectedPlanCode = document.getElementById('swal-sub-plan')?.value;
          const mode = document.getElementById('swal-sub-mode')?.value;
          const ref = document.getElementById('swal-sub-ref')?.value;
          const note = document.getElementById('swal-sub-note')?.value;
          const fileInput = document.getElementById('swal-sub-proof');
          const dataUrl = document.getElementById('swal-sub-proof-dataurl')?.value;
          let file = (fileInput && fileInput.files && fileInput.files[0]) || null;
          if (!file && dataUrl) {
            try { const blob = await (await fetch(dataUrl)).blob(); file = new File([blob], 'capture.jpg', { type: blob.type || 'image/jpeg' }); } catch (e) { file = null; }
          }
          if (!selectedPlanCode) { Swal.showValidationMessage('Veuillez choisir la formule'); return null; }
          if (!mode) { Swal.showValidationMessage('Veuillez choisir le canal de paiement'); return null; }
          if (!file) { Swal.showValidationMessage('Veuillez joindre la photo du reçu'); return null; }
          return { selectedPlanCode, mode, ref: ref || '', note: note || '', file };
        }
      });

      if (!ask.isConfirmed || !ask.value) return;

      const payload = {
        planCode: ask.value.selectedPlanCode,
        modePaiement: ask.value.mode,
        transactionRef: ask.value.ref,
        ownerNote: ask.value.note,
        receipt: ask.value.file
      };
      await submitManualSubscriptionPayment(payload);
      await Swal.fire({ icon: 'success', title: 'Demande envoyée', text: 'Votre preuve a été soumise au SuperAdmin pour validation.' });
    } catch (e) {
      console.error(e);
      await Swal.fire({ icon: 'error', title: 'Erreur', text: e?.message || 'Impossible de soumettre la preuve.' });
    }
  };

  const showBlockedSubscriptionFlow = async (msg) => {
    const r = await Swal.fire({
      icon: 'warning',
      title: 'Abonnement expiré',
      text: msg || 'Votre abonnement est expiré. Veuillez renouveler pour continuer.',
      confirmButtonText: 'Se réabonner',
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    if (r.isConfirmed) {
      await openRenewSubscriptionModal();
    }
  };

  // SuperAdmin: show pending manual subscription payments at login (preview + approve/reject)
  const showSuperAdminPendingPayments = async () => {
    try {
      const rows = await fetchAdminSubscriptionPayments('PENDING');
      if (!Array.isArray(rows) || rows.length === 0) return;

      for (const p of rows.slice(0, 8)) {
        const html = `
          <div style="display:flex;gap:12px;align-items:flex-start">
            <div style="flex:1">
              <img src="${p.preuve_url || p.preuveUrl || ''}" alt="preuve" style="max-width:320px;max-height:320px;object-fit:contain;border:1px solid #e9ecef;padding:6px;background:#fff" />
            </div>
            <div style="flex:1;text-align:left">
              <div><strong>Référence</strong>: ${p.reference || ''}</div>
              <div><strong>Atelier</strong>: ${p.atelier_nom || p.atelierName || p.atelier_id || ''}</div>
              <div><strong>Plan</strong>: ${p.plan_code || ''}</div>
              <div><strong>Mode</strong>: ${p.mode_paiement || p.modePaiement || ''}</div>
              <div><strong>Transaction</strong>: ${p.transaction_ref || p.transactionRef || ''}</div>
              <div style="margin-top:8px;color:#555"><strong>Note propriétaire</strong>: ${p.owner_note || p.ownerNote || '—'}</div>
              <div style="margin-top:8px;color:#777;font-size:0.9rem">Soumis le: ${p.created_at || p.createdAt || ''}</div>
            </div>
          </div>
        `;

        const res = await Swal.fire({
          title: `Paiement en attente (${p.reference || p.id})`,
          html,
          showDenyButton: true,
          denyButtonText: 'Rejeter',
          confirmButtonText: 'Valider',
          cancelButtonText: 'Fermer',
          showCloseButton: true,
          focusDeny: false,
          width: 900
        });

        if (res.isConfirmed) {
          await approveAdminSubscriptionPayment(p.id || p.paymentId);
          await Swal.fire('Succès', 'Paiement validé', 'success');
          continue; // show next pending
        }
        if (res.isDenied) {
          const reason = await Swal.fire({
            title: 'Motif du rejet',
            input: 'text',
            inputPlaceholder: 'Saisir le motif (optionnel)',
            showCancelButton: true,
            confirmButtonText: 'Rejeter'
          });
          if (reason.isConfirmed) {
            await rejectAdminSubscriptionPayment(p.id || p.paymentId, reason.value || '');
            await Swal.fire('Succès', 'Paiement rejeté', 'success');
            continue;
          }
        }
        // if cancelled/closed -> stop processing further payments
        break;
      }
    } catch (e) {
      console.error('SuperAdmin pending payments check failed:', e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!email || !password) {
        Swal.fire('Champs manquants', 'Veuillez remplir tous les champs', 'error');
        return;
      }

      const res = await api.post('/auth/login', { email, password });
      const response = res.data || {};
      console.log('Login response:', response);

      const token = response.token || response.accessToken || response.authToken;
      if (!token) {
        throw new Error(response.error || response.message || 'Pas de token reçu');
      }

      // Fetch permissions
      let permissions = [];
      
      // 1. Check if permissions are already in the login response
      if (response.permissions && Array.isArray(response.permissions)) {
          permissions = response.permissions.map(p => typeof p === 'string' ? p : p.code);
      } else if (response.user && response.user.permissions && Array.isArray(response.user.permissions)) {
          permissions = response.user.permissions.map(p => typeof p === 'string' ? p : p.code);
      } else {
          // 2. Fetch from API
          try {
              const userId = response.id || response.user?.id;
              
              // Try the standard user endpoint first (likely accessible by the user)
              try {
                  const permRes = await api.get(`/utilisateurs/${userId}/permissions`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (Array.isArray(permRes.data)) {
                      permissions = permRes.data.map(p => p.code);
                  }
              } catch (e) {
                  console.log('Failed to fetch from /utilisateurs/... trying /admin/...');
                  // Fallback to admin endpoint (might fail for non-admins)
                  const permRes = await api.get(`/admin/utilisateurs/${userId}/permissions`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (Array.isArray(permRes.data)) {
                      permissions = permRes.data.map(p => p.code);
                  }
              }
          } catch (permErr) {
              console.warn('Could not fetch permissions:', permErr);
          }
      }
      
      console.log('Final Permissions loaded:', permissions);

      // Robust userData extraction to match Bootstrap logic
      const userData = {
        token: token,
        userId: response.id || response.user?.id,
        email: response.email || response.user?.email,
        prenom: response.prenom || response.user?.prenom,
        nom: response.nom || response.user?.nom,
        role: response.role || response.user?.role,
        atelierId: response.atelierId || response.user?.atelierId,
        permissions: permissions
      };

      setAuthData(token, userData, remember);

      // Afficher modal bloqué + possibilité de soumettre une preuve (logique JAKO‑DANAYA)
      const openRenewSubscriptionModal = async () => {
        try {
          const plans = await fetchSubscriptionPlans();
          const planList = Array.isArray(plans) ? plans : [];
          const defaultPlanCode = planList[0]?.code || 'MENSUEL';
          const planOptions = planList.map(p => `<option value="${p.code}">${p.libelle} (${p.code}) - ${p.prix ?? '?'} ${p.devise ?? 'XOF'}</option>`).join('') || `<option value="MENSUEL">MENSUEL</option>`;

          const ask = await Swal.fire({
            title: 'Soumettre une preuve de réabonnement',
            html: `
              <label class="form-label mt-1">Formule d'abonnement</label>
              <select id="swal-sub-plan" class="swal2-input" style="margin:0 0 10px 0;width:100%">${planOptions}</select>
              <label class="form-label mt-1">Canal utilisé</label>
              <select id="swal-sub-mode" class="swal2-input" style="margin:0 0 10px 0;width:100%">
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="WAVE">Wave</option>
                <option value="MOBICASH">MobiCash</option>
              </select>

              <div id="swal-payment-numbers" style="margin:6px 0 10px 0; font-size:0.95rem; color:#444; display:flex; gap:8px; flex-wrap:wrap; align-items:center">
                <span style="color:#888; margin-right:6px">Numéros utiles :</span>
                <span id="swal-pn-loading">chargement...</span>
              </div>

              <label class="form-label">Référence transfert (optionnel)</label>
              <input id="swal-sub-ref" class="swal2-input" style="margin:0 0 10px 0;width:100%" placeholder="Ex: OM123456" />

              <label class="form-label">Preuve (photo reçu) — vous pouvez <b>prendre une photo</b> ci‑dessous ou joindre un fichier</label>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <div style="flex:1;min-width:220px">
                  <video id="swal-video" autoplay playsinline style="width:100%;background:#000;border:1px solid #e9ecef;max-height:360px"></video>
                  <div style="display:flex;gap:6px;margin-top:6px">
                    <button id="swal-capture-btn" type="button" class="swal2-confirm swal2-styled" style="background:#0d6efd;border:none;padding:6px 10px">Prendre la photo</button>
                    <button id="swal-reset-capture" type="button" class="swal2-cancel swal2-styled" style="background:#6c757d;border:none;padding:6px 10px">Réinitialiser</button>
                  </div>
                  <canvas id="swal-canvas" style="display:none"></canvas>
                  <input type="hidden" id="swal-sub-proof-dataurl" />
                </div>
                <div style="flex:1;min-width:220px">
                  <div style="margin-bottom:8px;color:#666">Aperçu :</div>
                  <img id="swal-preview" src="" alt="preuve" style="width:100%;max-height:360px;object-fit:contain;border:1px solid #e9ecef;padding:6px;background:#fff" />
                  <div style="margin-top:8px">
                    <label class="form-label">Ou joindre un fichier</label>
                    <input id="swal-sub-proof" type="file" accept="image/*" class="swal2-file" style="display:block;width:100%;margin-top:6px" />
                  </div>
                </div>
              </div>

              <label class="form-label">Note (optionnel)</label>
              <input id="swal-sub-note" class="swal2-input" style="margin:0;width:100%" placeholder="Infos utiles" />
            `,
            showCancelButton: true,
            confirmButtonText: 'Soumettre',
            cancelButtonText: 'Annuler',
            didOpen: async (popup) => {
              try {
                const init = await (await import('../api/subscription')).initiateSubscriptionPayment({ planCode: defaultPlanCode });
                const nums = init?.manualPaymentNumbers || null;
                const container = popup.querySelector('#swal-payment-numbers');
                const loading = popup.querySelector('#swal-pn-loading');
                if (loading) loading.remove();
                if (nums && typeof nums === 'object') {
                  Object.keys(nums).forEach((k) => {
                    const v = nums[k];
                    const el = document.createElement('a');
                    el.href = '#';
                    el.dataset.payNumber = v;
                    el.dataset.payProvider = k;
                    el.style.marginRight = '8px';
                    el.style.color = '#0d6efd';
                    el.style.textDecoration = 'underline';
                    el.innerText = `${k.replace('_', ' ')}: ${v}`;
                    el.addEventListener('click', (ev) => {
                      ev.preventDefault();
                      try { navigator.clipboard.writeText(v); } catch (e) { /* ignore */ }
                      const refInput = popup.querySelector('#swal-sub-ref');
                      if (refInput) refInput.value = v;
                      el.innerText = `${k.replace('_', ' ')}: ${v} (copié)`;
                      setTimeout(() => { el.innerText = `${k.replace('_', ' ')}: ${v}`; }, 1200);
                    });
                    container.appendChild(el);
                  });
                } else {
                  const span = document.createElement('span');
                  span.style.color = '#888';
                  span.innerText = 'numéros indisponibles';
                  container.appendChild(span);
                }
              } catch (e) {
                const popupEl = Swal.getPopup();
                const container = popupEl && popupEl.querySelector('#swal-payment-numbers');
                if (container) container.innerHTML = '<span style="color:#888">numéros indisponibles</span>';
              }

              try {
                const video = popup.querySelector('#swal-video');
                const preview = popup.querySelector('#swal-preview');
                const canvas = popup.querySelector('#swal-canvas');
                const captureBtn = popup.querySelector('#swal-capture-btn');
                const resetBtn = popup.querySelector('#swal-reset-capture');

                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
                    video.srcObject = stream;
                    video.play().catch(() => {});
                    popup._swalStream = stream;
                  } catch (err) {
                    if (captureBtn) captureBtn.style.display = 'none';
                    if (video) video.style.display = 'none';
                  }
                } else {
                  if (captureBtn) captureBtn.style.display = 'none';
                  if (video) video.style.display = 'none';
                }

                captureBtn?.addEventListener('click', () => {
                  if (!video || !canvas) return;
                  canvas.width = video.videoWidth || 1280;
                  canvas.height = video.videoHeight || 720;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                  preview.src = dataUrl;
                  const hidden = popup.querySelector('#swal-sub-proof-dataurl');
                  if (hidden) hidden.value = dataUrl;
                  const fileInput = popup.querySelector('#swal-sub-proof');
                  if (fileInput) fileInput.value = '';
                });

                resetBtn?.addEventListener('click', () => {
                  const hidden = popup.querySelector('#swal-sub-proof-dataurl');
                  if (hidden) hidden.value = '';
                  const preview = popup.querySelector('#swal-preview');
                  if (preview) preview.src = '';
                });
              } catch (e) {
                // ignore camera setup errors
              }
            },
            willClose: () => {
              const popup = Swal.getPopup();
              if (popup && popup._swalStream) {
                try { popup._swalStream.getTracks().forEach(t => t.stop()); } catch (e) {}
                popup._swalStream = null;
              }
            },
            preConfirm: async () => {
              const selectedPlanCode = document.getElementById('swal-sub-plan')?.value;
              const mode = document.getElementById('swal-sub-mode')?.value;
              const ref = document.getElementById('swal-sub-ref')?.value;
              const note = document.getElementById('swal-sub-note')?.value;
              const fileInput = document.getElementById('swal-sub-proof');
              const dataUrl = document.getElementById('swal-sub-proof-dataurl')?.value;
              let file = (fileInput && fileInput.files && fileInput.files[0]) || null;
              if (!file && dataUrl) {
                try { const blob = await (await fetch(dataUrl)).blob(); file = new File([blob], 'capture.jpg', { type: blob.type || 'image/jpeg' }); } catch (e) { file = null; }
              }
              if (!selectedPlanCode) { Swal.showValidationMessage('Veuillez choisir la formule'); return null; }
              if (!mode) { Swal.showValidationMessage('Veuillez choisir le canal de paiement'); return null; }
              if (!file) { Swal.showValidationMessage('Veuillez joindre la photo du reçu'); return null; }
              return { selectedPlanCode, mode, ref: ref || '', note: note || '', file };
            }
          });

          if (!ask.isConfirmed || !ask.value) return;

          const payload = {
            planCode: ask.value.selectedPlanCode,
            modePaiement: ask.value.mode,
            transactionRef: ask.value.ref,
            ownerNote: ask.value.note,
            receipt: ask.value.file
          };
          await submitManualSubscriptionPayment(payload);
          await Swal.fire({ icon: 'success', title: 'Demande envoyée', text: 'Votre preuve a été soumise au SuperAdmin pour validation.' });
        } catch (e) {
          console.error(e);
          await Swal.fire({ icon: 'error', title: 'Erreur', text: e?.message || 'Impossible de soumettre la preuve.' });
        }
      };

      const showBlockedSubscriptionFlow = async (msg) => {
        const r = await Swal.fire({
          icon: 'warning',
          title: 'Abonnement expiré',
          text: msg || 'Votre abonnement est expiré. Veuillez renouveler pour continuer.',
          confirmButtonText: 'Se réabonner',
          allowOutsideClick: false,
          allowEscapeKey: false,
        });
        if (r.isConfirmed) {
          await openRenewSubscriptionModal();
        }
      };

      try {
        if (response.subscriptionBlocked) {
          localStorage.setItem('smb_sub_blocked', '1');
          await showBlockedSubscriptionFlow(response.subscriptionMessage);
          return; // bloquer la navigation vers /home
        }

        // fallback : interroger l'API subscription (ancienne logique)
        const subRes = await api.get('/subscription/current', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (subRes?.data?.blocked) {
          localStorage.setItem('smb_sub_blocked', '1');
          await showBlockedSubscriptionFlow(subRes?.data?.message);
          return;
        } else {
          localStorage.removeItem('smb_sub_blocked');
          // if SuperAdmin, show pending manual payments preview before redirect
          try {
            const role = userData.role || '';
            const perms = Array.isArray(userData.permissions) ? userData.permissions : [];
            if (String(role).toUpperCase() === 'SUPERADMIN' || perms.includes('SUPERADMIN')) {
              await showSuperAdminPendingPayments();
            }
          } catch (e) {
            /* ignore */
          }
          navigate('/home');
        }
      } catch (e) {
        navigate('/home');
      }
    } catch (err) {
      console.error('Login exception:', err);
      let text = 'Échec de connexion';
      if (err?.response?.data) {
        text = err.response.data.error || err.response.data.message || JSON.stringify(err.response.data);
      } else if (err?.message) {
        text = err.message;
      }
      if (text === 'Network Error') {
        text = 'Impossible de se connecter au serveur';
      }
      Swal.fire('Erreur', text, 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentImage = backgroundImages[currentImageIndex];

  return (
    <div className="split-screen">
      <div className="left-half">
        <div className="login-container">
          <div className="mb-4 text-center">
            <img
              src="/assets/images/logo_ateliko.png"
              style={{ width: '40%', maxWidth: 250, height: 'auto', objectFit: 'contain' }}
              alt="Logo"
            />
            <h3 className="logo-text">ATELIKO</h3>
          </div>

          <div className="login-separater text-center mb-4">
            <span>CONNEXION AVEC EMAIL</span>
            <hr />
          </div>

          <div className="form-body">
            <form className="row g-3" onSubmit={handleSubmit}>
              <div className="col-12">
                <label htmlFor="inputEmailAddress" className="form-label">
                  Adresse Email
                </label>
                <input
                  id="inputEmailAddress"
                  type="email"
                  className="form-control"
                  placeholder="Adresse Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="col-12">
                <label htmlFor="inputChoosePassword" className="form-label">
                  Mot de passe
                </label>
                <div className="input-group" id="show_hide_password">
                  <input
                    id="inputChoosePassword"
                    type={showPassword ? "text" : "password"}
                    className="form-control border-end-0"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-group-text bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ border: '1px solid #ced4da', borderLeft: 'none' }}
                  >
                    <i className={`bx ${showPassword ? 'bx-show' : 'bx-hide'}`}></i>
                  </button>
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="rememberMe"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="rememberMe">
                    Se souvenir de moi
                  </label>
                </div>
              </div>
              <div className="col-md-6 text-end">
                <Link className="text-primary" to="/forgot-password">
                  Mot de passe oublié?
                </Link>
              </div>

              <div className="col-12">
                <div className="d-grid">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    <i className="bx bxs-lock-open me-2"></i>
                    {loading ? 'Connexion...' : 'Se connecter'}
                    <span
                      id="loginSpinner"
                      className={`spinner-border spinner-border-sm ms-2 ${loading ? '' : 'd-none'}`}
                      role="status"
                    ></span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="mobile-carousel">
            <div
              className="mobile-carousel-item"
              id="mobileCarouselItem"
              style={{ backgroundImage: `url('${currentImage.url}')` }}
            >
              <div className="mobile-carousel-caption">
                <h6 className="mb-0">{currentImage.title}</h6>
              </div>
            </div>
            <div className="mobile-carousel-controls">
              <button className="mobile-carousel-btn" type="button" onClick={prevImage}>
                <i className="bx bx-chevron-left"></i>
              </button>
              <span id="mobileImageCounter" className="align-self-center">
                {currentImageIndex + 1}/{backgroundImages.length}
              </span>
              <button className="mobile-carousel-btn" type="button" onClick={nextImage}>
                <i className="bx bx-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div 
        className="right-half" 
        id="backgroundImage"
        style={{ backgroundImage: `url('${currentImage.url}')` }}
      >
        <div className="overlay"></div>
        <div className="carousel-controls">
          <button className="carousel-btn" type="button" onClick={prevImage}>
            <i className="bx bx-chevron-left"></i>
          </button>
          <button className="carousel-btn" type="button" onClick={nextImage}>
            <i className="bx bx-chevron-right"></i>
          </button>
        </div>
        <div className="image-counter" id="imageCounter">
          Image {currentImageIndex + 1}/{backgroundImages.length}
        </div>
      </div>
    </div>
  );
};

export default Login;
