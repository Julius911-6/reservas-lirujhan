// Enlaces de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCVKYWyf38Wa6t7unYKfasGBG3N39mq2gA",
    authDomain: "lirujhan-app.firebaseapp.com",
    projectId: "lirujhan-app",
    storageBucket: "lirujhan-app.firebasestorage.app",
    messagingSenderId: "747445110980",
    appId: "1:747445110980:web:69ce8410d0dbfe50f3e191",
    measurementId: "G-XHVY58GF5Z"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_PHONE = "59172406904";
const TOTAL_SEATS = 14;

const DAILY_SCHEDULES = [
    '06:30 am', '07:00 am', '14:00 pm', '15:00 pm', '16:00 pm', '17:30 pm', '18:00 pm'
];

const ROUTES_DATA = {
    'Pozo Cavado': [
        { name: 'Ramaditas', price: 20 },
        { name: 'Bella Vista', price: 25 },
        { name: 'Catavi K', price: 30 },
        { name: 'Tambillo', price: 35 },
        { name: 'Pista o Awaquiza', price: 40 },
        { name: 'Pozo Cavado', price: 40 }
    ],
    'Todo Santos': [
        { name: 'Ramaditas', price: 16 },
        { name: 'Vila Vila', price: 25 },
        { name: 'San Cristobal', price: 30 },
        { name: 'Culpina K', price: 35 },
        { name: 'Serena', price: 45 },
        { name: 'Vilama', price: 50 },
        { name: 'Agua de Castilla', price: 55 },
        { name: 'Cerro Gordo', price: 60 },
        { name: 'Mejillones', price: 70 },
        { name: 'Todo Santos', price: 80 }
    ]
};

let state = {
    schedules: [], 
    tickets: [],   
    selectedRoute: '',
    selectedScheduleId: '',
    selectedDestinationName: '',
    selectedDestinationPrice: 0,
    selectedSeats: [],
    isAdminLoggedIn: false,
    adminSelectedScheduleId: ''
};

const els = {
    navPassenger: document.getElementById('nav-passenger'),
    navAdmin: document.getElementById('nav-admin'),
    viewPassenger: document.getElementById('view-passenger'),
    viewAdminLogin: document.getElementById('view-admin-login'),
    viewAdminDashboard: document.getElementById('view-admin-dashboard'),
    
    pRoute: document.getElementById('p-route'),
    pSchedule: document.getElementById('p-schedule'),
    pDestination: document.getElementById('p-destination'),
    pSeatMapContainer: document.getElementById('p-seat-map-container'),
    seatGrid: document.getElementById('seat-grid'),
    pName: document.getElementById('p-name'),
    pCi: document.getElementById('p-ci'), 
    pPhone: document.getElementById('p-phone'), // NUEVO CAMPO CELULAR
    pTotal: document.getElementById('p-total'),
    pBtnReserve: document.getElementById('p-btn-reserve'),

    qrModal: document.getElementById('qr-modal'),
    qrTotal: document.getElementById('qr-total'),
    qrBtnConfirm: document.getElementById('qr-btn-confirm'),
    qrBtnCancel: document.getElementById('qr-btn-cancel'),

    aEmail: document.getElementById('a-email'),
    aPass: document.getElementById('a-pass'),
    btnLogin: document.getElementById('btn-login'),
    btnLogout: document.getElementById('btn-logout'),
    
    newRoute: document.getElementById('new-route'),
    newDatetime: document.getElementById('new-datetime'),
    btnCreateSchedule: document.getElementById('btn-create-schedule'),
    adminScheduleFilter: document.getElementById('admin-schedule-filter'),
    manifestBody: document.getElementById('manifest-body')
};

const modal = {
    el: document.getElementById('custom-modal'),
    content: document.getElementById('modal-content'),
    title: document.getElementById('modal-title'),
    msg: document.getElementById('modal-msg'),
    btnOk: document.getElementById('modal-btn-ok'),
    btnCancel: document.getElementById('modal-btn-cancel'),
    resolve: null,
    
    show(title, message, isConfirm = false) {
        return new Promise((resolve) => {
            this.title.textContent = title;
            this.msg.textContent = message;
            this.btnCancel.classList.toggle('hidden', !isConfirm);
            this.el.classList.remove('hidden');
            setTimeout(() => {
                this.content.classList.remove('scale-95', 'opacity-0');
                this.content.classList.add('scale-100', 'opacity-100');
            }, 10);
            
            this.resolve = resolve;
        });
    },
    hide() {
        this.content.classList.remove('scale-100', 'opacity-100');
        this.content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            this.el.classList.add('hidden');
        }, 200);
    }
};

modal.btnOk.addEventListener('click', () => { modal.hide(); if(modal.resolve) modal.resolve(true); });
modal.btnCancel.addEventListener('click', () => { modal.hide(); if(modal.resolve) modal.resolve(false); });

async function initApp() {
    try {
        await signInAnonymously(auth);
        setupRealtimeListeners();
        switchView('passenger');
    } catch (err) {
        console.error("Error:", err);
    }
}

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
    });
}

function switchView(viewName) {
    els.viewPassenger.classList.add('hidden');
    els.viewAdminLogin.classList.add('hidden');
    els.viewAdminDashboard.classList.add('hidden');
    
    if (viewName === 'passenger') els.viewPassenger.classList.remove('hidden');
    else if (viewName === 'admin') {
        if (state.isAdminLoggedIn) {
            els.viewAdminDashboard.classList.remove('hidden');
            updateScheduleDropdowns();
        } else {
            els.viewAdminLogin.classList.remove('hidden');
        }
    }
}

els.navPassenger.addEventListener('click', () => switchView('passenger'));
els.navAdmin.addEventListener('click', () => switchView('admin'));

els.pRoute.addEventListener('change', (e) => {
    state.selectedRoute = e.target.value;
    state.selectedScheduleId = '';
    state.selectedDestinationName = '';
    state.selectedSeats = [];
    updateScheduleDropdowns();
    updateDestinationDropdown();
    renderSeatMap();
    updateTotal();
    els.pSchedule.disabled = !state.selectedRoute;
    els.pDestination.disabled = !state.selectedRoute;
});

function updateScheduleDropdowns() {
    if (!state.selectedRoute) {
        els.pSchedule.innerHTML = '<option value="">Primero selecciona una ruta...</option>';
        return;
    }
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

    const ticketScheduleIds = [...new Set(state.tickets.map(t => t.scheduleId))];
    const aOptions = ticketScheduleIds.map(id => {
        let label = id.startsWith('FIJO_') ? `${id.split('_')[1]} - ${id.split('_')[2]} a las ${id.split('_')[3]}` : id;
        return `<option value="${id}">${label}</option>`;
    });

    state.schedules.forEach(s => {
        if (!ticketScheduleIds.includes(s.id)) aOptions.push(`<option value="${s.id}">${s.route} - ${formatDate(s.datetime)}</option>`);
    });

    els.adminScheduleFilter.innerHTML = '<option value="">Todos los horarios con reservas...</option>' + aOptions.join('');
    els.adminScheduleFilter.value = state.adminSelectedScheduleId;
}

function updateDestinationDropdown() {
    if (!state.selectedRoute) {
        els.pDestination.innerHTML = '<option value="">Primero selecciona una ruta...</option>';
        return;
    }
    const dests = ROUTES_DATA[state.selectedRoute];
    els.pDestination.innerHTML = '<option value="">Selecciona destino...</option>' + dests.map(d => `<option value="${d.name}" data-price="${d.price}">${d.name} (${d.price} Bs)</option>`).join('');
}

els.pSchedule.addEventListener('change', (e) => { state.selectedScheduleId = e.target.value; state.selectedSeats = []; renderSeatMap(); updateTotal(); });
els.pDestination.addEventListener('change', (e) => {
    state.selectedDestinationName = e.target.value;
    state.selectedDestinationPrice = e.target.options[e.target.selectedIndex].dataset.price ? parseInt(e.target.options[e.target.selectedIndex].dataset.price) : 0;
    renderSeatMap(); updateTotal();
});

function renderSeatMap() {
    if (!state.selectedScheduleId || !state.selectedDestinationName) { els.pSeatMapContainer.classList.add('hidden'); return; }
    els.pSeatMapContainer.classList.remove('hidden');

    let occupiedSeats = [];
    state.tickets.filter(t => t.scheduleId === state.selectedScheduleId).forEach(t => occupiedSeats.push(...t.seats));

    let html = '';
    for (let i = 1; i <= TOTAL_SEATS; i++) {
        const isOccupied = occupiedSeats.includes(i);
        const isSelected = state.selectedSeats.includes(i);
        html += `
            <label class="cursor-pointer flex flex-col items-center relative ${i === 1 ? 'col-start-2' : ''}">
                <input type="checkbox" class="sr-only seat-checkbox" value="${i}" ${isOccupied ? 'disabled' : ''} ${isSelected ? 'checked' : ''} onchange="toggleSeat(${i}, this.checked)">
                <div class="w-12 h-12 rounded-lg border-2 flex items-center justify-center font-bold text-lg transition-colors ${isOccupied ? 'seat-occupied' : 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100'}">${i}</div>
            </label>`;
    }
    els.seatGrid.innerHTML = html;
}

window.toggleSeat = function(seatNum, isChecked) {
    if (isChecked) {
        if (state.selectedSeats.length >= 5) { modal.show("Límite", "Máximo 5 asientos."); renderSeatMap(); return; }
        state.selectedSeats.push(seatNum);
    } else state.selectedSeats = state.selectedSeats.filter(s => s !== seatNum);
    updateTotal();
};

function updateTotal() { els.pTotal.textContent = `${state.selectedSeats.length * state.selectedDestinationPrice} Bs`; }

// PASO 1 PASAJERO: Mostrar Modal QR
els.pBtnReserve.addEventListener('click', () => {
    if (!state.selectedScheduleId || !state.selectedDestinationName || state.selectedSeats.length === 0 || !els.pName.value.trim() || !els.pCi.value.trim() || !els.pPhone.value.trim()) {
        return modal.show("Error", "Completa todos los datos, selecciona horario, destino, asientos y no olvides tu número de celular.");
    }
    els.qrTotal.textContent = `${state.selectedSeats.length * state.selectedDestinationPrice} Bs`;
    els.qrModal.classList.remove('hidden');
});

// PASO 2 PASAJERO: Ocultar Modal QR
els.qrBtnCancel.addEventListener('click', () => els.qrModal.classList.add('hidden'));

// PASO 3 PASAJERO: Confirmar y Mandar a WhatsApp
els.qrBtnConfirm.addEventListener('click', async () => {
    els.qrBtnConfirm.disabled = true;
    els.qrBtnConfirm.innerHTML = 'Procesando...';

    const name = els.pName.value.trim();
    const ci = els.pCi.value.trim();
    const phone = els.pPhone.value.trim();
    const total = state.selectedSeats.length * state.selectedDestinationPrice;

    try {
        const newTicket = {
            scheduleId: state.selectedScheduleId,
            passengerName: name,
            ci: ci, 
            phone: phone, // Guardamos el teléfono
            destination: state.selectedDestinationName,
            pricePerSeat: state.selectedDestinationPrice,
            seats: state.selectedSeats,
            total: total,
            status: 'Pendiente', // El estado inicial es pendiente
            createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'boletos'), newTicket);

        let dateTxt = "", routeTxt = state.selectedRoute;
        if (state.selectedScheduleId.startsWith('FIJO_')) {
            const parts = state.selectedScheduleId.split('_'); 
            routeTxt = parts[1]; dateTxt = `${parts[2]} a las ${parts[3]}`;
        } else {
            const info = state.schedules.find(s => s.id === state.selectedScheduleId);
            dateTxt = info ? formatDate(info.datetime) : "Horario Seleccionado";
            routeTxt = info ? info.route : state.selectedRoute;
        }

        const msg = `Hola Transporte LIRUJHAN! 🚌\nSoy *${name}*, acabo de reservar y pagar mediante QR.\n\n🪪 *CI:* ${ci}\n📍 *Ruta:* ${routeTxt}\n🏁 *Destino:* ${state.selectedDestinationName}\n🕒 *Fecha/Hora:* ${dateTxt}\n💺 *Asientos:* ${state.selectedSeats.join(", ")}\n💵 *Total Pagado:* ${total} Bs\n\n*Adjunto aquí mi comprobante de pago.*`;
        
        // Limpieza
        els.pName.value = ''; els.pCi.value = ''; els.pPhone.value = '';
        state.selectedSeats = []; els.pDestination.value = ''; els.pSchedule.value = ''; els.pRoute.value = '';
        els.pRoute.dispatchEvent(new Event('change'));
        els.qrModal.classList.add('hidden');
        
        await modal.show("Reserva Pendiente", "Se bloquearon tus asientos. Redirigiendo a WhatsApp para que envíes la foto del pago...");
        window.open(`https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');

    } catch (err) {
        modal.show("Error", "Ocurrió un error.");
    } finally {
        els.qrBtnConfirm.disabled = false;
        els.qrBtnConfirm.innerHTML = 'Ya pagué, enviar comprobante';
    }
});

// --- LÓGICA DEL ADMINISTRADOR ---
els.btnLogin.addEventListener('click', () => {
    if (els.aEmail.value.trim() === 'admin1@lirujhan.com' && els.aPass.value === 'lirujhan2026') {
        state.isAdminLoggedIn = true; els.aPass.value = ''; switchView('admin');
    } else modal.show("Acceso Denegado", "Contraseña incorrecta.");
});

els.btnLogout.addEventListener('click', () => { state.isAdminLoggedIn = false; switchView('passenger'); });

els.btnCreateSchedule.addEventListener('click', async () => {
    if (!els.newRoute.value || !els.newDatetime.value) return modal.show("Error", "Completa todo.");
    try {
        await addDoc(collection(db, 'horarios'), { route: els.newRoute.value, datetime: els.newDatetime.value, createdAt: new Date().toISOString() });
        els.newDatetime.value = ''; modal.show("Éxito", "Horario creado.");
    } catch (err) { modal.show("Error", "No se pudo crear."); }
});

els.adminScheduleFilter.addEventListener('change', (e) => { state.adminSelectedScheduleId = e.target.value; renderManifest(); });

function renderManifest() {
    if (!state.isAdminLoggedIn) return;
    if (!state.adminSelectedScheduleId) return els.manifestBody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">Seleccione un horario.</td></tr>';

    let fTickets = state.tickets.filter(t => t.scheduleId === state.adminSelectedScheduleId);
    if (fTickets.length === 0) return els.manifestBody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">No hay pasajeros aún.</td></tr>';

    let html = '';
    fTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(t => {
        const badge = t.status === 'Pagado' 
            ? '<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Aprobado</span>'
            : '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Pendiente QR</span>';

        html += `
            <tr class="hover:bg-gray-50 border-b border-gray-100">
                <td class="px-4 py-3 font-bold text-blue-600">${t.seats.join(', ')}</td>
                <td class="px-4 py-3"><div class="font-medium text-gray-800">${t.passengerName}</div><div class="text-xs text-gray-500">Telf: ${t.phone || 'N/A'}</div></td>
                <td class="px-4 py-3 text-gray-600">${t.ci || '-'}</td>
                <td class="px-4 py-3 text-gray-600">${t.destination}</td>
                <td class="px-4 py-3 font-bold text-gray-800">${t.total} Bs</td>
                <td class="px-4 py-3">${badge}</td>
                <td class="px-4 py-3 flex space-x-2">
                    ${t.status !== 'Pagado' ? `<button onclick="approveAndSendPDF('${t.id}')" class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition whitespace-nowrap">Aprobar y Enviar PDF</button>` : ''}
                    <button onclick="freeSeats('${t.id}')" class="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded transition">Eliminar</button>
                </td>
            </tr>`;
    });
    els.manifestBody.innerHTML = html;
}

// NUEVA FUNCIÓN ADMIN: Aprobar pago, generar PDF y abrir WhatsApp para enviarlo
window.approveAndSendPDF = async function(ticketId) {
    const confirmed = await modal.show("Aprobar Pago", "¿Confirmar pago y generar boleto PDF?", true);
    if (!confirmed) return;

    // Buscar la información completa del ticket
    const ticket = state.tickets.find(t => t.id === ticketId);
    if(!ticket) return;

    // 1. Cambiar estado en Base de Datos
    await updateDoc(doc(db, 'boletos', ticketId), { status: 'Pagado' });

    // 2. Extraer datos para el PDF
    let dateTxt = "", routeTxt = "";
    if (ticket.scheduleId.startsWith('FIJO_')) {
        const parts = ticket.scheduleId.split('_'); 
        routeTxt = parts[1];
        dateTxt = `${parts[2]} a las ${parts[3]}`;
    } else {
        const info = state.schedules.find(s => s.id === ticket.scheduleId);
        dateTxt = info ? formatDate(info.datetime) : "Horario Seleccionado";
        // Necesitamos inferir la ruta basándonos en los destinos (ya que el ticket original no guardó el string 'route')
        // Como solución rápida para el PDF, podemos buscar en ROUTES_DATA qué ruta contiene el destino:
        routeTxt = Object.keys(ROUTES_DATA).find(r => ROUTES_DATA[r].some(d => d.name === ticket.destination)) || "Ruta General";
    }

    // 3. Generar el PDF en la computadora del Administrador
    try {
        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF();

        docPDF.setFontSize(22);
        docPDF.setTextColor(234, 88, 12); 
        docPDF.text("TRANSPORTE LIRUJHAN", 105, 20, { align: "center" });

        docPDF.setFontSize(16);
        docPDF.setTextColor(0, 0, 0);
        docPDF.text("Boleto de Reserva", 105, 30, { align: "center" });

        docPDF.setFontSize(12);
        docPDF.text(`Pasajero: ${ticket.passengerName}`, 20, 50);
        docPDF.text(`Carnet de Identidad (CI): ${ticket.ci}`, 20, 60);
        docPDF.text(`Ruta: ${routeTxt}`, 20, 70);
        docPDF.text(`Destino Final: ${ticket.destination}`, 20, 80);
        docPDF.text(`Fecha y Hora: ${dateTxt}`, 20, 90);
        docPDF.text(`Asientos Seleccionados: ${ticket.seats.join(", ")}`, 20, 100);
        
        docPDF.setFontSize(14);
        docPDF.setFont(undefined, 'bold');
        docPDF.text(`Total Pagado: ${ticket.total} Bs`, 20, 115);

        docPDF.setFontSize(10);
        docPDF.setFont(undefined, 'normal');
        docPDF.setTextColor(80, 80, 80); 
        
        docPDF.text("Dirección ofi. Uyuni: Litoral entre Avaroa-Ayacucho frente a la pasarela", 105, 128, { align: "center" });
        docPDF.text("Cel. 74231416 o 72406904", 105, 134, { align: "center" });

        docPDF.text("Dirección Ofi. Pozo Cavado: Calle Cochabamba entre calle Potosí", 105, 142, { align: "center" });
        docPDF.text("Cel. 72406922 o 72406904", 105, 148, { align: "center" });

        docPDF.setTextColor(130, 130, 130);
        docPDF.text("Este documento es su comprobante de pago.", 105, 160, { align: "center" });
        docPDF.text("Por favor preséntelo al abordar.", 105, 166, { align: "center" });

        // Descarga el PDF a la computadora del Admin
        docPDF.save(`Boleto_${ticket.passengerName.replace(/\s+/g, '_')}.pdf`);
    } catch(e) {
        console.error("Error PDF:", e);
    }

    // 4. Abrir WhatsApp hacia el cliente para mandarle el PDF
    if(ticket.phone) {
        const adminMsg = `¡Hola ${ticket.passengerName}! 👋 \nConfirmamos la recepción de tu pago.\n\nAquí tienes adjunto tu *Boleto Oficial en PDF* 📄.\n¡Gracias por viajar con Transporte LIRUJHAN! 🚌`;
        // Enlace directo al WhatsApp del pasajero (asumiendo que el número es de Bolivia 591)
        const countryCode = ticket.phone.startsWith('591') ? '' : '591';
        window.open(`https://wa.me/${countryCode}${ticket.phone}?text=${encodeURIComponent(adminMsg)}`, '_blank');
    } else {
        alert("El PDF se descargó, pero este pasajero no registró su celular para abrir WhatsApp directamente.");
    }
};

window.freeSeats = async function(ticketId) {
    const confirmed = await modal.show("Precaución", "¿Eliminar esta reserva y liberar asientos?", true);
    if (!confirmed) return;
    await deleteDoc(doc(db, 'boletos', ticketId));
};

function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', ' -');
}

window.addEventListener('DOMContentLoaded', initApp);
