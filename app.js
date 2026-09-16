// Default Waiters
const DEFAULT_WAITERS = [
  "NOEL VELIZ",
  "ABRIL MONTENEGRO",
  "ELIANA ROLDAN",
  "NATALIA RUIZ",
  "LUNA TRUJILLO",
  "FRANCO ABAN"
];

// Default Pool Staff (Cocina, Caja, Encargados)
const DEFAULT_POOL_STAFF = [
  { id: 'staff-coc-1', name: 'MARCOS ALVAREZ', role: 'Cocina', active: true },
  { id: 'staff-coc-2', name: 'JUAN PÉREZ', role: 'Cocina', active: true },
  { id: 'staff-coc-3', name: 'LUCAS BENÍTEZ', role: 'Cocina', active: true },
  { id: 'staff-coc-4', name: 'MATÍAS SOSA', role: 'Cocina', active: true },
  { id: 'staff-coc-5', name: 'RODRIGO DÍAZ', role: 'Cocina', active: true },
  { id: 'staff-coc-6', name: 'GONZALO ROMERO', role: 'Cocina', active: true },
  { id: 'staff-coc-7', name: 'ESTEBAN TORRES', role: 'Cocina', active: true },
  { id: 'staff-caj-1', name: 'VALERIA GIMÉNEZ', role: 'Caja', active: true },
  { id: 'staff-caj-2', name: 'CAMILA HERRERA', role: 'Caja', active: true },
  { id: 'staff-enc-1', name: 'SEBASTIÁN LÓPEZ', role: 'Encargados', active: true },
  { id: 'staff-enc-2', name: 'MARTÍN CASTILLO', role: 'Encargados', active: true }
];

// Initial state template
const DEFAULT_CONFIG = {
  tipPercentage: 5,        // 5% Propina Estimada
  retentionPercentage: 30,  // 30% Retención
  distCocina: 8,           // Factor Cocina por defecto (2/3 con 7 pers = $44.195 c/u)
  distCaja: 7,             // Factor Caja por defecto (1/6 con 2 pers = $38.671 c/u)
  distEncargados: 7,        // Factor Encargados por defecto (1/6 con 2 pers = $38.671 c/u)
  peopleCocina: 7,         // 7 personas en Cocina
  peopleCaja: 2,           // 2 personas en Caja
  peopleEncargados: 2,      // 2 personas Encargadas
  securityPin: "1270"      // PIN de seguridad por defecto
};

// State
let state = {
  waiters: [...DEFAULT_WAITERS],
  poolStaff: [...DEFAULT_POOL_STAFF],
  activeStaffRoleFilter: 'all',
  currentReceiptStaffId: null,
  weeks: [],
  currentWeekId: null,
  currentDayIndex: 0, // 0 to 6
  config: { ...DEFAULT_CONFIG }
};

// Toast notification helper
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.className = `toast toast-${type} show`;
  toast.querySelector('.toast-text').textContent = message;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Format string with thousand separators (dots)
function formatNumberString(val) {
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return '';
  return new Intl.NumberFormat('es-AR').format(parseInt(clean, 10));
}

// Parse string formatted with dots or currency back to a number
function parseFormattedNumber(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = String(val).replace(/[^0-9,-]+/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Calculate total retained pool for a week directly from shift sales
function calculateWeekTotalRetained(week) {
  if (!week || !week.days) return 0;
  let totalSales = 0;
  week.days.forEach(day => {
    if (day.shifts && day.shifts.AM) {
      day.shifts.AM.forEach(s => totalSales += (Number(s.sales) || 0));
    }
    if (day.shifts && day.shifts.PM) {
      day.shifts.PM.forEach(s => totalSales += (Number(s.sales) || 0));
    }
  });
  const tip = totalSales * (state.config.tipPercentage / 100);
  return tip * (state.config.retentionPercentage / 100);
}

// Format Currency
function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}

// Generate 7 days starting from a specific date
function generateDays(startDateStr) {
  const days = [];
  const parts = startDateStr.split('-');

  // Assume year is current year or we extract it
  let year = new Date().getFullYear();
  let dayNum = parseInt(parts[0], 10);
  let monthNum = parseInt(parts[1], 10) - 1; // 0-indexed month

  let baseDate = new Date(year, monthNum, dayNum);

  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);

    // Format as DD-MM
    const formattedDay = String(d.getDate()).padStart(2, '0');
    const formattedMonth = String(d.getMonth() + 1).padStart(2, '0');
    const dateLabel = `${formattedDay}-${formattedMonth}`;

    days.push({
      dateLabel: dateLabel,
      fullDate: d.toISOString().split('T')[0],
      shifts: {
        AM: state.waiters.map(name => ({ waiterName: name, sales: 0, advance: 0 })),
        PM: state.waiters.map(name => ({ waiterName: name, sales: 0, advance: 0 }))
      }
    });
  }
  return days;
}

// Create a new week
function createWeek(startDateStr) {
  // Check if week already exists
  const weekId = `week-${startDateStr}`;
  const existing = state.weeks.find(w => w.id === weekId);
  if (existing) {
    showToast("Ya existe una planilla con esa fecha de inicio", "error");
    return null;
  }

  const days = generateDays(startDateStr);
  const newWeek = {
    id: weekId,
    startDate: days[0].fullDate,
    endDate: days[6].fullDate,
    startDateLabel: days[0].dateLabel,
    endDateLabel: days[6].dateLabel,
    days: days,
    otherAdvances: []
  };

  state.weeks.unshift(newWeek); // Put newest on top
  state.currentWeekId = weekId;
  state.currentDayIndex = 0;
  saveToStorage();

  renderWeeksList();
  renderDailySheets();
  renderSummary();
  showToast("Planilla semanal creada con éxito");
  return newWeek;
}

// Delete a week
function deleteWeek(weekId) {
  const weekToDelete = state.weeks.find(w => w.id === weekId);
  if (!weekToDelete) return;

  const pinInput = prompt("Ingrese el PIN de seguridad para autorizar la eliminación de esta planilla:");
  if (pinInput === null) return; // Cancelled prompt

  const correctPin = state.config.securityPin || "1270";
  if (pinInput !== correctPin) {
    showToast("PIN incorrecto. Operación cancelada.", "error");
    return;
  }

  if (confirm(`¿Estás seguro de que deseas eliminar la planilla de la semana del ${weekToDelete.startDateLabel} al ${weekToDelete.endDateLabel} por completo? Se perderán todos sus datos de ventas cargados.`)) {
    state.weeks = state.weeks.filter(w => w.id !== weekId);

    if (state.currentWeekId === weekId) {
      state.currentWeekId = state.weeks.length > 0 ? state.weeks[0].id : null;
      state.currentDayIndex = 0;
    }

    saveToStorage();
    renderWeeksList();
    renderDailySheets();
    renderSummary();
    showToast("Planilla semanal eliminada");
  }
}

// Load from LocalStorage
function loadFromStorage() {
  const localData = localStorage.getItem('sistema_propinas_data');
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      state = { ...state, ...parsed };

      // Ensure weekly objects have otherAdvances and shifts have advance
      if (state.weeks) {
        state.weeks.forEach(w => {
          if (!w.otherAdvances) w.otherAdvances = [];
          w.days.forEach(day => {
            if (day.shifts && day.shifts.AM) {
              day.shifts.AM.forEach(s => { if (s.advance === undefined) s.advance = 0; });
            }
            if (day.shifts && day.shifts.PM) {
              day.shifts.PM.forEach(s => { if (s.advance === undefined) s.advance = 0; });
            }
          });
        });
      }

      // Ensure configuration object exists
      if (!state.config) {
        state.config = { ...DEFAULT_CONFIG };
      } else {
        // Ensure new configuration fields exist
        if (state.config.peopleCocina === undefined) state.config.peopleCocina = 7;
        if (state.config.peopleCaja === undefined) state.config.peopleCaja = 2;
        if (state.config.peopleEncargados === undefined) state.config.peopleEncargados = 2;
        if (state.config.securityPin === undefined) state.config.securityPin = DEFAULT_CONFIG.securityPin;

        // Convert old default factors (50/25/25 or 20/10/10) to calibrated factors (8, 7, 7)
        if ((state.config.distCocina === 50 && state.config.distCaja === 25 && state.config.distEncargados === 25) ||
            (state.config.distCocina === 20 && state.config.distCaja === 10 && state.config.distEncargados === 10)) {
          state.config.distCocina = 8;
          state.config.distCaja = 7;
          state.config.distEncargados = 7;
          saveToStorage();
        }
      }

      // Ensure poolStaff exists
      if (!state.poolStaff || !Array.isArray(state.poolStaff) || state.poolStaff.length === 0) {
        state.poolStaff = [...DEFAULT_POOL_STAFF];
      }

      // Sync people counts from pool staff roster
      state.config.peopleCocina = state.poolStaff.filter(s => s.role === 'Cocina').length;
      state.config.peopleCaja = state.poolStaff.filter(s => s.role === 'Caja').length;
      state.config.peopleEncargados = state.poolStaff.filter(s => s.role === 'Encargados').length;
    } catch (e) {
      console.error("Error loading local storage", e);
    }
  } else {
    // Generate mockup data for first run (August 14th to 20th)
    state.weeks = [];
    state.config = { ...DEFAULT_CONFIG };
    // Create initial week starting on 14-08
    createWeek("14-08");
  }

  if (state.weeks.length > 0 && !state.currentWeekId) {
    state.currentWeekId = state.weeks[0].id;
  }
}

// Save to LocalStorage
function saveToStorage() {
  localStorage.setItem('sistema_propinas_data', JSON.stringify(state));
}

// Active Week getter
function getActiveWeek() {
  return state.weeks.find(w => w.id === state.currentWeekId) || state.weeks[0];
}

// Render Weeks list in Sidebar
function renderWeeksList() {
  const container = document.getElementById('weeks-list-container');
  container.innerHTML = '';

  if (state.weeks.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); font-size: 14px; text-align: center;">No hay semanas registradas</p>';
    return;
  }

  state.weeks.forEach(week => {
    const isActive = week.id === state.currentWeekId;
    const item = document.createElement('div');
    item.className = `week-item ${isActive ? 'active' : ''}`;
    item.onclick = () => {
      state.currentWeekId = week.id;
      state.currentDayIndex = 0;
      saveToStorage();
      renderWeeksList();
      renderDailySheets();
      renderSummary();
    };

    item.innerHTML = `
      <div>
        <div class="week-dates">Semana: ${week.startDateLabel} al ${week.endDateLabel}</div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
          Ventas: ${formatCurrency(calculateWeekTotalSales(week))}
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="week-status">Activa</span>
        <button class="delete-week-btn" title="Eliminar planilla" onclick="event.stopPropagation(); deleteWeek('${week.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

function calculateWeekTotalSales(week) {
  let total = 0;
  week.days.forEach(day => {
    day.shifts.AM.forEach(s => total += (Number(s.sales) || 0));
    day.shifts.PM.forEach(s => total += (Number(s.sales) || 0));
  });
  return total;
}

// Render Staff List in Staff Tab
function renderStaffList() {
  const container = document.getElementById('staff-cards-container') || document.getElementById('waiters-cards-container');
  if (!container) return;
  container.innerHTML = '';

  const filter = state.activeStaffRoleFilter || 'all';

  // Update counters in subtabs
  const totalWaiters = state.waiters.length;
  const countCocina = state.poolStaff.filter(s => s.role === 'Cocina').length;
  const countCaja = state.poolStaff.filter(s => s.role === 'Caja').length;
  const countEncargados = state.poolStaff.filter(s => s.role === 'Encargados').length;
  const countAll = totalWaiters + countCocina + countCaja + countEncargados;

  const bAll = document.getElementById('badge-count-all');
  const bWaiters = document.getElementById('badge-count-waiters');
  const bCocina = document.getElementById('badge-count-cocina');
  const bCaja = document.getElementById('badge-count-caja');
  const bEnc = document.getElementById('badge-count-encargados');

  if (bAll) bAll.textContent = countAll;
  if (bWaiters) bWaiters.textContent = totalWaiters;
  if (bCocina) bCocina.textContent = countCocina;
  if (bCaja) bCaja.textContent = countCaja;
  if (bEnc) bEnc.textContent = countEncargados;

  // Compile items to display based on active filter
  let itemsToDisplay = [];

  if (filter === 'all' || filter === 'Camareros') {
    state.waiters.forEach(name => {
      itemsToDisplay.push({
        type: 'waiter',
        id: name,
        name: name,
        role: 'Camareros',
        displayRole: 'Camarero (Salón)',
        badgeClass: 'dist-badge'
      });
    });
  }

  if (filter === 'all' || filter !== 'Camareros') {
    state.poolStaff.forEach(staff => {
      if (filter === 'all' || staff.role === filter) {
        let badgeClass = 'dist-cocina';
        if (staff.role === 'Caja') badgeClass = 'dist-caja';
        if (staff.role === 'Encargados') badgeClass = 'dist-encargados';

        itemsToDisplay.push({
          type: 'pool',
          id: staff.id,
          name: staff.name,
          role: staff.role,
          displayRole: staff.role,
          badgeClass: `dist-badge ${badgeClass}`
        });
      }
    });
  }

  if (itemsToDisplay.length === 0) {
    container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 32px 0;">No hay colaboradores registrados en esta categoría.</div>';
    return;
  }

  itemsToDisplay.forEach(item => {
    const card = document.createElement('div');
    card.className = 'staff-card';
    card.innerHTML = `
      <div class="staff-card-info">
        <h4>${item.name}</h4>
        <span class="${item.badgeClass}">${item.displayRole}</span>
      </div>
      <div>
        <button class="btn btn-danger btn-icon" onclick="${item.type === 'waiter' ? `removeWaiter('${item.name}')` : `removePoolStaff('${item.id}')`}" title="Eliminar de la nómina">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// Filter staff subtab
function filterStaffTab(role) {
  state.activeStaffRoleFilter = role;
  document.querySelectorAll('.subtab-btn').forEach(btn => btn.classList.remove('active'));

  let activeId = 'subtab-btn-all';
  if (role === 'Camareros') activeId = 'subtab-btn-waiters';
  if (role === 'Cocina') activeId = 'subtab-btn-cocina';
  if (role === 'Caja') activeId = 'subtab-btn-caja';
  if (role === 'Encargados') activeId = 'subtab-btn-encargados';

  const btn = document.getElementById(activeId);
  if (btn) btn.classList.add('active');

  renderStaffList();
}

// Add Waiter (Salón)
function addWaiter(name) {
  const cleanName = name.trim().toUpperCase();
  if (!cleanName) return;

  if (state.waiters.includes(cleanName)) {
    showToast("Este mozo ya existe", "error");
    return;
  }

  state.waiters.push(cleanName);

  // Propagate to active week days
  state.weeks.forEach(week => {
    week.days.forEach(day => {
      // AM
      if (!day.shifts.AM.some(s => s.waiterName === cleanName)) {
        day.shifts.AM.push({ waiterName: cleanName, sales: 0, advance: 0 });
      }
      // PM
      if (!day.shifts.PM.some(s => s.waiterName === cleanName)) {
        day.shifts.PM.push({ waiterName: cleanName, sales: 0, advance: 0 });
      }
    });
  });

  saveToStorage();
  renderStaffList();
  renderDailySheets();
  renderSummary();
  showToast("Camarero agregado con éxito");
}

// Remove Waiter
function removeWaiter(name) {
  if (confirm(`¿Estás seguro de que deseas eliminar a ${name}? Esto no borrará sus registros históricos si ya guardó ventas, pero lo quitará de las planillas activas.`)) {
    state.waiters = state.waiters.filter(w => w !== name);

    const activeWeek = getActiveWeek();
    if (activeWeek) {
      activeWeek.days.forEach(day => {
        day.shifts.AM = day.shifts.AM.filter(s => s.waiterName !== name);
        day.shifts.PM = day.shifts.PM.filter(s => s.waiterName !== name);
      });
    }

    saveToStorage();
    renderStaffList();
    renderDailySheets();
    renderSummary();
    showToast("Camarero eliminado");
  }
}

// Add Pool Staff (Cocina, Caja, Encargados)
function addPoolStaff(name, role) {
  const cleanName = name.trim().toUpperCase();
  if (!cleanName) return;

  if (role === 'Camareros') {
    addWaiter(cleanName);
    return;
  }

  if (state.poolStaff.some(s => s.name.toUpperCase() === cleanName && s.role === role)) {
    showToast(`El colaborador ${cleanName} ya existe en ${role}`, "error");
    return;
  }

  const newStaff = {
    id: 'staff-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
    name: cleanName,
    role: role,
    active: true
  };

  state.poolStaff.push(newStaff);

  // Synchronize counts
  if (role === 'Cocina') state.config.peopleCocina = state.poolStaff.filter(s => s.role === 'Cocina').length;
  if (role === 'Caja') state.config.peopleCaja = state.poolStaff.filter(s => s.role === 'Caja').length;
  if (role === 'Encargados') state.config.peopleEncargados = state.poolStaff.filter(s => s.role === 'Encargados').length;

  // Sync inputs in settings tab if rendered
  if (document.getElementById('cfg-people-cocina')) document.getElementById('cfg-people-cocina').value = state.config.peopleCocina;
  if (document.getElementById('cfg-people-caja')) document.getElementById('cfg-people-caja').value = state.config.peopleCaja;
  if (document.getElementById('cfg-people-encargados')) document.getElementById('cfg-people-encargados').value = state.config.peopleEncargados;

  saveToStorage();
  renderStaffList();
  updateAdvanceStaffDropdown();
  renderSummary();
  showToast(`Colaborador ${cleanName} agregado a ${role}`);
}

// Remove Pool Staff
function removePoolStaff(id) {
  const staff = state.poolStaff.find(s => s.id === id);
  if (!staff) return;

  if (confirm(`¿Estás seguro de que deseas eliminar a ${staff.name} de ${staff.role}? Esto actualizará la dotación del área.`)) {
    const role = staff.role;
    state.poolStaff = state.poolStaff.filter(s => s.id !== id);

    // Synchronize counts
    if (role === 'Cocina') state.config.peopleCocina = state.poolStaff.filter(s => s.role === 'Cocina').length;
    if (role === 'Caja') state.config.peopleCaja = state.poolStaff.filter(s => s.role === 'Caja').length;
    if (role === 'Encargados') state.config.peopleEncargados = state.poolStaff.filter(s => s.role === 'Encargados').length;

    // Sync inputs in settings tab if rendered
    if (document.getElementById('cfg-people-cocina')) document.getElementById('cfg-people-cocina').value = state.config.peopleCocina;
    if (document.getElementById('cfg-people-caja')) document.getElementById('cfg-people-caja').value = state.config.peopleCaja;
    if (document.getElementById('cfg-people-encargados')) document.getElementById('cfg-people-encargados').value = state.config.peopleEncargados;

    saveToStorage();
    renderStaffList();
    updateAdvanceStaffDropdown();
    renderSummary();
    showToast(`Colaborador eliminado de ${role}`);
  }
}

// Compatibility alias
const renderWaitersList = renderStaffList;

// Render Daily shift sheets
function renderDailySheets() {
  const activeWeek = getActiveWeek();
  if (!activeWeek) {
    document.getElementById('day-tab-selector').innerHTML = '';
    document.getElementById('current-day-title').textContent = 'No hay semanas registradas';
    document.getElementById('day-val-sales').textContent = '$0';
    document.getElementById('day-val-tip').textContent = '$0';
    document.getElementById('day-val-ret').textContent = '$0';
    document.getElementById('am-table-body').innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Crea una semana en el menú lateral para comenzar.</td></tr>';
    document.getElementById('pm-table-body').innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Crea una semana en el menú lateral para comenzar.</td></tr>';
    return;
  }

  const dayTabSelector = document.getElementById('day-tab-selector');
  dayTabSelector.innerHTML = '';

  // Create Day Tabs
  activeWeek.days.forEach((day, index) => {
    const btn = document.createElement('button');
    btn.className = `day-btn ${index === state.currentDayIndex ? 'active' : ''}`;
    btn.textContent = `Día ${day.dateLabel}`;
    btn.onclick = () => {
      state.currentDayIndex = index;
      saveToStorage();
      renderDailySheets();
    };
    dayTabSelector.appendChild(btn);
  });

  // Load data for the active day
  const activeDay = activeWeek.days[state.currentDayIndex];
  document.getElementById('current-day-title').textContent = `Planilla del Día: ${activeDay.dateLabel}`;

  const amTableBody = document.getElementById('am-table-body');
  const pmTableBody = document.getElementById('pm-table-body');

  // Render AM table
  renderShiftTable(activeDay.shifts.AM, amTableBody, 'AM');
  // Render PM table
  renderShiftTable(activeDay.shifts.PM, pmTableBody, 'PM');

  // Render Daily Day Summary
  renderDailySummary(activeDay);
}

// Render Shift Table (AM or PM)
function renderShiftTable(shiftData, tableBody, shiftType) {
  tableBody.innerHTML = '';

  let totalSales = 0;
  let totalEstimatedTip = 0;
  let totalRetention = 0;

  shiftData.forEach((record, index) => {
    const sales = Number(record.sales) || 0;
    const estTip = sales * (state.config.tipPercentage / 100);
    const retention = estTip * (state.config.retentionPercentage / 100);

    totalSales += sales;
    totalEstimatedTip += estTip;
    totalRetention += retention;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${record.waiterName}</strong></td>
      <td>
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
          <span>$</span>
          <input type="text" class="form-control sales-input" 
            value="${record.sales ? formatNumberString(record.sales) : ''}" 
            placeholder="0" 
            onfocus="this.value = this.value.replace(/\\./g, '')"
            onblur="if(this.value) this.value = formatNumberString(this.value)"
            onchange="updateSales('${shiftType}', ${index}, this.value)" />
        </div>
      </td>
      <td style="text-align: right;">${formatCurrency(estTip)}</td>
      <td style="text-align: right; color: var(--warning); font-weight: 500;">${formatCurrency(retention)}</td>
    `;
    tableBody.appendChild(tr);
  });

  // Total Row
  const totalTr = document.createElement('tr');
  totalTr.className = 'total-row';
  totalTr.innerHTML = `
    <td>TOTAL TURNO ${shiftType === 'AM' ? 'MAÑANA (AM)' : 'NOCHE (PM)'}</td>
    <td style="text-align: right; font-weight: bold;">${formatCurrency(totalSales)}</td>
    <td style="text-align: right; font-weight: bold;">${formatCurrency(totalEstimatedTip)}</td>
    <td style="text-align: right; font-weight: bold; color: var(--warning);">${formatCurrency(totalRetention)}</td>
  `;
  tableBody.appendChild(totalTr);
}

// Update Sales Record
function updateSales(shiftType, index, value) {
  const activeWeek = getActiveWeek();
  if (!activeWeek) return;

  const activeDay = activeWeek.days[state.currentDayIndex];
  const numValue = parseFormattedNumber(value);

  activeDay.shifts[shiftType][index].sales = numValue;

  saveToStorage();

  // Recalculate and update interface
  // Render table totals & summary cards
  renderDailySheets();
  renderSummary();
  renderWeeksList(); // update total sales badge in sidebar
}

// Render Daily Day Summary Cards
function renderDailySummary(day) {
  let amSales = 0, pmSales = 0;
  let amTip = 0, pmTip = 0;
  let amRet = 0, pmRet = 0;

  day.shifts.AM.forEach(s => {
    const sSales = Number(s.sales) || 0;
    amSales += sSales;
    amTip += sSales * (state.config.tipPercentage / 100);
  });
  amRet = amTip * (state.config.retentionPercentage / 100);

  day.shifts.PM.forEach(s => {
    const sSales = Number(s.sales) || 0;
    pmSales += sSales;
    pmTip += sSales * (state.config.tipPercentage / 100);
  });
  pmRet = pmTip * (state.config.retentionPercentage / 100);

  const totalSales = amSales + pmSales;
  const totalTip = amTip + pmTip;
  const totalRet = amRet + pmRet;

  // Update UI values
  document.getElementById('day-val-sales').textContent = formatCurrency(totalSales);
  document.getElementById('day-val-tip').textContent = formatCurrency(totalTip);
  document.getElementById('day-val-ret').textContent = formatCurrency(totalRet);
}

// Render Weekly Summary Tab
function renderSummary() {
  const activeWeek = getActiveWeek();
  if (!activeWeek) {
    document.getElementById('summary-week-title').textContent = 'No hay semanas registradas';
    document.getElementById('summary-table-body').innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Crea una semana en el menú lateral para comenzar.</td></tr>';
    document.getElementById('kpi-weekly-tips').textContent = '$0';
    document.getElementById('kpi-weekly-retained').textContent = '$0';
    document.getElementById('kpi-weekly-avg-waiter').textContent = '$0';
    document.getElementById('kpi-weekly-avg-turn').textContent = '$0';
    document.getElementById('dist-val-cocina').textContent = '$0';
    document.getElementById('dist-val-caja').textContent = '$0';
    document.getElementById('dist-val-encargados').textContent = '$0';
    document.getElementById('dist-val-total').textContent = '$0';
    return;
  }

  document.getElementById('summary-week-title').textContent = `Período de Liquidación: ${activeWeek.startDateLabel} al ${activeWeek.endDateLabel}`;

  const summaryBody = document.getElementById('summary-table-body');
  summaryBody.innerHTML = '';

  // Consolidate data by waiter
  const totals = {};
  state.waiters.forEach(name => {
    totals[name] = {
      sales: 0,
      tip: 0,
      retention: 0,
      turnsWorked: 0
    };
  });

  activeWeek.days.forEach(day => {
    // Process AM
    day.shifts.AM.forEach(s => {
      const name = s.waiterName;
      if (!totals[name]) totals[name] = { sales: 0, tip: 0, retention: 0, turnsWorked: 0 };
      const sales = Number(s.sales) || 0;
      totals[name].sales += sales;
      if (sales > 0) {
        totals[name].turnsWorked++;
      }
    });

    // Process PM
    day.shifts.PM.forEach(s => {
      const name = s.waiterName;
      if (!totals[name]) totals[name] = { sales: 0, tip: 0, retention: 0, turnsWorked: 0 };
      const sales = Number(s.sales) || 0;
      totals[name].sales += sales;
      if (sales > 0) {
        totals[name].turnsWorked++;
      }
    });
  });

  // Calculate tips and retentions based on consolidated sales
  let grandTotalSales = 0;
  let grandTotalTip = 0;
  let grandTotalRet = 0;
  let grandTotalTurns = 0;

  state.waiters.forEach(name => {
    const data = totals[name];
    data.tip = data.sales * (state.config.tipPercentage / 100);
    data.retention = data.tip * (state.config.retentionPercentage / 100);

    grandTotalSales += data.sales;
    grandTotalTip += data.tip;
    grandTotalRet += data.retention;
    grandTotalTurns += data.turnsWorked;

    const avgTipPerTurn = data.turnsWorked > 0 ? (data.tip / data.turnsWorked) : 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${name}</strong></td>
      <td style="text-align: right;">${formatCurrency(data.sales)}</td>
      <td style="text-align: right;">${formatCurrency(data.tip)}</td>
      <td style="text-align: right; color: var(--warning); font-weight: 500;">${formatCurrency(data.retention)}</td>
      <td style="text-align: center;">${data.turnsWorked}</td>
      <td style="text-align: right;">${formatCurrency(avgTipPerTurn)}</td>
    `;
    summaryBody.appendChild(tr);
  });

  // Grand Totals Row
  const totalTr = document.createElement('tr');
  totalTr.className = 'total-row';
  totalTr.innerHTML = `
    <td>TOTALES SEMANALES</td>
    <td style="text-align: right; font-weight: bold;">${formatCurrency(grandTotalSales)}</td>
    <td style="text-align: right; font-weight: bold;">${formatCurrency(grandTotalTip)}</td>
    <td style="text-align: right; font-weight: bold; color: var(--warning);">${formatCurrency(grandTotalRet)}</td>
    <td style="text-align: center; font-weight: bold;">${grandTotalTurns}</td>
    <td style="text-align: right; font-weight: bold;">${formatCurrency(grandTotalTurns > 0 ? (grandTotalTip / grandTotalTurns) : 0)}</td>
  `;
  summaryBody.appendChild(totalTr);

  // Render KPI Card Metrics
  document.getElementById('kpi-weekly-tips').textContent = formatCurrency(grandTotalTip);
  document.getElementById('kpi-weekly-retained').textContent = formatCurrency(grandTotalRet);

  const numWaiters = state.waiters.length;
  const avgTipPerWaiter = numWaiters > 0 ? (grandTotalTip / numWaiters) : 0;
  document.getElementById('kpi-weekly-avg-waiter').textContent = formatCurrency(avgTipPerWaiter);

  const avgTipPerTurnGlobal = grandTotalTurns > 0 ? (grandTotalTip / grandTotalTurns) : 0;
  document.getElementById('kpi-weekly-avg-turn').textContent = formatCurrency(avgTipPerTurnGlobal);

  // Distribution calculations (Aporte a Cocina, Caja, Encargados)
  calculateDistribution(grandTotalRet);
}

// Calculate the distribution pool based on factors and employee counts
function calculatePoolDistribution(totalPool) {
  const factorCocina = Number(state.config.distCocina) || 0;
  const factorCaja = Number(state.config.distCaja) || 0;
  const factorEncargados = Number(state.config.distEncargados) || 0;

  const peopleCocina = Number(state.config.peopleCocina) || 0;
  const peopleCaja = Number(state.config.peopleCaja) || 0;
  const peopleEncargados = Number(state.config.peopleEncargados) || 0;

  const pointsCocina = factorCocina * peopleCocina;
  const pointsCaja = factorCaja * peopleCaja;
  const pointsEncargados = factorEncargados * peopleEncargados;

  const totalPoints = pointsCocina + pointsCaja + pointsEncargados;
  const totalPeople = peopleCocina + peopleCaja + peopleEncargados;

  const result = {
    totalPool: totalPool,
    totalPoints: totalPoints,
    totalPeople: totalPeople,
    groups: {
      Cocina: { name: 'Cocina', factor: factorCocina, people: peopleCocina, points: pointsCocina, percentage: 0, amount: 0 },
      Caja: { name: 'Caja', factor: factorCaja, people: peopleCaja, points: pointsCaja, percentage: 0, amount: 0 },
      Encargados: { name: 'Encargados', factor: factorEncargados, people: peopleEncargados, points: pointsEncargados, percentage: 0, amount: 0 }
    },
    individuals: []
  };

  if (totalPoints <= 0 || totalPeople <= 0) {
    return result;
  }

  // Calculate percentages
  result.groups.Cocina.percentage = (pointsCocina / totalPoints) * 100;
  result.groups.Caja.percentage = (pointsCaja / totalPoints) * 100;
  result.groups.Encargados.percentage = (pointsEncargados / totalPoints) * 100;

  // Build individuals list to distribute and adjust rounding cents
  const rolesList = ['Cocina', 'Caja', 'Encargados'];
  rolesList.forEach(roleKey => {
    const grp = result.groups[roleKey];
    for (let i = 0; i < grp.people; i++) {
      result.individuals.push({
        roleKey: roleKey,
        factor: grp.factor,
        points: grp.factor
      });
    }
  });

  // Distribute totalPool to individuals
  let sumAssigned = 0;
  result.individuals.forEach((ind, idx) => {
    if (idx === result.individuals.length - 1) {
      ind.amount = Math.max(0, totalPool - sumAssigned);
    } else {
      const share = (totalPool * ind.points) / totalPoints;
      ind.amount = Math.round(share * 100) / 100;
      sumAssigned += ind.amount;
    }
  });

  // Aggregate individual amounts back to groups
  rolesList.forEach(roleKey => {
    const grp = result.groups[roleKey];
    const grpInds = result.individuals.filter(ind => ind.roleKey === roleKey);
    grp.amount = grpInds.reduce((sum, ind) => sum + ind.amount, 0);
  });

  return result;
}

// Formats the individual amount display, showing a split if there is a rounding difference
function formatIndividualAmountDisplay(group, dist) {
  if (group.people <= 0) return formatCurrency(0);

  const grpInds = dist.individuals.filter(ind => ind.roleKey === group.name);
  if (grpInds.length === 0) return formatCurrency(0);

  const counts = {};
  grpInds.forEach(ind => {
    const amt = ind.amount;
    counts[amt] = (counts[amt] || 0) + 1;
  });

  const uniqueAmounts = Object.keys(counts).map(Number).sort((a, b) => b - a);
  if (uniqueAmounts.length === 1 || Math.abs(uniqueAmounts[0] - uniqueAmounts[uniqueAmounts.length - 1]) <= 1) {
    return formatCurrency(group.amount / group.people);
  } else {
    return uniqueAmounts.map(amt => `${counts[amt]} x ${formatCurrency(amt)}`).join(' / ');
  }
}

// Formats the individual amount display, showing a split if there is a rounding difference
function formatIndividualAmountDisplayWithAdvances(groupName, dist, activeWeek) {
  const grp = dist.groups[groupName];
  if (grp.people <= 0) return formatCurrency(0);

  const advances = (activeWeek && activeWeek.otherAdvances || []).filter(a => a.role === groupName);
  const grpInds = dist.individuals.filter(ind => ind.roleKey === groupName);
  if (grpInds.length === 0) return formatCurrency(0);
  
  const grossPerPerson = grp.amount / grp.people;

  if (advances.length === 0) {
    return formatIndividualAmountDisplay(grp, dist);
  }

  const parts = [];
  advances.forEach(adv => {
    const net = grossPerPerson - adv.amount;
    parts.push(`${adv.name}: ${formatCurrency(net)}`);
  });

  const remaining = grp.people - advances.length;
  if (remaining > 0) {
    parts.push(`${remaining} emp: ${formatCurrency(grossPerPerson)}`);
  }

  return parts.join(' | ');
}

// Update staff dropdown in advances form
function updateAdvanceStaffDropdown() {
  const roleSelect = document.getElementById('pool-adv-role');
  const staffSelect = document.getElementById('pool-adv-staff-select');
  if (!roleSelect || !staffSelect) return;

  const selectedRole = roleSelect.value;
  const filteredStaff = state.poolStaff.filter(s => s.role === selectedRole);

  staffSelect.innerHTML = '';
  if (filteredStaff.length === 0) {
    staffSelect.innerHTML = `<option value="">No hay colaboradores en ${selectedRole}</option>`;
    return;
  }

  filteredStaff.forEach(staff => {
    const opt = document.createElement('option');
    opt.value = staff.id;
    opt.textContent = staff.name;
    staffSelect.appendChild(opt);
  });
}

// Add pool advance
function addPoolAdvance(staffIdOrName, role, amount) {
  const activeWeek = getActiveWeek();
  if (!activeWeek) return;

  if (!activeWeek.otherAdvances) {
    activeWeek.otherAdvances = [];
  }

  // Look for staff member in poolStaff
  const staff = state.poolStaff.find(s => s.id === staffIdOrName || s.name.toUpperCase() === String(staffIdOrName).trim().toUpperCase());
  const employeeName = staff ? staff.name : String(staffIdOrName).trim().toUpperCase();

  const newAdv = {
    id: 'pool-adv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    staffId: staff ? staff.id : null,
    name: employeeName,
    role: role,
    amount: Number(amount) || 0,
    date: new Date().toLocaleDateString('es-AR')
  };

  activeWeek.otherAdvances.push(newAdv);
  saveToStorage();
  renderSummary();
  showToast(`Adelanto de ${newAdv.name} registrado con éxito`);
}

// Delete pool advance
function deletePoolAdvance(advId) {
  const activeWeek = getActiveWeek();
  if (!activeWeek) return;

  const originalLen = activeWeek.otherAdvances.length;
  activeWeek.otherAdvances = activeWeek.otherAdvances.filter(adv => adv.id !== advId);

  if (activeWeek.otherAdvances.length < originalLen) {
    saveToStorage();
    renderSummary();
    showToast("Adelanto eliminado");
  }
}

// Render pool advances list tags
function renderPoolAdvancesList(activeWeek) {
  const container = document.getElementById('pool-advances-list');
  if (!container) return;

  container.innerHTML = '';
  if (!activeWeek || !activeWeek.otherAdvances || activeWeek.otherAdvances.length === 0) {
    container.innerHTML = '<span style="color: var(--text-muted); font-size: 13px;">No hay adelantos de personal del pozo registrados esta semana.</span>';
    return;
  }

  activeWeek.otherAdvances.forEach(adv => {
    const badge = document.createElement('div');
    let roleClass = 'dist-cocina';
    if (adv.role === 'Caja') roleClass = 'dist-caja';
    if (adv.role === 'Encargados') roleClass = 'dist-encargados';

    badge.className = `dist-badge ${roleClass}`;
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.gap = '8px';
    badge.style.padding = '6px 12px';
    badge.style.borderRadius = '20px';

    badge.innerHTML = `
      <span><strong>${adv.name}</strong> (${adv.role}): ${formatCurrency(adv.amount)}</span>
      <button style="background: none; border: none; color: inherit; cursor: pointer; font-weight: bold; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; hover: { background: rgba(0,0,0,0.1) }" onclick="deletePoolAdvance('${adv.id}')" title="Eliminar">&times;</button>
    `;
    container.appendChild(badge);
  });
}

// Calculate and render the distribution pool
function calculateDistribution(totalPool) {
  const dist = calculatePoolDistribution(totalPool);
  const activeWeek = getActiveWeek();

  // Render pool advances list
  renderPoolAdvancesList(activeWeek);

  // Calculate other advances sums
  let advCocina = 0;
  let advCaja = 0;
  let advEncargados = 0;

  if (activeWeek && activeWeek.otherAdvances) {
    activeWeek.otherAdvances.forEach(adv => {
      if (adv.role === 'Cocina') advCocina += adv.amount;
      if (adv.role === 'Caja') advCaja += adv.amount;
      if (adv.role === 'Encargados') advEncargados += adv.amount;
    });
  }

  const netCocina = dist.groups.Cocina.amount - advCocina;
  const netCaja = dist.groups.Caja.amount - advCaja;
  const netEncargados = dist.groups.Encargados.amount - advEncargados;
  const totalNet = netCocina + netCaja + netEncargados;

  // Sync factor and dotation inputs with current config
  if (document.getElementById('cfg-dist-cocina')) document.getElementById('cfg-dist-cocina').value = state.config.distCocina;
  if (document.getElementById('cfg-dist-caja')) document.getElementById('cfg-dist-caja').value = state.config.distCaja;
  if (document.getElementById('cfg-dist-encargados')) document.getElementById('cfg-dist-encargados').value = state.config.distEncargados;
  if (document.getElementById('cfg-people-cocina')) document.getElementById('cfg-people-cocina').value = state.config.peopleCocina;
  if (document.getElementById('cfg-people-caja')) document.getElementById('cfg-people-caja').value = state.config.peopleCaja;
  if (document.getElementById('cfg-people-encargados')) document.getElementById('cfg-people-encargados').value = state.config.peopleEncargados;

  const perCocina = dist.groups.Cocina.people > 0 ? (netCocina / dist.groups.Cocina.people) : 0;
  const perCaja = dist.groups.Caja.people > 0 ? (netCaja / dist.groups.Caja.people) : 0;
  const perEncargados = dist.groups.Encargados.people > 0 ? (netEncargados / dist.groups.Encargados.people) : 0;

  const cocinaCard = document.getElementById('dist-val-cocina');
  if (cocinaCard) {
    if (advCocina > 0) {
      cocinaCard.innerHTML = `${formatCurrency(perCocina)} <span style="font-size:13px; font-weight:normal; color:var(--text-secondary);">/ pers</span><div style="font-size:12px; font-weight:normal; color:var(--text-secondary); margin-top:4px;">Neto grupo: ${formatCurrency(netCocina)} | Adelantos: ${formatCurrency(advCocina)}</div>`;
    } else {
      cocinaCard.innerHTML = `${formatCurrency(perCocina)} <span style="font-size:13px; font-weight:normal; color:var(--text-secondary);">/ pers</span><div style="font-size:12px; font-weight:normal; color:var(--text-secondary); margin-top:4px;">Total grupo: ${formatCurrency(dist.groups.Cocina.amount)} (${dist.groups.Cocina.people} pers)</div>`;
    }
  }

  const cajaCard = document.getElementById('dist-val-caja');
  if (cajaCard) {
    if (advCaja > 0) {
      cajaCard.innerHTML = `${formatCurrency(perCaja)} <span style="font-size:13px; font-weight:normal; color:var(--text-secondary);">/ pers</span><div style="font-size:12px; font-weight:normal; color:var(--text-secondary); margin-top:4px;">Neto grupo: ${formatCurrency(netCaja)} | Adelantos: ${formatCurrency(advCaja)}</div>`;
    } else {
      cajaCard.innerHTML = `${formatCurrency(perCaja)} <span style="font-size:13px; font-weight:normal; color:var(--text-secondary);">/ pers</span><div style="font-size:12px; font-weight:normal; color:var(--text-secondary); margin-top:4px;">Total grupo: ${formatCurrency(dist.groups.Caja.amount)} (${dist.groups.Caja.people} pers)</div>`;
    }
  }

  const encargadosCard = document.getElementById('dist-val-encargados');
  if (encargadosCard) {
    if (advEncargados > 0) {
      encargadosCard.innerHTML = `${formatCurrency(perEncargados)} <span style="font-size:13px; font-weight:normal; color:var(--text-secondary);">/ pers</span><div style="font-size:12px; font-weight:normal; color:var(--text-secondary); margin-top:4px;">Neto grupo: ${formatCurrency(netEncargados)} | Adelantos: ${formatCurrency(advEncargados)}</div>`;
    } else {
      encargadosCard.innerHTML = `${formatCurrency(perEncargados)} <span style="font-size:13px; font-weight:normal; color:var(--text-secondary);">/ pers</span><div style="font-size:12px; font-weight:normal; color:var(--text-secondary); margin-top:4px;">Total grupo: ${formatCurrency(dist.groups.Encargados.amount)} (${dist.groups.Encargados.people} pers)</div>`;
    }
  }

  const totalRepartidoCard = document.getElementById('dist-val-total');
  if (totalRepartidoCard) {
    if (advCocina + advCaja + advEncargados > 0) {
      totalRepartidoCard.innerHTML = `${formatCurrency(totalNet)} <span style="font-size:13px; font-weight:normal; color:var(--text-secondary);"> (Bruto: ${formatCurrency(dist.groups.Cocina.amount + dist.groups.Caja.amount + dist.groups.Encargados.amount)})</span>`;
    } else {
      totalRepartidoCard.textContent = formatCurrency(dist.groups.Cocina.amount + dist.groups.Caja.amount + dist.groups.Encargados.amount);
    }
  }

  // Render detailed summary table body
  const tbody = document.getElementById('dist-summary-table-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td><strong>Cocina</strong></td>
        <td style="text-align: center;">${dist.groups.Cocina.people}</td>
        <td style="text-align: center;">${dist.groups.Cocina.factor}</td>
        <td style="text-align: center;">${dist.groups.Cocina.points}</td>
        <td style="text-align: center;">${dist.groups.Cocina.percentage.toFixed(2)}%</td>
        <td style="text-align: right; font-weight: 500;">${formatCurrency(dist.groups.Cocina.amount)}</td>
        <td style="text-align: right; color: var(--danger);">${formatCurrency(advCocina)}</td>
        <td style="text-align: right; font-weight: 500; color: var(--accent);">${formatCurrency(netCocina)}</td>
        <td style="text-align: right; color: var(--success); font-weight: 500;">${formatIndividualAmountDisplayWithAdvances('Cocina', dist, activeWeek)}</td>
      </tr>
      <tr>
        <td><strong>Caja</strong></td>
        <td style="text-align: center;">${dist.groups.Caja.people}</td>
        <td style="text-align: center;">${dist.groups.Caja.factor}</td>
        <td style="text-align: center;">${dist.groups.Caja.points}</td>
        <td style="text-align: center;">${dist.groups.Caja.percentage.toFixed(2)}%</td>
        <td style="text-align: right; font-weight: 500;">${formatCurrency(dist.groups.Caja.amount)}</td>
        <td style="text-align: right; color: var(--danger);">${formatCurrency(advCaja)}</td>
        <td style="text-align: right; font-weight: 500; color: var(--accent);">${formatCurrency(netCaja)}</td>
        <td style="text-align: right; color: var(--success); font-weight: 500;">${formatIndividualAmountDisplayWithAdvances('Caja', dist, activeWeek)}</td>
      </tr>
      <tr>
        <td><strong>Encargados</strong></td>
        <td style="text-align: center;">${dist.groups.Encargados.people}</td>
        <td style="text-align: center;">${dist.groups.Encargados.factor}</td>
        <td style="text-align: center;">${dist.groups.Encargados.points}</td>
        <td style="text-align: center;">${dist.groups.Encargados.percentage.toFixed(2)}%</td>
        <td style="text-align: right; font-weight: 500;">${formatCurrency(dist.groups.Encargados.amount)}</td>
        <td style="text-align: right; color: var(--danger);">${formatCurrency(advEncargados)}</td>
        <td style="text-align: right; font-weight: 500; color: var(--accent);">${formatCurrency(netEncargados)}</td>
        <td style="text-align: right; color: var(--success); font-weight: 500;">${formatIndividualAmountDisplayWithAdvances('Encargados', dist, activeWeek)}</td>
      </tr>
    `;
  }

  // Render detailed summary table total row
  const tfoot = document.getElementById('dist-summary-total-row');
  if (tfoot) {
    const totalAdv = advCocina + advCaja + advEncargados;
    tfoot.innerHTML = `
      <td><strong>TOTAL</strong></td>
      <td style="text-align: center; font-weight: bold;">${dist.totalPeople}</td>
      <td style="text-align: center;">-</td>
      <td style="text-align: center; font-weight: bold;">${dist.totalPoints}</td>
      <td style="text-align: center; font-weight: bold;">100.00%</td>
      <td style="text-align: right; font-weight: bold;">${formatCurrency(dist.totalPool)}</td>
      <td style="text-align: right; font-weight: bold; color: var(--danger);">${formatCurrency(totalAdv)}</td>
      <td style="text-align: right; font-weight: bold; color: var(--success);">${formatCurrency(totalNet)}</td>
      <td style="text-align: right;">-</td>
    `;
  }

  // Render individual staff net liquidation table
  renderStaffLiquidationTable(activeWeek, dist);
  updateAdvanceStaffDropdown();
}

// Calculate individual staff liquidation breakdown
function calculateStaffLiquidations(activeWeek, dist) {
  const liquidations = [];
  const roles = ['Cocina', 'Caja', 'Encargados'];

  roles.forEach(roleKey => {
    const groupInfo = dist.groups[roleKey];
    const groupStaff = state.poolStaff.filter(s => s.role === roleKey);
    const count = groupStaff.length;
    const grossPerPerson = count > 0 ? (groupInfo.amount / count) : 0;

    groupStaff.forEach(staff => {
      // Find advances for this specific employee
      const staffAdvances = (activeWeek && activeWeek.otherAdvances) 
        ? activeWeek.otherAdvances.filter(a => (a.staffId && a.staffId === staff.id) || (a.name && a.name.toUpperCase() === staff.name.toUpperCase()))
        : [];
      
      const totalAdv = staffAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      const net = Math.max(0, grossPerPerson - totalAdv);

      liquidations.push({
        id: staff.id,
        name: staff.name,
        role: staff.role,
        gross: grossPerPerson,
        advances: totalAdv,
        net: net,
        advancesList: staffAdvances
      });
    });
  });

  return liquidations;
}

// Render individual staff liquidation table
function renderStaffLiquidationTable(activeWeek, dist) {
  const tbody = document.getElementById('staff-liquidation-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  const liquidations = calculateStaffLiquidations(activeWeek, dist);

  if (liquidations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No hay colaboradores registrados en la nómina del pozo.</td></tr>';
    return;
  }

  liquidations.forEach(item => {
    let roleClass = 'dist-cocina';
    if (item.role === 'Caja') roleClass = 'dist-caja';
    if (item.role === 'Encargados') roleClass = 'dist-encargados';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${item.name}</strong></td>
      <td><span class="dist-badge ${roleClass}">${item.role}</span></td>
      <td style="text-align: right; font-weight: 500;">${formatCurrency(item.gross)}</td>
      <td style="text-align: right; color: var(--danger); font-weight: 500;">${item.advances > 0 ? '-' + formatCurrency(item.advances) : '$0'}</td>
      <td style="text-align: right; color: var(--success); font-weight: 700; font-size: 15px;">${formatCurrency(item.net)}</td>
      <td style="text-align: center;">
        <button class="btn btn-secondary btn-icon" style="padding: 5px 12px; font-size: 12px; height: 32px;" onclick="openReceiptModal('${item.id}')" title="Ver e imprimir comprobante">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Recibo
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Open Receipt Modal
function openReceiptModal(staffId) {
  const activeWeek = getActiveWeek();
  if (!activeWeek) return;

  const totalPool = calculateWeekTotalRetained(activeWeek);
  const dist = calculatePoolDistribution(totalPool);
  const liquidations = calculateStaffLiquidations(activeWeek, dist);
  const item = liquidations.find(l => l.id === staffId);
  if (!item) return;

  state.currentReceiptStaffId = staffId;

  let roleClass = 'dist-cocina';
  if (item.role === 'Caja') roleClass = 'dist-caja';
  if (item.role === 'Encargados') roleClass = 'dist-encargados';

  const ticketContainer = document.getElementById('receipt-ticket-content');
  if (!ticketContainer) return;

  let advancesHtml = '';
  if (item.advancesList.length > 0) {
    advancesHtml = item.advancesList.map(a => `
      <div class="receipt-row" style="color: #b91c1c; font-size: 13px;">
        <span>Adelanto (${a.date || 'Semana'})</span>
        <span>- ${formatCurrency(a.amount)}</span>
      </div>
    `).join('');
  } else {
    advancesHtml = `
      <div class="receipt-row" style="color: #64748b; font-size: 13px;">
        <span>Sin adelantos en la semana</span>
        <span>$0</span>
      </div>
    `;
  }

  ticketContainer.innerHTML = `
    <div class="receipt-ticket-header">
      <h2>SISTEMA DE PROPINAS</h2>
      <p>Comprobante Oficial de Liquidación Semanal</p>
      <span class="receipt-badge ${roleClass}">${item.role}</span>
    </div>

    <div class="receipt-ticket-body">
      <div class="receipt-row highlight">
        <span>Colaborador:</span>
        <strong style="color: #0f172a; font-size: 15px;">${item.name}</strong>
      </div>
      <div class="receipt-row">
        <span style="color: #64748b;">Período Semanal:</span>
        <span>${activeWeek.startDateLabel} al ${activeWeek.endDateLabel}</span>
      </div>
      <div class="receipt-row">
        <span style="color: #64748b;">Fecha Emisión:</span>
        <span>${new Date().toLocaleDateString('es-AR')}</span>
      </div>

      <div style="margin: 14px 0 6px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">
        Detalle de Fondos
      </div>
      <div class="receipt-row">
        <span>Importe Bruto Asignado:</span>
        <strong>${formatCurrency(item.gross)}</strong>
      </div>
      
      <div style="margin: 10px 0 4px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">
        Deducción de Adelantos
      </div>
      ${advancesHtml}

      <div class="receipt-row total-due">
        <span>TOTAL NETO A PERCIBIR:</span>
        <span style="font-size: 18px;">${formatCurrency(item.net)}</span>
      </div>
    </div>

    <div class="receipt-ticket-footer">
      <p style="font-size: 12px; color: #64748b; margin-bottom: 24px;">
        Recibí conforme el importe neto arriba expresado en concepto de participación del pozo de propinas.
      </p>
      <div class="signature-line">
        Firma y Aclaración del Colaborador
      </div>
    </div>
  `;

  const modal = document.getElementById('receipt-modal');
  if (modal) modal.classList.add('show');
}

// Close Receipt Modal
function closeReceiptModal() {
  const modal = document.getElementById('receipt-modal');
  if (modal) modal.classList.remove('show');
}

// Print Receipt
function printReceipt() {
  window.print();
}

// Update Distribution Configuration
function updateDistConfig(field, value) {
  const num = parseInt(value, 10);
  state.config[field] = isNaN(num) ? 0 : num;
  saveToStorage();

  const activeWeek = getActiveWeek();
  if (activeWeek) {
    calculateDistribution(calculateWeekTotalRetained(activeWeek));
  }
}

// Update People Configuration
function updatePeopleConfig(field, value) {
  const num = parseInt(value, 10);
  state.config[field] = isNaN(num) ? 0 : num;
  saveToStorage();

  const activeWeek = getActiveWeek();
  if (activeWeek) {
    calculateDistribution(calculateWeekTotalRetained(activeWeek));
  }
}

// Update Global Configuration (Tip % and Retention %)
function updateGlobalConfig(field, value) {
  const num = parseFloat(value);
  state.config[field] = isNaN(num) ? 0 : num;
  saveToStorage();

  renderDailySheets();
  renderSummary();
  showToast("Configuración general actualizada");
}

// Export to JSON Backup
function exportBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `respaldo_propinas_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Respaldo JSON descargado");
}

// Import JSON Backup
function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.waiters && parsed.weeks) {
        state = parsed;
        saveToStorage();
        loadFromStorage();

        // Refresh UI
        renderWeeksList();
        renderWaitersList();
        renderDailySheets();
        renderSummary();

        // Set config inputs in settings
        document.getElementById('cfg-tip-perc').value = state.config.tipPercentage;
        document.getElementById('cfg-ret-perc').value = state.config.retentionPercentage;
        document.getElementById('cfg-dist-cocina').value = state.config.distCocina;
        document.getElementById('cfg-dist-caja').value = state.config.distCaja;
        document.getElementById('cfg-dist-encargados').value = state.config.distEncargados;
        document.getElementById('cfg-people-cocina').value = state.config.peopleCocina;
        document.getElementById('cfg-people-caja').value = state.config.peopleCaja;
        document.getElementById('cfg-people-encargados').value = state.config.peopleEncargados;

        showToast("Respaldo importado correctamente");
      } else {
        showToast("El archivo no tiene el formato correcto", "error");
      }
    } catch (err) {
      showToast("Error al leer el archivo JSON", "error");
    }
  };
  reader.readAsText(file);
}

// Reset System Data
function resetSystem() {
  const pinInput = prompt("Ingrese el PIN de seguridad para restablecer el sistema:");
  if (pinInput === null) return; // Cancelled prompt

  const correctPin = state.config.securityPin || "1270";
  if (pinInput !== correctPin) {
    showToast("PIN incorrecto. Operación cancelada.", "error");
    return;
  }

  if (confirm("ATENCIÓN: Se borrarán todos los mozos y planillas guardadas. ¿Deseas restablecer el sistema de fábrica?")) {
    localStorage.removeItem('sistema_propinas_data');
    location.reload();
  }
}

// Tab Switching Lógica
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const activeBtn = document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`);
  if (activeBtn) activeBtn.classList.add('active');

  const activeContent = document.getElementById(tabId);
  if (activeContent) activeContent.classList.add('active');

  // Specific tab loading details
  if (tabId === 'waiters-tab') {
    renderStaffList();
  } else if (tabId === 'summary-tab') {
    updateAdvanceStaffDropdown();
    renderSummary();
  } else if (tabId === 'daily-tab') {
    renderDailySheets();
  }
}

// Theme Toggle
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('sistema_propinas_theme', newTheme);

  const themeIcon = document.getElementById('theme-icon');
  if (newTheme === 'light') {
    themeIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  } else {
    themeIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
  }
}

// Initialize Theme
function initTheme() {
  const savedTheme = localStorage.getItem('sistema_propinas_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeIcon = document.getElementById('theme-icon');
  if (savedTheme === 'light') {
    themeIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  } else {
    themeIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
  }
}

// Dynamic Excel Generation with SheetJS
function exportToExcel() {
  const activeWeek = getActiveWeek();
  if (!activeWeek) return;

  if (typeof XLSX === 'undefined') {
    showToast("Error: No se pudo cargar la librería de exportación", "error");
    return;
  }

  // Create new Workbook
  const wb = XLSX.utils.book_new();
  
  // Format string for Argentine Currency ($ 1.500)
  const currencyFormat = '"$"#,##0';

  // --- SHEET 1: CAMAREROS ---
  const wsCamarerosData = [
    [{ v: "👤 GESTIÓN DE CAMAREROS / MOZOS", t: 's' }],
    [{ v: "Lista activa de personal de salón cargada en el sistema.", t: 's' }],
    [],
    [{ v: "Nombre del Camarero", t: 's' }]
  ];
  state.waiters.forEach(w => wsCamarerosData.push([{ v: w, t: 's' }]));
  const wsCamareros = XLSX.utils.aoa_to_sheet(wsCamarerosData);
  
  wsCamareros['!cols'] = [{ wch: 35 }];
  wsCamareros['!rows'] = [
    { hpt: 30 },
    { hpt: 18 },
    { hpt: 12 },
    { hpt: 22 }
  ];
  state.waiters.forEach(() => wsCamareros['!rows'].push({ hpt: 18 }));
  
  wsCamareros['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }
  ];
  wsCamareros['!views'] = [{ showGridLines: true }];
  
  XLSX.utils.book_append_sheet(wb, wsCamareros, "CAMAREROS");

  // --- SHEETS 2-8: DIARIOS ---
  activeWeek.days.forEach(day => {
    const wsDayData = [];
    const wsDayMerges = [];
    const wsDayRows = [];
    let rIndex = 0;

    // Title
    wsDayData.push([{ v: "📋 PLANILLA DIARIA DE CONTROL DE PROPINAS", t: 's' }]);
    wsDayMerges.push({ s: { r: rIndex, c: 0 }, e: { r: rIndex, c: 3 } });
    wsDayRows.push({ hpt: 30 });
    rIndex++;

    // Subtitle
    wsDayData.push([{ v: `Cálculo: ${state.config.tipPercentage}% Propina | ${state.config.retentionPercentage}% Retención | Fecha: ${day.dateLabel}`, t: 's' }]);
    wsDayMerges.push({ s: { r: rIndex, c: 0 }, e: { r: rIndex, c: 3 } });
    wsDayRows.push({ hpt: 18 });
    rIndex++;

    // Blank row
    wsDayData.push([]);
    wsDayRows.push({ hpt: 12 });
    rIndex++;

    // AM Section Header
    wsDayData.push([{ v: "☀️ TURNO MAÑANA (AM)", t: 's' }]);
    wsDayMerges.push({ s: { r: rIndex, c: 0 }, e: { r: rIndex, c: 3 } });
    wsDayRows.push({ hpt: 24 });
    rIndex++;

    // AM Column Headers
    wsDayData.push([
      { v: "Nombre del Mozo", t: 's' },
      { v: "Total Vendido ($)", t: 's' },
      { v: "Propina Estimada", t: 's' },
      { v: "A Entregar", t: 's' }
    ]);
    wsDayRows.push({ hpt: 20 });
    rIndex++;

    // AM records
    let amTotalSales = 0;
    day.shifts.AM.forEach(s => {
      const sales = Number(s.sales) || 0;
      const estTip = sales * (state.config.tipPercentage / 100);
      const retention = estTip * (state.config.retentionPercentage / 100);
      amTotalSales += sales;
      wsDayData.push([
        { v: s.waiterName, t: 's' },
        { v: sales, t: 'n', z: currencyFormat },
        { v: estTip, t: 'n', z: currencyFormat },
        { v: retention, t: 'n', z: currencyFormat }
      ]);
      wsDayRows.push({ hpt: 18 });
      rIndex++;
    });
    
    // AM Total row
    const amTotalTip = amTotalSales * (state.config.tipPercentage / 100);
    const amTotalRet = amTotalTip * (state.config.retentionPercentage / 100);
    wsDayData.push([
      { v: "TOTAL TURNO MAÑANA (AM)", t: 's' },
      { v: amTotalSales, t: 'n', z: currencyFormat },
      { v: amTotalTip, t: 'n', z: currencyFormat },
      { v: amTotalRet, t: 'n', z: currencyFormat }
    ]);
    wsDayRows.push({ hpt: 22 });
    rIndex++;
    
    // Blank row
    wsDayData.push([]);
    wsDayRows.push({ hpt: 15 });
    rIndex++;

    // PM Section Header
    wsDayData.push([{ v: "🌙 TURNO NOCHE (PM)", t: 's' }]);
    wsDayMerges.push({ s: { r: rIndex, c: 0 }, e: { r: rIndex, c: 3 } });
    wsDayRows.push({ hpt: 24 });
    rIndex++;

    // PM Column Headers
    wsDayData.push([
      { v: "Nombre del Mozo", t: 's' },
      { v: "Total Vendido ($)", t: 's' },
      { v: "Propina Estimada", t: 's' },
      { v: "A Entregar", t: 's' }
    ]);
    wsDayRows.push({ hpt: 20 });
    rIndex++;

    // PM records
    let pmTotalSales = 0;
    day.shifts.PM.forEach(s => {
      const sales = Number(s.sales) || 0;
      const estTip = sales * (state.config.tipPercentage / 100);
      const retention = estTip * (state.config.retentionPercentage / 100);
      pmTotalSales += sales;
      wsDayData.push([
        { v: s.waiterName, t: 's' },
        { v: sales, t: 'n', z: currencyFormat },
        { v: estTip, t: 'n', z: currencyFormat },
        { v: retention, t: 'n', z: currencyFormat }
      ]);
      wsDayRows.push({ hpt: 18 });
      rIndex++;
    });

    // PM Total row
    const pmTotalTip = pmTotalSales * (state.config.tipPercentage / 100);
    const pmTotalRet = pmTotalTip * (state.config.retentionPercentage / 100);
    wsDayData.push([
      { v: "TOTAL TURNO NOCHE (PM)", t: 's' },
      { v: pmTotalSales, t: 'n', z: currencyFormat },
      { v: pmTotalTip, t: 'n', z: currencyFormat },
      { v: pmTotalRet, t: 'n', z: currencyFormat }
    ]);
    wsDayRows.push({ hpt: 22 });
    rIndex++;

    // Blank row
    wsDayData.push([]);
    wsDayRows.push({ hpt: 15 });
    rIndex++;

    // General Summary Section Header
    wsDayData.push([{ v: "📊 RESUMEN TOTAL DEL DÍA (AM + PM)", t: 's' }]);
    wsDayMerges.push({ s: { r: rIndex, c: 0 }, e: { r: rIndex, c: 3 } });
    wsDayRows.push({ hpt: 24 });
    rIndex++;

    // General Summary Column Headers
    wsDayData.push([
      { v: "Concepto", t: 's' },
      { v: "Total Vendido ($)", t: 's' },
      { v: "Propina Estimada", t: 's' },
      { v: "A Entregar", t: 's' }
    ]);
    wsDayRows.push({ hpt: 20 });
    rIndex++;
    
    // General Total row
    const dayTotalSales = amTotalSales + pmTotalSales;
    const dayTotalTip = amTotalTip + pmTotalTip;
    const dayTotalRet = amTotalRet + pmTotalRet;
    wsDayData.push([
      { v: "TOTAL GENERAL DEL DÍA", t: 's' },
      { v: dayTotalSales, t: 'n', z: currencyFormat },
      { v: dayTotalTip, t: 'n', z: currencyFormat },
      { v: dayTotalRet, t: 'n', z: currencyFormat }
    ]);
    wsDayRows.push({ hpt: 22 });
    rIndex++;

    const wsDay = XLSX.utils.aoa_to_sheet(wsDayData);
    wsDay['!cols'] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 }
    ];
    wsDay['!rows'] = wsDayRows;
    wsDay['!merges'] = wsDayMerges;
    wsDay['!views'] = [{ showGridLines: true }];

    XLSX.utils.book_append_sheet(wb, wsDay, day.dateLabel);
  });

  // --- SHEET 9: RESUMEN ---
  const wsResumenData = [];
  const wsResumenMerges = [];
  const wsResumenRows = [];
  let rResIndex = 0;

  // Title
  wsResumenData.push([{ v: "📈 RESUMEN SEMANAL DE CONTROL DE PROPINAS Y VENTAS", t: 's' }]);
  wsResumenMerges.push({ s: { r: rResIndex, c: 0 }, e: { r: rResIndex, c: 5 } });
  wsResumenRows.push({ hpt: 30 });
  rResIndex++;

  // Subtitle
  wsResumenData.push([{ v: `Período: ${activeWeek.startDateLabel} al ${activeWeek.endDateLabel} | Cálculo Automático`, t: 's' }]);
  wsResumenMerges.push({ s: { r: rResIndex, c: 0 }, e: { r: rResIndex, c: 5 } });
  wsResumenRows.push({ hpt: 18 });
  rResIndex++;

  // Blank row
  wsResumenData.push([]);
  wsResumenRows.push({ hpt: 12 });
  rResIndex++;

  // Column Headers
  wsResumenData.push([
    { v: "Nombre del Mozo", t: 's' },
    { v: "Total Vendido ($)", t: 's' },
    { v: "Propina Estimada", t: 's' },
    { v: "Aporte/Retención", t: 's' },
    { v: "Turnos Trabajados", t: 's' },
    { v: "Promedio Propina / Turno", t: 's' }
  ]);
  wsResumenRows.push({ hpt: 24 });
  rResIndex++;

  // Compile totals
  const waiterTotals = {};
  state.waiters.forEach(name => {
    waiterTotals[name] = { sales: 0, turns: 0 };
  });

  activeWeek.days.forEach(day => {
    day.shifts.AM.forEach(s => {
      if (waiterTotals[s.waiterName]) {
        waiterTotals[s.waiterName].sales += (Number(s.sales) || 0);
        if ((Number(s.sales) || 0) > 0) waiterTotals[s.waiterName].turns++;
      }
    });
    day.shifts.PM.forEach(s => {
      if (waiterTotals[s.waiterName]) {
        waiterTotals[s.waiterName].sales += (Number(s.sales) || 0);
        if ((Number(s.sales) || 0) > 0) waiterTotals[s.waiterName].turns++;
      }
    });
  });

  let sumSales = 0;
  let sumTip = 0;
  let sumRet = 0;
  let sumTurns = 0;

  state.waiters.forEach(name => {
    const data = waiterTotals[name];
    const tip = data.sales * (state.config.tipPercentage / 100);
    const ret = tip * (state.config.retentionPercentage / 100);
    const avg = data.turns > 0 ? (tip / data.turns) : 0;

    sumSales += data.sales;
    sumTip += tip;
    sumRet += ret;
    sumTurns += data.turns;

    wsResumenData.push([
      { v: name, t: 's' },
      { v: data.sales, t: 'n', z: currencyFormat },
      { v: tip, t: 'n', z: currencyFormat },
      { v: ret, t: 'n', z: currencyFormat },
      { v: data.turns, t: 'n' },
      { v: avg, t: 'n', z: currencyFormat }
    ]);
    wsResumenRows.push({ hpt: 18 });
    rResIndex++;
  });

  // Totals Row
  wsResumenData.push([
    { v: "TOTALES", t: 's' },
    { v: sumSales, t: 'n', z: currencyFormat },
    { v: sumTip, t: 'n', z: currencyFormat },
    { v: sumRet, t: 'n', z: currencyFormat },
    { v: sumTurns, t: 'n' },
    { v: sumTurns > 0 ? (sumTip / sumTurns) : 0, t: 'n', z: currencyFormat }
  ]);
  wsResumenRows.push({ hpt: 22 });
  rResIndex++;

  // Blank row
  wsResumenData.push([]);
  wsResumenRows.push({ hpt: 15 });
  rResIndex++;

  // KPI Section Header
  wsResumenData.push([{ v: "📊 INDICADORES CLAVE DE LA SEMANA", t: 's' }]);
  wsResumenMerges.push({ s: { r: rResIndex, c: 0 }, e: { r: rResIndex, c: 5 } });
  wsResumenRows.push({ hpt: 24 });
  rResIndex++;

  wsResumenData.push([{ v: "Total Propinas Generadas:", t: 's' }, { v: sumTip, t: 'n', z: currencyFormat }]);
  wsResumenRows.push({ hpt: 18 });
  rResIndex++;
  
  const numWaiters = state.waiters.length;
  wsResumenData.push([{ v: "Promedio Propina por Mozo:", t: 's' }, { v: numWaiters > 0 ? (sumTip / numWaiters) : 0, t: 'n', z: currencyFormat }]);
  wsResumenRows.push({ hpt: 18 });
  rResIndex++;

  wsResumenData.push([{ v: "Promedio Propina por Turno:", t: 's' }, { v: sumTurns > 0 ? (sumTip / sumTurns) : 0, t: 'n', z: currencyFormat }]);
  wsResumenRows.push({ hpt: 18 });
  rResIndex++;

  wsResumenData.push([{ v: "Total aprox Retenciones (Pozo):", t: 's' }, { v: sumRet, t: 'n', z: currencyFormat }]);
  wsResumenRows.push({ hpt: 18 });
  rResIndex++;

  // Blank row
  wsResumenData.push([]);
  wsResumenRows.push({ hpt: 15 });
  rResIndex++;

  // Pool Distribution Section Header
  wsResumenData.push([{ v: "💼 DISTRIBUCIÓN DEL POZO DE RETENCIONES", t: 's' }]);
  wsResumenMerges.push({ s: { r: rResIndex, c: 0 }, e: { r: rResIndex, c: 5 } });
  wsResumenRows.push({ hpt: 24 });
  rResIndex++;

  // Distribution Table Headers
  wsResumenData.push([
    { v: "Grupo", t: 's' },
    { v: "Importe Bruto", t: 's' },
    { v: "Adelantos", t: 's' },
    { v: "Importe Neto", t: 's' }
  ]);
  wsResumenRows.push({ hpt: 20 });
  rResIndex++;

  // Compile pool details
  let advCocina = 0, advCaja = 0, advEncargados = 0;
  if (activeWeek.otherAdvances) {
    activeWeek.otherAdvances.forEach(adv => {
      if (adv.role === 'Cocina') advCocina += adv.amount;
      if (adv.role === 'Caja') advCaja += adv.amount;
      if (adv.role === 'Encargados') advEncargados += adv.amount;
    });
  }

  const dist = calculatePoolDistribution(sumRet);
  const netCocina = Math.max(0, dist.groups.Cocina.amount - advCocina);
  const netCaja = Math.max(0, dist.groups.Caja.amount - advCaja);
  const netEncargados = Math.max(0, dist.groups.Encargados.amount - advEncargados);
  const totalNetRepartido = netCocina + netCaja + netEncargados;

  // Cocina
  wsResumenData.push([
    { v: `Cocina (Factor: ${dist.groups.Cocina.factor}, ${dist.groups.Cocina.people} pers, ${dist.groups.Cocina.percentage.toFixed(2)}%)`, t: 's' },
    { v: dist.groups.Cocina.amount, t: 'n', z: currencyFormat },
    { v: advCocina, t: 'n', z: currencyFormat },
    { v: netCocina, t: 'n', z: currencyFormat }
  ]);
  wsResumenRows.push({ hpt: 18 });
  rResIndex++;

  // Caja
  wsResumenData.push([
    { v: `Caja (Factor: ${dist.groups.Caja.factor}, ${dist.groups.Caja.people} pers, ${dist.groups.Caja.percentage.toFixed(2)}%)`, t: 's' },
    { v: dist.groups.Caja.amount, t: 'n', z: currencyFormat },
    { v: advCaja, t: 'n', z: currencyFormat },
    { v: netCaja, t: 'n', z: currencyFormat }
  ]);
  wsResumenRows.push({ hpt: 18 });
  rResIndex++;

  // Encargados
  wsResumenData.push([
    { v: `Encargados (Factor: ${dist.groups.Encargados.factor}, ${dist.groups.Encargados.people} pers, ${dist.groups.Encargados.percentage.toFixed(2)}%)`, t: 's' },
    { v: dist.groups.Encargados.amount, t: 'n', z: currencyFormat },
    { v: advEncargados, t: 'n', z: currencyFormat },
    { v: netEncargados, t: 'n', z: currencyFormat }
  ]);
  wsResumenRows.push({ hpt: 18 });
  rResIndex++;

  // Total Repartido row
  wsResumenData.push([
    { v: "TOTAL REPARTIDO:", t: 's' },
    { v: dist.groups.Cocina.amount + dist.groups.Caja.amount + dist.groups.Encargados.amount, t: 'n', z: currencyFormat },
    { v: advCocina + advCaja + advEncargados, t: 'n', z: currencyFormat },
    { v: totalNetRepartido, t: 'n', z: currencyFormat }
  ]);
  wsResumenRows.push({ hpt: 22 });
  rResIndex++;

  // Blank row
  wsResumenData.push([]);
  wsResumenRows.push({ hpt: 15 });
  rResIndex++;

  // Individual Staff Liquidation Section Header
  wsResumenData.push([{ v: "👤 LIQUIDACIÓN INDIVIDUAL NETA DEL PERSONAL DEL POZO", t: 's' }]);
  wsResumenMerges.push({ s: { r: rResIndex, c: 0 }, e: { r: rResIndex, c: 5 } });
  wsResumenRows.push({ hpt: 24 });
  rResIndex++;

  // Individual Liquidation Headers
  wsResumenData.push([
    { v: "Colaborador", t: 's' },
    { v: "Área / Rol", t: 's' },
    { v: "Importe Bruto", t: 's' },
    { v: "Adelantos Registrados", t: 's' },
    { v: "Neto a Percibir", t: 's' }
  ]);
  wsResumenRows.push({ hpt: 20 });
  rResIndex++;

  const staffLiquidations = calculateStaffLiquidations(activeWeek, dist);
  staffLiquidations.forEach(item => {
    wsResumenData.push([
      { v: item.name, t: 's' },
      { v: item.role, t: 's' },
      { v: item.gross, t: 'n', z: currencyFormat },
      { v: item.advances, t: 'n', z: currencyFormat },
      { v: item.net, t: 'n', z: currencyFormat }
    ]);
    wsResumenRows.push({ hpt: 18 });
    rResIndex++;
  });

  const wsResumen = XLSX.utils.aoa_to_sheet(wsResumenData);
  wsResumen['!cols'] = [
    { wch: 35 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 24 }
  ];
  wsResumen['!rows'] = wsResumenRows;
  wsResumen['!merges'] = wsResumenMerges;
  wsResumen['!views'] = [{ showGridLines: true }];

  XLSX.utils.book_append_sheet(wb, wsResumen, "RESUMEN");

  // Save Book
  XLSX.writeFile(wb, `Planilla_Propinas_Semana_${activeWeek.startDateLabel}_al_${activeWeek.endDateLabel}.xlsx`);
  showToast("Planilla Excel exportada correctamente");
}

// Window load trigger
window.addEventListener('load', () => {
  loadFromStorage();
  initTheme();

  renderWeeksList();
  renderStaffList();
  renderDailySheets();
  renderSummary();
  updateAdvanceStaffDropdown();

  // Bind new week form submission
  const newWeekForm = document.getElementById('new-week-form');
  if (newWeekForm) {
    newWeekForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('new-week-start-date');
      if (input && input.value) {
        const dateParts = input.value.split('-');
        const formattedDate = `${dateParts[2]}-${dateParts[1]}`;
        createWeek(formattedDate);
        input.value = '';
      }
    });
  }

  // Bind unified staff form
  const staffForm = document.getElementById('new-staff-form');
  if (staffForm) {
    staffForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('new-staff-name');
      const roleSelect = document.getElementById('new-staff-role');
      if (nameInput && roleSelect && nameInput.value) {
        addPoolStaff(nameInput.value, roleSelect.value);
        nameInput.value = '';
      }
    });
  }

  // Bind legacy waiter form if present
  const waiterForm = document.getElementById('new-waiter-form');
  if (waiterForm) {
    waiterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('new-waiter-name');
      if (input && input.value) {
        addWaiter(input.value);
        input.value = '';
      }
    });
  }

  // Bind pool advance form
  const poolForm = document.getElementById('pool-advance-form');
  if (poolForm) {
    poolForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const roleSelect = document.getElementById('pool-adv-role');
      const staffSelect = document.getElementById('pool-adv-staff-select');
      const amountInput = document.getElementById('pool-adv-amount');
      
      if (staffSelect && roleSelect && amountInput && staffSelect.value && amountInput.value) {
        addPoolAdvance(staffSelect.value, roleSelect.value, amountInput.value);
        amountInput.value = '';
      }
    });
  }

  // Initialize config inputs in settings
  document.getElementById('cfg-tip-perc').value = state.config.tipPercentage;
  document.getElementById('cfg-ret-perc').value = state.config.retentionPercentage;
  document.getElementById('cfg-dist-cocina').value = state.config.distCocina;
  document.getElementById('cfg-dist-caja').value = state.config.distCaja;
  document.getElementById('cfg-dist-encargados').value = state.config.distEncargados;
  document.getElementById('cfg-people-cocina').value = state.config.peopleCocina;
  document.getElementById('cfg-people-caja').value = state.config.peopleCaja;
  document.getElementById('cfg-people-encargados').value = state.config.peopleEncargados;
});
