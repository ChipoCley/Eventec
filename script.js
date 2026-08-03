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

  const projectCoordinates = [20.6754425, -103.4500785];

  const map = window.L.map('locationMap', {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView(projectCoordinates, 16);

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const points = [
    { title: 'Parque de la colonia', desc: '6 min caminando', coords: [20.6750, -103.4492] },
    { title: 'Escuela primaria', desc: '7 min caminando', coords: [20.6762, -103.4488] },
    { title: 'Mini súper', desc: '3 min caminando', coords: [20.6758, -103.4499] },
    { title: 'Farmacia', desc: '5 min en auto', coords: [20.6748, -103.4523] },
    { title: 'Transporte público', desc: '4 min caminando', coords: [20.6771, -103.4516] },
    { title: 'Centro comercial', desc: '10 min en auto', coords: [20.6738, -103.4485] },
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

  const projectPin = window.L.marker(projectCoordinates).addTo(map);
  projectPin.bindPopup('<strong>Calzada Central 261</strong><br>Ciudad Granja, Zapopan, Jalisco');
  bounds.push(projectCoordinates);

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
