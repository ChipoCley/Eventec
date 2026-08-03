const year = document.getElementById('year');
if (year) {
  year.textContent = new Date().getFullYear();
}

const contactForm = document.getElementById('contactForm');
const contactSuccess = document.getElementById('contactSuccess');
const contactSuccessClose = document.getElementById('contactSuccessClose');
const whatsappNumber = '523315204086';

function showContactSuccessModal() {
  if (contactSuccess) {
    contactSuccess.classList.add('show');
  }
}

function closeContactSuccessModal() {
  if (contactSuccess) {
    contactSuccess.classList.remove('show');
  }
}

if (contactSuccessClose) {
  contactSuccessClose.addEventListener('click', closeContactSuccessModal);
}

if (contactSuccess) {
  contactSuccess.addEventListener('click', (event) => {
    if (event.target === contactSuccess) {
      closeContactSuccessModal();
    }
  });
}

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = document.getElementById('leadName')?.value.trim() || 'Sin nombre';
    const phone = document.getElementById('leadPhone')?.value.trim() || 'Sin teléfono';
    const unit = document.getElementById('leadUnit')?.value || 'No especificado';
    const price = document.getElementById('leadPrice')?.value || 'No especificado';
    const date = document.getElementById('leadDate')?.value.trim() || 'No especificada';

    const message = [
      'Hola, quiero solicitar información sobre el proyecto.',
      '',
      `Nombre: ${name}`,
      `Teléfono / WhatsApp: ${phone}`,
      `Tipo de unidad: ${unit}`,
      `Rango de precio: ${price}`,
      `Fecha de entrega deseada: ${date}`,
    ].join('\n');

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    const submitButton = contactForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Solicitud enviada';
      submitButton.disabled = true;
    }

    showContactSuccessModal();
  });
}

function initLocationMap() {
  const mapFrame = document.getElementById('locationMapEmbed');
  if (!mapFrame) {
    return;
  }

  const defaultQuery = 'Calzada+Central+261+Ciudad+Granja+Zapopan+Jalisco';
  mapFrame.src = `https://www.google.com/maps?q=${defaultQuery}&z=16&output=embed`;

  document.querySelectorAll('.loc-row').forEach((row) => {
    row.addEventListener('click', () => {
      const query = row.dataset.query || defaultQuery;
      mapFrame.src = `https://www.google.com/maps?q=${query}&z=17&output=embed`;
    });
  });
}

window.addEventListener('DOMContentLoaded', initLocationMap);
