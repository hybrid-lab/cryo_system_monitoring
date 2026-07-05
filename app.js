const ctx = document.getElementById('pressure-chart').getContext('2d');

function fmtTime(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString();
}

function fmtAxisLabel(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const chart = new Chart(ctx, {
  type: 'line',
  data: {
    datasets: [{
      label: 'Pressure (mbar)',
      data: [],
      borderColor: '#4f8ef7',
      backgroundColor: 'rgba(79,142,247,0.15)',
      pointRadius: 0,
      borderWidth: 1.5,
      tension: 0.15,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Time' },
        ticks: { callback: (v) => fmtAxisLabel(v) },
      },
      y: {
        type: 'logarithmic',
        title: { display: true, text: 'Pressure (mbar)' },
      },
    },
    plugins: { legend: { display: false } },
  },
});

let lastPayload = null;

function renderChart() {
  if (!lastPayload) return;
  const chKey = Object.keys(lastPayload.channels)[0];
  const chData = lastPayload.channels[chKey];
  const minutes = Number(document.getElementById('range-select').value);
  const cutoff = lastPayload.generated_at - minutes * 60;

  // The published snapshot only carries two resolutions: full-rate points for the
  // last hour ("recent"), and 1-minute averages for the last 7 days ("history").
  // For ranges beyond an hour we have no choice but to fall back to the averaged
  // series, since raw points that far back were never published.
  const points = minutes <= 60
    ? chData.recent
        .filter((row) => row[2] === 0 && row[1] !== null && row[1] !== undefined && row[0] >= cutoff)
        .map((row) => ({ x: row[0], y: row[1] }))
    : chData.history
        .filter((row) => row[1] !== null && row[1] !== undefined && row[0] >= cutoff)
        .map((row) => ({ x: row[0], y: row[1] }));

  chart.data.datasets[0].data = points;
  chart.update('none');
}

async function refresh() {
  const banner = document.getElementById('status-banner');
  const valueEl = document.getElementById('latest-value');
  const timeEl = document.getElementById('latest-time');
  try {
    const res = await fetch('data/latest.json?_=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    lastPayload = await res.json();
    const chKey = Object.keys(lastPayload.channels)[0];
    const chData = lastPayload.channels[chKey];

    renderChart();

    const latest = chData.latest;
    if (latest && latest.status === 0 && latest.pressure_mbar !== null) {
      valueEl.textContent = latest.pressure_mbar.toExponential(3) + ' mbar';
      timeEl.textContent = chData.name + ' — as of ' + fmtTime(latest.ts);
      banner.textContent = '';
      banner.className = '';
    } else if (latest) {
      valueEl.textContent = '-- mbar';
      timeEl.textContent = 'last update ' + fmtTime(latest.ts);
      banner.textContent = `Sensor status code ${latest.status} (non-OK)`;
      banner.className = 'warning';
    } else {
      banner.textContent = 'No data published yet.';
      banner.className = 'warning';
    }
  } catch (e) {
    banner.textContent = 'Could not load data: ' + e;
    banner.className = 'warning';
  }
}

document.getElementById('range-select').addEventListener('change', renderChart);
refresh();
setInterval(refresh, 60000);
