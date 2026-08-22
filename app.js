/* ============================================
   Customer360 - Application Logic
   ============================================ */

// ── Global State ──
const state = {
    raw: { customers: [], transactions: [], sessions: [], loyalty: [] },
    merged: [],
    filtered: [],
    charts: {},
    filters: { loyalty: 'All', channel: 'All', gender: 'All', state: 'All' },
    table: { page: 1, pageSize: 15, sortKey: 'spent', sortDir: 'desc', search: '' }
};

// ── Chart Color Palette ──
const COLORS = {
    indigo: '#818cf8',
    emerald: '#34d399',
    amber: '#fbbf24',
    rose: '#f472b6',
    sky: '#38bdf8',
    violet: '#a78bfa',
    teal: '#2dd4bf',
    orange: '#fb923c',
    lime: '#a3e635',
    cyan: '#22d3ee',
    fuchsia: '#e879f9',
    red: '#f87171'
};

const CHART_PALETTE = Object.values(COLORS);

const CHART_PALETTE_ALPHA = CHART_PALETTE.map(c => c + '33');

// ── Utility Functions ──
function formatCurrency(n) {
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(2);
}

function formatNumber(n) {
    return n.toLocaleString('en-US');
}

function formatPercent(n) {
    return n.toFixed(1) + '%';
}

// ── Data Loading ──
async function loadCSV(path) {
    return new Promise((resolve, reject) => {
        Papa.parse(path, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (err) => reject(err)
        });
    });
}

async function loadAllData() {
    const [customers, transactions, sessions, loyalty] = await Promise.all([
        loadCSV('files/Customers.csv'),
        loadCSV('files/Transactions.csv'),
        loadCSV('files/Sessions.csv'),
        loadCSV('files/LoyaltyPoints.csv')
    ]);
    state.raw.customers = customers;
    state.raw.transactions = transactions;
    state.raw.sessions = sessions;
    state.raw.loyalty = loyalty;
}

// ── Data Merging ──
function mergeData() {
    const txnMap = {};
    const sessMap = {};
    const loyMap = {};

    state.raw.transactions.forEach(t => {
        if (!t.customer_id) return;
        if (!txnMap[t.customer_id]) txnMap[t.customer_id] = [];
        txnMap[t.customer_id].push(t);
    });

    state.raw.sessions.forEach(s => {
        if (!s.customer_id) return;
        if (!sessMap[s.customer_id]) sessMap[s.customer_id] = [];
        sessMap[s.customer_id].push(s);
    });

    state.raw.loyalty.forEach(l => {
        if (l.customer_id) loyMap[l.customer_id] = l;
    });

    state.merged = state.raw.customers.map(c => {
        const txns = txnMap[c.customer_id] || [];
        const sess = sessMap[c.customer_id] || [];
        const loy = loyMap[c.customer_id] || {};

        const totalSpent = txns.reduce((sum, t) => sum + (t.total_amount || 0), 0);
        const totalSessions = sess.length;
        const purchaseSessions = sess.filter(s => s.resulted_in_purchase === true || s.resulted_in_purchase === 'True').length;

        return {
            ...c,
            name: `${c.first_name} ${c.last_name}`,
            transactions: txns,
            txnCount: txns.length,
            totalSpent,
            avgOrder: txns.length > 0 ? totalSpent / txns.length : 0,
            sessions: sess,
            sessionCount: totalSessions,
            purchaseSessions,
            conversionRate: totalSessions > 0 ? (purchaseSessions / totalSessions) * 100 : 0,
            pointsEarned: loy.points_earned || 0,
            pointsRedeemed: loy.points_redeemed || 0,
            pointsBalance: loy.points_balance || 0
        };
    });
}

// ── Filtering ──
function applyFilters() {
    state.filtered = state.merged.filter(c => {
        if (state.filters.loyalty !== 'All' && c.loyalty_tier !== state.filters.loyalty) return false;
        if (state.filters.channel !== 'All' && c.preferred_channel !== state.filters.channel) return false;
        if (state.filters.gender !== 'All' && c.gender !== state.filters.gender) return false;
        if (state.filters.state !== 'All' && c.state !== state.filters.state) return false;
        return true;
    });
    state.table.page = 1;
}

function getFilteredTransactions() {
    const ids = new Set(state.filtered.map(c => c.customer_id));
    return state.raw.transactions.filter(t => ids.has(t.customer_id));
}

function getFilteredSessions() {
    const ids = new Set(state.filtered.map(c => c.customer_id));
    return state.raw.sessions.filter(s => ids.has(s.customer_id));
}

// ── Populate Filters ──
function populateFilters() {
    const loyalties = [...new Set(state.raw.customers.map(c => c.loyalty_tier).filter(Boolean))].sort();
    const channels = [...new Set(state.raw.customers.map(c => c.preferred_channel).filter(Boolean))].sort();
    const genders = [...new Set(state.raw.customers.map(c => c.gender).filter(Boolean))].sort();
    const states = [...new Set(state.raw.customers.map(c => c.state).filter(Boolean))].sort();

    fillSelect('filter-loyalty', loyalties);
    fillSelect('filter-channel', channels);
    fillSelect('filter-gender', genders);
    fillSelect('filter-state', states);
}

function fillSelect(id, values) {
    const el = document.getElementById(id);
    const firstOption = el.options[0].outerHTML;
    el.innerHTML = firstOption;
    values.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        el.appendChild(opt);
    });
}

// ── KPI Rendering ──
function renderKPIs() {
    const customers = state.filtered;
    const txns = getFilteredTransactions();
    const sessions = getFilteredSessions();

    const totalRevenue = txns.reduce((s, t) => s + (t.total_amount || 0), 0);
    const avgOrder = txns.length > 0 ? totalRevenue / txns.length : 0;
    const purchaseSessions = sessions.filter(s => s.resulted_in_purchase === true || s.resulted_in_purchase === 'True').length;
    const conversionRate = sessions.length > 0 ? (purchaseSessions / sessions.length) * 100 : 0;

    document.getElementById('kpi-customers').textContent = formatNumber(customers.length);
    document.getElementById('kpi-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('kpi-transactions').textContent = formatNumber(txns.length);
    document.getElementById('kpi-avg-order').textContent = formatCurrency(avgOrder);
    document.getElementById('kpi-sessions').textContent = formatNumber(sessions.length);
    document.getElementById('kpi-conversion').textContent = formatPercent(conversionRate);
}

// ── Chart Defaults ──
function getChartDefaults() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#9ca3af',
                    font: { family: "'Inter', sans-serif", size: 11 },
                    padding: 16,
                    usePointStyle: true,
                    pointStyleWidth: 8
                }
            },
            tooltip: {
                backgroundColor: 'rgba(13, 15, 26, 0.95)',
                titleColor: '#e8eaed',
                bodyColor: '#9ca3af',
                borderColor: 'rgba(99, 102, 241, 0.2)',
                borderWidth: 1,
                cornerRadius: 10,
                padding: 12,
                titleFont: { family: "'Inter', sans-serif", weight: '600', size: 13 },
                bodyFont: { family: "'Inter', sans-serif", size: 12 },
                displayColors: true,
                boxPadding: 4
            }
        }
    };
}

function getScaleDefaults() {
    return {
        x: {
            ticks: { color: '#6b7280', font: { family: "'Inter', sans-serif", size: 11 } },
            grid: { color: 'rgba(99, 102, 241, 0.05)', drawBorder: false }
        },
        y: {
            ticks: { color: '#6b7280', font: { family: "'Inter', sans-serif", size: 11 } },
            grid: { color: 'rgba(99, 102, 241, 0.06)', drawBorder: false }
        }
    };
}

// ── Chart: Revenue Trend ──
function renderRevenueTrend() {
    const txns = getFilteredTransactions();
    const monthMap = {};

    txns.forEach(t => {
        if (!t.transaction_date) return;
        const key = t.transaction_date.substring(0, 7); // YYYY-MM
        monthMap[key] = (monthMap[key] || 0) + (t.total_amount || 0);
    });

    const sortedMonths = Object.keys(monthMap).sort();
    const labels = sortedMonths.map(m => {
        const [y, mo] = m.split('-');
        const date = new Date(y, parseInt(mo) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });
    const data = sortedMonths.map(m => monthMap[m]);

    updateChart('chart-revenue-trend', 'revenueTrend', {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Revenue',
                data,
                borderColor: COLORS.indigo,
                backgroundColor: createGradient('chart-revenue-trend', COLORS.indigo),
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: COLORS.indigo,
                pointBorderColor: '#0d0f1a',
                pointBorderWidth: 2,
                pointHoverRadius: 6
            }]
        },
        options: {
            ...getChartDefaults(),
            scales: getScaleDefaults(),
            plugins: {
                ...getChartDefaults().plugins,
                legend: { display: false },
                tooltip: {
                    ...getChartDefaults().plugins.tooltip,
                    callbacks: {
                        label: ctx => ' Revenue: ' + formatCurrency(ctx.parsed.y)
                    }
                }
            }
        }
    });
}

function createGradient(canvasId, color) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(0.5, color + '15');
    gradient.addColorStop(1, color + '00');
    return gradient;
}

// ── Chart: Loyalty Distribution ──
function renderLoyaltyDist() {
    const tierMap = {};
    state.filtered.forEach(c => {
        const tier = c.loyalty_tier || 'Unknown';
        tierMap[tier] = (tierMap[tier] || 0) + 1;
    });

    const tierOrder = ['Platinum', 'Gold', 'Silver', 'Bronze'];
    const labels = tierOrder.filter(t => tierMap[t]);
    const data = labels.map(t => tierMap[t]);
    const tierColors = {
        Platinum: COLORS.violet,
        Gold: COLORS.amber,
        Silver: '#94a3b8',
        Bronze: COLORS.orange
    };
    const colors = labels.map(t => tierColors[t] || COLORS.sky);

    updateChart('chart-loyalty-dist', 'loyaltyDist', {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.map(c => c + '55'),
                borderColor: colors,
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            ...getChartDefaults(),
            cutout: '62%',
            plugins: {
                ...getChartDefaults().plugins,
                legend: {
                    ...getChartDefaults().plugins.legend,
                    position: 'bottom'
                },
                tooltip: {
                    ...getChartDefaults().plugins.tooltip,
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed} customers (${formatPercent(ctx.parsed / data.reduce((a, b) => a + b, 0) * 100)})`
                    }
                }
            }
        }
    });
}

// ── Chart: Revenue by Category ──
function renderCategoryChart() {
    const txns = getFilteredTransactions();
    const catMap = {};
    txns.forEach(t => {
        const cat = t.product_category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + (t.total_amount || 0);
    });

    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(e => e[0]);
    const data = sorted.map(e => e[1]);
    const colors = labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]);

    updateChart('chart-category', 'category', {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Revenue',
                data,
                backgroundColor: colors.map(c => c + '44'),
                borderColor: colors,
                borderWidth: 1.5,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            ...getChartDefaults(),
            indexAxis: 'y',
            scales: {
                x: {
                    ...getScaleDefaults().x,
                    ticks: {
                        ...getScaleDefaults().x.ticks,
                        callback: v => formatCurrency(v)
                    }
                },
                y: getScaleDefaults().y
            },
            plugins: {
                ...getChartDefaults().plugins,
                legend: { display: false },
                tooltip: {
                    ...getChartDefaults().plugins.tooltip,
                    callbacks: {
                        label: ctx => ' Revenue: ' + formatCurrency(ctx.parsed.x)
                    }
                }
            }
        }
    });
}

// ── Chart: Channel Performance ──
function renderChannelChart() {
    const txns = getFilteredTransactions();
    const chMap = {};
    txns.forEach(t => {
        const ch = t.channel || 'Unknown';
        chMap[ch] = (chMap[ch] || 0) + (t.total_amount || 0);
    });

    const sorted = Object.entries(chMap).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(e => e[0]);
    const data = sorted.map(e => e[1]);
    const colors = [COLORS.indigo, COLORS.emerald, COLORS.amber, COLORS.rose, COLORS.sky];

    updateChart('chart-channel', 'channel', {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Revenue',
                data,
                backgroundColor: labels.map((_, i) => colors[i % colors.length] + '44'),
                borderColor: labels.map((_, i) => colors[i % colors.length]),
                borderWidth: 1.5,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            ...getChartDefaults(),
            scales: {
                ...getScaleDefaults(),
                y: {
                    ...getScaleDefaults().y,
                    ticks: {
                        ...getScaleDefaults().y.ticks,
                        callback: v => formatCurrency(v)
                    }
                }
            },
            plugins: {
                ...getChartDefaults().plugins,
                legend: { display: false },
                tooltip: {
                    ...getChartDefaults().plugins.tooltip,
                    callbacks: {
                        label: ctx => ' Revenue: ' + formatCurrency(ctx.parsed.y)
                    }
                }
            }
        }
    });
}

// ── Chart: Session by Device ──
function renderDeviceChart() {
    const sessions = getFilteredSessions();
    const devMap = {};
    sessions.forEach(s => {
        const dev = s.device || 'Unknown';
        devMap[dev] = (devMap[dev] || 0) + 1;
    });

    const labels = Object.keys(devMap);
    const data = Object.values(devMap);
    const colors = labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]);

    updateChart('chart-device', 'device', {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.map(c => c + '55'),
                borderColor: colors,
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            ...getChartDefaults(),
            cutout: '62%',
            plugins: {
                ...getChartDefaults().plugins,
                legend: {
                    ...getChartDefaults().plugins.legend,
                    position: 'bottom'
                },
                tooltip: {
                    ...getChartDefaults().plugins.tooltip,
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${formatNumber(ctx.parsed)} sessions`
                    }
                }
            }
        }
    });
}

// ── Chart: Age Distribution ──
function renderAgeChart() {
    const buckets = { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0 };

    state.filtered.forEach(c => {
        const age = c.age;
        if (age == null) return;
        if (age < 25) buckets['18-24']++;
        else if (age < 35) buckets['25-34']++;
        else if (age < 45) buckets['35-44']++;
        else if (age < 55) buckets['45-54']++;
        else if (age < 65) buckets['55-64']++;
        else buckets['65+']++;
    });

    const labels = Object.keys(buckets);
    const data = Object.values(buckets);
    const colors = [COLORS.sky, COLORS.indigo, COLORS.violet, COLORS.rose, COLORS.amber, COLORS.emerald];

    updateChart('chart-age', 'age', {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Customers',
                data,
                backgroundColor: colors.map(c => c + '44'),
                borderColor: colors,
                borderWidth: 1.5,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            ...getChartDefaults(),
            scales: getScaleDefaults(),
            plugins: {
                ...getChartDefaults().plugins,
                legend: { display: false },
                tooltip: {
                    ...getChartDefaults().plugins.tooltip,
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} customers`
                    }
                }
            }
        }
    });
}

// ── Chart Helper ──
function updateChart(canvasId, stateKey, config) {
    if (state.charts[stateKey]) {
        state.charts[stateKey].destroy();
    }
    const ctx = document.getElementById(canvasId).getContext('2d');
    state.charts[stateKey] = new Chart(ctx, config);
}

// ── Render All Charts ──
function renderAllCharts() {
    renderKPIs();
    renderRevenueTrend();
    renderLoyaltyDist();
    renderCategoryChart();
    renderChannelChart();
    renderDeviceChart();
    renderAgeChart();
    renderTable();
}

// ── Customer Table ──
function renderTable() {
    let data = [...state.filtered];
    const search = state.table.search.toLowerCase().trim();

    if (search) {
        data = data.filter(c =>
            c.name.toLowerCase().includes(search) ||
            (c.customer_id && c.customer_id.toLowerCase().includes(search)) ||
            (c.city && c.city.toLowerCase().includes(search)) ||
            (c.state && c.state.toLowerCase().includes(search)) ||
            (c.loyalty_tier && c.loyalty_tier.toLowerCase().includes(search))
        );
    }

    // Sort
    const key = state.table.sortKey;
    const dir = state.table.sortDir === 'asc' ? 1 : -1;
    data.sort((a, b) => {
        let va = getSortValue(a, key);
        let vb = getSortValue(b, key);
        if (typeof va === 'string') {
            return dir * va.localeCompare(vb);
        }
        return dir * (va - vb);
    });

    // Pagination
    const total = data.length;
    const totalPages = Math.max(1, Math.ceil(total / state.table.pageSize));
    if (state.table.page > totalPages) state.table.page = totalPages;
    const start = (state.table.page - 1) * state.table.pageSize;
    const pageData = data.slice(start, start + state.table.pageSize);

    const tbody = document.getElementById('customer-table-body');
    tbody.innerHTML = pageData.map(c => `
        <tr>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>${escapeHtml(c.city || '—')}</td>
            <td>${escapeHtml(c.state || '—')}</td>
            <td><span class="tier-badge tier-${(c.loyalty_tier || '').toLowerCase()}">${escapeHtml(c.loyalty_tier || '—')}</span></td>
            <td>${escapeHtml(c.preferred_channel || '—')}</td>
            <td>${formatCurrency(c.totalSpent)}</td>
            <td>${formatNumber(c.txnCount)}</td>
            <td>${formatNumber(c.sessionCount)}</td>
            <td>${formatNumber(c.pointsBalance)}</td>
        </tr>
    `).join('');

    document.getElementById('page-info').textContent = `Page ${state.table.page} of ${totalPages} (${formatNumber(total)} customers)`;
    document.getElementById('prev-page').disabled = state.table.page <= 1;
    document.getElementById('next-page').disabled = state.table.page >= totalPages;
}

function getSortValue(c, key) {
    switch (key) {
        case 'name': return c.name || '';
        case 'city': return c.city || '';
        case 'state': return c.state || '';
        case 'loyalty': return c.loyalty_tier || '';
        case 'channel': return c.preferred_channel || '';
        case 'spent': return c.totalSpent;
        case 'txns': return c.txnCount;
        case 'sessions': return c.sessionCount;
        case 'points': return c.pointsBalance;
        default: return 0;
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ── Event Listeners ──
function bindEvents() {
    // Filters
    ['filter-loyalty', 'filter-channel', 'filter-gender', 'filter-state'].forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            const key = id.replace('filter-', '');
            state.filters[key] = e.target.value;
            applyFilters();
            renderAllCharts();
        });
    });

    // Reset
    document.getElementById('btn-reset').addEventListener('click', () => {
        state.filters = { loyalty: 'All', channel: 'All', gender: 'All', state: 'All' };
        document.getElementById('filter-loyalty').value = 'All';
        document.getElementById('filter-channel').value = 'All';
        document.getElementById('filter-gender').value = 'All';
        document.getElementById('filter-state').value = 'All';
        document.getElementById('customer-search').value = '';
        state.table.search = '';
        applyFilters();
        renderAllCharts();
    });

    // Table search
    let searchTimeout;
    document.getElementById('customer-search').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.table.search = e.target.value;
            state.table.page = 1;
            renderTable();
        }, 250);
    });

    // Table sort
    document.querySelectorAll('#customer-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (state.table.sortKey === key) {
                state.table.sortDir = state.table.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                state.table.sortKey = key;
                state.table.sortDir = 'asc';
            }
            renderTable();
        });
    });

    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => {
        if (state.table.page > 1) {
            state.table.page--;
            renderTable();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        state.table.page++;
        renderTable();
    });
}

// ── Initialization ──
async function init() {
    // Set date
    document.getElementById('header-date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    try {
        await loadAllData();
        mergeData();
        populateFilters();
        applyFilters();
        bindEvents();
        renderAllCharts();
    } catch (err) {
        console.error('Failed to load data:', err);
        document.getElementById('loading-overlay').innerHTML = `
            <div class="loader-content">
                <h2 style="color: #f87171;">Error loading data</h2>
                <p>${err.message || 'Please make sure CSV files are in the files/ directory and refresh.'}</p>
            </div>
        `;
        return;
    }

    // Hide loading overlay
    setTimeout(() => {
        document.getElementById('loading-overlay').classList.add('hidden');
    }, 600);
}

document.addEventListener('DOMContentLoaded', init);
