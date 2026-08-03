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
  const mapHost = document.getElementById('locationMap');
  if (!mapHost || typeof window.L === 'undefined') {
    return;
  }

  const map = window.L.map('locationMap', {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([20.7198, -103.3905], 15);

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const points = [
    { title: 'Parque cercano', desc: '6 min caminando', coords: [20.7198, -103.3906] },
    { title: 'Escuela primaria', desc: '8 min caminando', coords: [20.7204, -103.3892] },
    { title: 'Mini súper', desc: '3 min caminando', coords: [20.7189, -103.3910] },
    { title: 'Centro comercial', desc: '10 min en auto', coords: [20.7176, -103.3927] },
    { title: 'Avenida principal', desc: '2 min en auto', coords: [20.7210, -103.3879] },
  ];

  const bounds = [];
  points.forEach((point) => {
    const marker = window.L.circleMarker(point.coords, {
      radius: 8,
      color: '#c08a3e',
      weight: 2,
      fillColor: '#f3efe7',
      fillOpacity: 0.95,
    }).addTo(map);

    marker.bindPopup(`<strong>${point.title}</strong><br>${point.desc}`);
    bounds.push(point.coords);
  });

  const projectPin = window.L.marker([20.7198, -103.3905]).addTo(map);
  projectPin.bindPopup('<strong>Nexus Cd. Granja</strong><br>Zapopan, Jalisco');
  bounds.push([20.7198, -103.3905]);

  map.fitBounds(bounds, { padding: [22, 22] });

  document.querySelectorAll('.loc-row').forEach((row) => {
    row.addEventListener('click', () => {
      const lat = Number(row.dataset.lat);
      const lng = Number(row.dataset.lng);
      map.flyTo([lat, lng], 17, { duration: 1.5 });
      const popup = window.L.popup().setLatLng([lat, lng]).setContent(`<strong>${row.dataset.title}</strong><br>${row.dataset.desc}`);
      popup.openOn(map);
    });
  });
}

window.addEventListener('DOMContentLoaded', initLocationMap);
