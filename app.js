function setupRealtimeListeners() {
    onSnapshot(collection(db, 'horarios'), (snapshot) => {
        state.schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        updateScheduleDropdowns();
    });

    onSnapshot(collection(db, 'boletos'), (snapshot) => {
        state.tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSeatMap();
        renderManifest();
        // NUEVO: Esto fuerza a que el desplegable del admin se actualice en tiempo real
        updateScheduleDropdowns(); 
    });
}

function updateScheduleDropdowns() {
    // --- 1. LÓGICA DEL DESPLEGABLE PASAJERO ---
    if (!state.selectedRoute) {
        els.pSchedule.innerHTML = '<option value="">Primero selecciona una ruta...</option>';
    } else {
        const todayStr = new Date().toISOString().split('T')[0];
        const fixedOptions = DAILY_SCHEDULES.map(time => {
            return `<option value="FIJO_${state.selectedRoute}_${todayStr}_${time}">${time} (Hoy)</option>`;
        });

        const now = new Date();
        const adminOptions = state.schedules
            .filter(s => s.route === state.selectedRoute && new Date(s.datetime) >= now)
            .map(s => `<option value="${s.id}">${formatDate(s.datetime)} (Extra)</option>`);
        
        els.pSchedule.innerHTML = '<option value="">Selecciona un horario...</option>' + fixedOptions.join('') + adminOptions.join('');
        els.pSchedule.value = state.selectedScheduleId;
    }

    // --- 2. LÓGICA DEL DESPLEGABLE ADMINISTRADOR ---
    // Esto ahora se ejecuta siempre, asegurando que el CRM funcione independiente del pasajero
    const ticketScheduleIds = [...new Set(state.tickets.map(t => t.scheduleId))];
    
    // Primero añadimos los horarios que ya tienen reservas
    const aOptions = ticketScheduleIds.map(id => {
        let label = id;
        if (id.startsWith('FIJO_')) {
            const parts = id.split('_'); 
            label = `${parts[1]} - ${parts[2]} a las ${parts[3]}`;
        } else {
            const s = state.schedules.find(x => x.id === id);
            if(s) label = `${s.route} - ${formatDate(s.datetime)}`;
        }
        return `<option value="${id}">🔵 ${label} (Con reservas)</option>`;
    });

    // Luego añadimos los horarios fijos de HOY para que puedas ver minibuses vacíos
    const todayStr = new Date().toISOString().split('T')[0];
    Object.keys(ROUTES_DATA).forEach(route => {
        DAILY_SCHEDULES.forEach(time => {
            const fixedId = `FIJO_${route}_${todayStr}_${time}`;
            if (!ticketScheduleIds.includes(fixedId)) {
                aOptions.push(`<option value="${fixedId}">⚪ ${route} - Hoy a las ${time} (Vacío)</option>`);
            }
        });
    });

    // Finalmente, añadimos horarios extra creados que aún no tienen reservas
    state.schedules.forEach(s => {
        if (!ticketScheduleIds.includes(s.id)) {
            aOptions.push(`<option value="${s.id}">⚪ ${s.route} - ${formatDate(s.datetime)} (Extra - Vacío)</option>`);
        }
    });

    els.adminScheduleFilter.innerHTML = '<option value="">Seleccione un horario para ver pasajeros...</option>' + aOptions.join('');
    els.adminScheduleFilter.value = state.adminSelectedScheduleId;
}
