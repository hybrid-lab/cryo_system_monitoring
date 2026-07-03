const ctx = document.getElementById('pressure-chart').getContext('2d');

function fmtTime(ts) {
  return new Date(ts * 1000).toLocaleString();
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
    animation: false,
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Time' },
        ticks: { callback: (v) => new Date(v * 1000).toLocaleString() },
      },
      y: {
        type: 'logarithmic',
        title: { display: true, text: 'Pressure (mbar)' },
      },
    },
    plugins: { legend: { display: false } },
  },
});

async function refresh() {
  const banner = document.getElementById('status-banner');
  const valueEl = document.getElementById('latest-value');
  const timeEl = document.getElementById('latest-time');
  try {
    const res = await fetch('data/latest.json?_=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    const chKey = Object.keys(payload.channels)[0];
    const chData = payload.channels[chKey];

    const points = chData.history
      .map(([ts, avg]) => ({ x: ts, y: avg }))
      .filter((p) => p.y !== null && p.y !== undefined);
    chart.data.datasets[0].data = points;
    chart.update('none');

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

refresh();
setInterval(refresh, 60000);
