/**
 * Convertit la première page d'un blob PDF en image PNG.
 * Utilise pdfjs-dist pour obtenir le rendu exact du reçu (même design, QR code, etc.).
 */
export const pdfBlobToImageBlob = async (pdfBlob) => {
    const pdfjsLib = await import('pdfjs-dist');

    // Worker servi depuis public/ (copié de node_modules/pdfjs-dist/build/pdf.worker.min.mjs)
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    // Scale 2.5 → haute résolution, image nette sur WhatsApp
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Conversion canvas→blob échouée'))),
            'image/png'
        )
    );
};

/**
 * Ouvre WhatsApp Desktop installé via le protocole whatsapp://.
 * Utilise un <a> cliqué dans le DOM (contourne les popup blockers mieux que window.open).
 */
export const openWhatsAppDesktop = (phone, message = '') => {
    if (!phone) return;
    const link = document.createElement('a');
    link.href = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Télécharge un blob sous forme de fichier.
 */
export const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Formate un numéro de téléphone pour WhatsApp (chiffres seulement).
 */
export const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return null;
    const digits = phone.replace(/[\s\-()+.]/g, '');
    return digits || null;
};

/**
 * Génère un nom de fichier pour le reçu.
 */
export const buildReceiptFileName = (reference) => {
    const slug = String(reference || 'recu').replace(/[^a-zA-Z0-9_-]/g, '-');
    return `recu-${slug}.png`;
};
