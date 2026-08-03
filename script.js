const year = document.getElementById('year');
if (year) {
  year.textContent = new Date().getFullYear();
}

const form = document.querySelector('form');
if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    if (button) {
      button.textContent = 'Mensaje enviado';
      button.disabled = true;
    }
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
