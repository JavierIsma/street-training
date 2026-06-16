import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  auth,
  db,
  signOut,
  collection,
  getDocs,
  doc,
  getDoc, // <--- ASEGURATE DE QUE ESTA LÍNEA ESTÉ INCLUIDA
  updateDoc
} from './firebase.js';'./firebase.js';

// Referencias al DOM de las vistas
const seccionAlumnas = document.getElementById('seccion-alumnas');
const seccionPracticas = document.getElementById('seccion-practicas');
const alumnasGrid = document.getElementById('alumnasGrid');
const nombreAlumnaTitulo = document.getElementById('nombreAlumnaTitulo');
const teacherPracticeList = document.getElementById('teacherPracticeList');
const btnVolverAlumnas = document.getElementById('btnVolverAlumnas');
const logoutBtn = document.getElementById('logoutBtn');
const bloqueMetasIniciales = document.getElementById('bloqueMetasIniciales');
const alumnaMetasInicialesField = document.getElementById('alumnaMetasInicialesField');

// REFERENCIAS DOM PARA GESTIÓN DE OBJETIVOS CON SOPORTE MENSUAL
const newGoalInput = document.getElementById('newGoalInput');
const goalMonthSelect = document.getElementById('goalMonthSelect');
const filterGoalMonth = document.getElementById('filterGoalMonth');
const addGoalBtn = document.getElementById('addGoalBtn');
const teacherGoalsList = document.getElementById('teacherGoalsList');

// Variables de estado local para la navegación interna
let cacheAlumnas = {}; 
let alumnaSeleccionadaId = null;
let nombreAlumnaSeleccionada = "";
let metasAlumnaSeleccionada = []; // Guarda las metas de la alumna en memoria
let myChart = null; 

/**
 * UTILERÍA: Genera strings de formato de mes (YYYY-MM) y nombres legibles
 */
/**
 * UTILERÍA: Genera strings de formato de mes (YYYY-MM) y nombres legibles
 */
/**
 * UTILERÍA: Genera strings de formato de mes (YYYY-MM) de forma segura sin desbordamientos de días
 */
function obtenerMesActualString(offset = 0) {
  const d = new Date();
  d.setDate(1); // 💡 CRUCIAL: Evita desbordamientos si el mes actual tiene 31 días
  d.setMonth(d.getMonth() + offset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
function traducirMesLegible(mesString) {
  if (!mesString) return "";
  const [year, month] = mesString.split('-');
  const fecha = new Date(year, parseInt(month) - 1, 1);
  return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
}

/**
 * Inicializa las opciones de meses en los selectores del formulario
 */
function inicializarSelectoresFecha() {
  if (!goalMonthSelect) return;
  goalMonthSelect.innerHTML = '';
  
  // Generamos opciones desde el mes actual (i = 0) hasta 5 meses hacia adelante
  for (let i = 0; i < 6; i++) {
    const valorMes = obtenerMesActualString(i);
    const textoMes = traducirMesLegible(valorMes);
    goalMonthSelect.innerHTML += `<option value="${valorMes}">${textoMes}</option>`;
  }
}

/**
 * FUNCIÓN AUXILIAR: Transforma un Timestamp de Firebase en una fecha legible en español
 */
function formatearFecha(timestamp) {
  if (!timestamp) return null;
  const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return fecha.toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' hs';
}

/**
 * 1. CARGA LA CUADRÍCULA DE ALUMNAS DISPONIBLES
 */
async function loadStudentsDashboard() {
  alumnasGrid.innerHTML = '<p style="color: #aaa; font-style: italic;">Cargando alumnas...</p>';
  inicializarSelectoresFecha();

  try {
    const [practicesSnapshot, studentsSnapshot] = await Promise.all([
      getDocs(collection(db, "practices")),
      getDocs(collection(db, "students"))
    ]);

    cacheAlumnas = {};
    studentsSnapshot.forEach(docSnap => {
      cacheAlumnas[docSnap.id] = docSnap.data();
    });

    const alumnasConPracticas = new Set();
    practicesSnapshot.forEach(docItem => {
      const data = docItem.data();
      if (data.userId) {
        alumnasConPracticas.add(data.userId);
      }
    });

    alumnasGrid.innerHTML = '';

    if (studentsSnapshot.empty) {
      alumnasGrid.innerHTML = '<p style="color: #888;">No hay alumnas registradas en la base de datos.</p>';
      return;
    }

    studentsSnapshot.forEach((docSnap) => {
      const studentId = docSnap.id;
      const student = docSnap.data();
      const nombreCompleto = student.name || "Alumna Desconocida";
      const tienePendientes = alumnasConPracticas.has(studentId);

      alumnasGrid.innerHTML += `
        <div class="alumna-card" 
             style="background: #1a1a1a; border: 1px solid #333; padding: 20px; border-radius: 8px; text-align: center; cursor: pointer; transition: transform 0.2s, border-color 0.2s;"
             data-id="${studentId}"
             data-nombre="${nombreCompleto}">
          
          <div style="width: 55px; height: 55px; background: #4caf50; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 1.4rem; font-weight: bold;">
            ${nombreCompleto.charAt(0).toUpperCase()}
          </div>
          
          <h3 style="color: #ffffff; margin: 0 0 8px 0; font-size: 1.15rem;">${nombreCompleto}</h3>
          <p style="color: #888; font-size: 0.85rem; margin: 0 0 15px 0; font-style: italic;">
            ${tienePendientes ? 'Posee prácticas registradas' : 'Sin prácticas aún'}
          </p>
          
          <button class="btn" style="background: #4caf50; color: white; border: none; padding: 8px 12px; border-radius: 4px; font-weight: bold; width: 100%; cursor: pointer;">
            Ver Historial
          </button>
        </div>
      `;
    });

    document.querySelectorAll('.alumna-card').forEach(card => {
      card.addEventListener('click', () => {
        const studentId = card.dataset.id;
        const studentNombre = card.dataset.nombre;
        verPracticasDeAlumna(studentId, studentNombre);
      });
    });

  } catch (error) {
    console.error("Error al estructurar panel de alumnas:", error);
    alumnasGrid.innerHTML = '<p style="color: #ef4444;">Error al cargar las alumnas.</p>';
  }
}

/**
 * 2. FILTRA Y CARGA LAS PRÁCTICAS, FECHAS Y DISPARA EL GRÁFICO Y LOS OBJETIVOS
 */
async function verPracticasDeAlumna(studentId, studentNombre) {
  alumnaSeleccionadaId = studentId;
  nombreAlumnaSeleccionada = studentNombre;

  seccionAlumnas.style.display = "none";
  seccionPracticas.style.display = "block";
  nombreAlumnaTitulo.innerHTML = `Prácticas de <span style="color: #ffffff;">${studentNombre}</span>`;
  
  teacherPracticeList.innerHTML = '<p style="color: #aaa; font-style: italic;">Buscando prácticas...</p>';

  // Variable para guardar los datos reales del documento de Firebase
  let datosRealesAlumno = null;

  // --- INTEGRACIÓN DE PERFIL DOCENTE Y METAS DE REGISTRO ---
  const profileCard = document.getElementById('alumnaProfileCard');
  const avatarImg = document.getElementById('alumnaAvatar');
  const nameField = document.getElementById('alumnaNameField');
  const ageField = document.getElementById('alumnaAgeField');
  const expField = document.getElementById('alumnaExpField');
  const stylesContainer = document.getElementById('alumnaStylesContainer');
  const bloqueMetas = document.getElementById('bloqueMetasIniciales');
  const metasField = document.getElementById('alumnaMetasInicialesField');

  try {
    if (profileCard) profileCard.style.display = "none"; // Reset visual
    
    // CORRECCIÓN 1: Apuntamos a "students" que es donde tu register.js guarda la info
    const studentDoc = await getDoc(doc(db, "students", studentId));
    
    if (studentDoc.exists()) {
      datosRealesAlumno = studentDoc.data();
      console.log("Datos reales de la alumna recuperados de Firebase:", datosRealesAlumno);
      
      if (nameField) nameField.innerText = datosRealesAlumno.name || studentNombre;
      if (ageField) ageField.innerText = datosRealesAlumno.age ? `${datosRealesAlumno.age} años` : "-- años";
      if (expField) expField.innerText = datosRealesAlumno.experience ? `${datosRealesAlumno.experience} años` : "--";
      if (avatarImg) avatarImg.src = datosRealesAlumno.avatarUrl || "assets/default-avatar.png";

      // Renderizado de las cápsulas de danza
      if (stylesContainer) {
        stylesContainer.innerHTML = "";
        if (datosRealesAlumno.styles && datosRealesAlumno.styles.length > 0) {
          datosRealesAlumno.styles.forEach(style => {
            const badge = document.createElement('span');
            badge.className = 'style-badge';
            badge.innerText = style;
            stylesContainer.appendChild(badge);
          });
        } else {
          stylesContainer.innerHTML = `<span style="color: #666; font-style: italic; font-size: 0.85rem;">Ningún estilo cargado</span>`;
        }
      }

      // Inyección de metas iniciales en la ficha superior
      if (bloqueMetas && metasField) {
        // CORRECCIÓN 2: Usamos únicamente '.goals' que es tu clave real en Firestore
        const metasReg = datosRealesAlumno.goals || "";
        if (metasReg.trim() !== "") {
          metasField.innerText = `"${metasReg}"`;
          bloqueMetas.style.display = "block";
        } else {
          metasField.innerText = '"No se registraron objetivos iniciales."';
          bloqueMetas.style.display = "block";
        }
      }

      if (profileCard) profileCard.style.display = "block";
    } else {
      console.warn(`No se encontró el documento en la colección 'students' para el ID: ${studentId}`);
    }
  } catch (err) {
    console.error("Error al procesar el perfil dinámico docente:", err);
  }
  // --- FIN INTEGRACIÓN PERFIL ---

  try {
    const student = cacheAlumnas[studentId] || { name: studentNombre, goals: "No definidos aún", monthlyGoals: [] };
    
    // Traer las metas estructuradas
    metasAlumnaSeleccionada = student.monthlyGoals || [];
    
    // Poblar el filtro selector de visualización en base a lo que tenga la alumna, incluyendo el mes en curso
    poblarSelectorFiltroMeses();
    renderizarMetasProfesor();

    const practicesSnapshot = await getDocs(collection(db, "practices"));
    const listadoFiltrado = [];

    practicesSnapshot.forEach((docItem) => {
      const data = docItem.data();
      if (data.userId === studentId) {
        const segundosFecha = data.createdAt && data.createdAt.seconds ? data.createdAt.seconds : 0;
        listadoFiltrado.push({
          docId: docItem.id,
          ...data,
          createdAtSeconds: segundosFecha
        });
      }
    });

    listadoFiltrado.sort((a, b) => a.createdAtSeconds - b.createdAtSeconds);
    renderChartProfesor(listadoFiltrado);

    if (listadoFiltrado.length === 0) {
      teacherPracticeList.innerHTML = '<p style="color: #888; font-style: italic; padding: 15px;">Esta alumna no tiene ninguna práctica subida todavía.</p>';
      return;
    }

    let htmlAcumulado = '';

    listadoFiltrado.forEach((practice, index) => {
      const numeroPractica = index + 1;
      const practiceId = practice.docId;

      const fechaEnvioTexto = formatearFecha(practice.createdAt) || 'Fecha no registrada';
      const fechaCorreccionTexto = formatearFecha(practice.feedbackUpdatedAt);

      const hasFeedback = practice.teacherComment !== undefined && practice.teacherComment !== "";
      const buttonText = hasFeedback ? `Actualizar devolución de Práctica #${numeroPractica}` : `Guardar devolución de Práctica #${numeroPractica}`;
      const badgeHTML = hasFeedback 
        ? `<span class="badge-status" style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; float: right;">Corregido</span>` 
        : `<span class="badge-status" style="background: #ff9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; float: right;">Pendiente</span>`;

      const infoFechaCorreccionHTML = hasFeedback && fechaCorreccionTexto
        ? `<p style="color: #4caf50; font-size: 0.85rem; margin-top: -10px; margin-bottom: 15px;">📅 <strong>Corregido el:</strong> ${fechaCorreccionTexto}</p>`
        : '';

      // CORRECCIÓN 3: Vinculamos los objetivos globales de cada práctica con el campo real
      const objetivosGlobales = datosRealesAlumno 
        ? (datosRealesAlumno.goals || "No definidos aún") 
        : (student.goals || "No definidos aún");

      htmlAcumulado += `
        <div class="practice-item" style="position: relative; margin-bottom: 25px; border: 1px solid #333; padding: 20px; border-radius: 8px; background: #1a1a1a;">
          ${badgeHTML}
          <h3 style="margin-top: 0; color: #4caf50; margin-bottom: 5px;">${student.name} — <span style="color: #ffffff;">Práctica #${numeroPractica}</span></h3>
          
          <p style="color: #888; font-size: 0.85rem; margin-top: 0; margin-bottom: 15px;">📅 <strong>Enviado el:</strong> ${fechaEnvioTexto}</p>
          
          <p style="margin-top: 10px;"><strong>Objetivos globales de la alumna:</strong> ${objetivosGlobales}</p>
          <p>
            <strong>Video:</strong>
            <a href="${practice.videoLink}" target="_blank" style="color: #4caf50; font-weight: bold;">Ver práctica</a>
          </p>
          <p>
            <strong>Notas alumna:</strong> ${practice.notes || 'Sin notas'}
          </p>

          <hr style="border-color: #333; margin: 15px 0;">
          
          <h4>Tu Devolución:</h4>
          
          ${infoFechaCorreccionHTML}

          <label>Precisión</label>
          <input type="number" min="1" max="10" id="precision-${practiceId}" value="${practice.precision || ''}">

          <label>Definición</label>
          <input type="number" min="1" max="10" id="definition-${practiceId}" value="${practice.definition || ''}">

          <label>Fluidez</label>
          <input type="number" min="1" max="10" id="fluidity-${practiceId}" value="${practice.fluidity || ''}">

          <label>Actitud</label>
          <input type="number" min="1" max="10" id="attitude-${practiceId}" value="${practice.attitude || ''}">

          <label>Comentarios</label>
          <textarea id="comment-${practiceId}" placeholder="Devolución...">${practice.teacherComment || ''}</textarea>

          <label>Timestamps del video</label>
          <textarea id="timestamps-${practiceId}" placeholder="Ej: 0:45 corregir postura de brazos">${practice.timestamps || ''}</textarea>

          <label>Link video devolución Drive</label>
          <input type="text" id="videoFeedback-${practiceId}" placeholder="Link de Drive" value="${practice.teacherVideoFeedback || ''}">

          <button class="btn saveFeedbackBtn ${hasFeedback ? 'edit-mode' : ''}" data-id="${practiceId}" style="margin-top: 10px; width: 100%; cursor: pointer;">
            ${buttonText}
          </button>
        </div>
      `;
    });

    teacherPracticeList.innerHTML = htmlAcumulado;
    addFeedbackEvents();

  } catch (error) {
    console.error("Error al procesar las prácticas de la alumna:", error);
    teacherPracticeList.innerHTML = '<p style="color: #ef4444;">Error al cargar las prácticas.</p>';
  }
}

/**
 * GESTIÓN DE FILTROS TEMPORALES
 */
function poblarSelectorFiltroMeses() {
  if (!filterGoalMonth) return;
  
  const mesesSet = new Set();
  
  // Generamos un rango base de meses visibles (3 meses atrás y 3 meses al futuro)
  for (let i = -3; i <= 3; i++) {
    mesesSet.add(obtenerMesActualString(i));
  }
  
  // Añadimos también cualquier mes histórico que tenga la alumna guardado
  metasAlumnaSeleccionada.forEach(m => {
    if (m.month) mesesSet.add(m.month);
  });

  // Convertimos a array y ordenamos cronológicamente de más reciente a más viejo
  const mesesOrdenados = Array.from(mesesSet).sort().reverse();
  const valorSeleccionadoPrevio = filterGoalMonth.value;

  filterGoalMonth.innerHTML = '';
  mesesOrdenados.forEach(m => {
    filterGoalMonth.innerHTML += `<option value="${m}">${traducirMesLegible(m)}</option>`;
  });

  if (mesesOrdenados.includes(valorSeleccionadoPrevio)) {
    filterGoalMonth.value = valorSeleccionadoPrevio;
  } else {
    filterGoalMonth.value = obtenerMesActualString(0); // Mes actual por defecto
  }
}

// Escuchar cambios en el filtro de visualización del mes de las metas
filterGoalMonth.addEventListener('change', () => {
  renderizarMetasProfesor();
});

/**
 * RENDERIZA LA LISTA DE OBJETIVOS FILTRADA POR EL MES SELECCIONADO
 */
function renderizarMetasProfesor() {
  if (!teacherGoalsList) return;
  teacherGoalsList.innerHTML = '';

  const mesAFiltrar = filterGoalMonth.value;
  
  // Filtramos la lista para renderizar solo las de ese mes
  const metasFiltradas = metasAlumnaSeleccionada.filter(m => (m.month || obtenerMesActualString(0)) === mesAFiltrar);

  if (metasFiltradas.length === 0) {
    teacherGoalsList.innerHTML = `<p style="color: #666; font-style: italic; font-size: 0.9rem; padding: 5px;">No hay objetivos mensuales asignados para este mes.</p>`;
    return;
  }

  metasAlumnaSeleccionada.forEach((meta, index) => {
    // Si la meta actual en el recorrido no pertenece al mes del filtro, la saltamos del render
    const mesMeta = meta.month || obtenerMesActualString(0);
    if (mesMeta !== mesAFiltrar) return;

    const itemMeta = document.createElement('div');
    itemMeta.style.cssText = `display: flex; align-items: center; justify-content: space-between; background: #1a1a1a; padding: 10px 14px; border-radius: 8px; border: 1px solid #2a2a2a; gap: 15px; flex-wrap: wrap;`;
    
    // Calculamos el mes alternativo al que se podría reasignar dinámicamente (Mes Siguiente)
    const [y, m] = mesMeta.split('-');
    const fechaSig = new Date(y, parseInt(m), 1);
    const siguienteMesString = `${fechaSig.getFullYear()}-${String(fechaSig.getMonth() + 1).padStart(2, '0')}`;
    const nombreSiguienteMes = fechaSig.toLocaleString('es-AR', { month: 'short' });

    itemMeta.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 250px;">
        <span style="width: 10px; height: 10px; border-radius: 50%; background: ${meta.completed ? '#10b981' : '#ff9800'}; display: inline-block;"></span>
        <span style="color: ${meta.completed ? '#666' : '#e0e0e0'}; ${meta.completed ? 'text-decoration: line-through;' : ''} font-size: 0.95rem;">
          ${meta.text} ${meta.completed ? '<b style="color: #10b981; font-size: 0.8rem; margin-left: 5px;">(Completado)</b>' : ''}
        </span>
      </div>
      
      <div style="display: flex; align-items: center; gap: 10px;">
        ${!meta.completed ? `
          <button class="btn-reassign-goal" data-index="${index}" data-target="${siguienteMesString}" style="background: rgba(139, 92, 246, 0.1); border: 1px solid #8b5cf6; color: #a78bfa; cursor: pointer; font-size: 0.8rem; padding: 5px 10px; border-radius: 6px; transition: 0.2s;">
            ➡️ Pasar a ${nombreSiguienteMes}
          </button>
        ` : ''}
        
        <button class="btn-delete-goal" data-index="${index}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 0.9rem; padding: 4px 8px; font-weight: bold;">
          ❌ Borrar
        </button>
      </div>
    `;

    // Evento para Reasignar objetivo a otro período
    if (!meta.completed) {
      itemMeta.querySelector('.btn-reassign-goal').addEventListener('click', async (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        const destinoMes = e.currentTarget.dataset.target;
        
        // Modificamos el campo 'month' del objetivo en el array en memoria
        metasAlumnaSeleccionada[idx].month = destinoMes;
        
        try {
          const studentRef = doc(db, "students", alumnaSeleccionadaId);
          await updateDoc(studentRef, { monthlyGoals: metasAlumnaSeleccionada });
          
          if (cacheAlumnas[alumnaSeleccionadaId]) {
            cacheAlumnas[alumnaSeleccionadaId].monthlyGoals = metasAlumnaSeleccionada;
          }
          
          alert(`Objetivo movido con éxito a ${traducirMesLegible(destinoMes)}`);
          poblarSelectorFiltroMeses();
          renderizarMetasProfesor();
        } catch (error) {
          console.error(error);
        }
      });
    }

    // Evento para eliminar un objetivo específico
    itemMeta.querySelector('.btn-delete-goal').addEventListener('click', async (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      metasAlumnaSeleccionada.splice(idx, 1);
      
      try {
        const studentRef = doc(db, "students", alumnaSeleccionadaId);
        await updateDoc(studentRef, { monthlyGoals: metasAlumnaSeleccionada });
        
        if (cacheAlumnas[alumnaSeleccionadaId]) {
          cacheAlumnas[alumnaSeleccionadaId].monthlyGoals = metasAlumnaSeleccionada;
        }

        poblarSelectorFiltroMeses();
        renderizarMetasProfesor();
      } catch (error) {
        console.error("Error al borrar objetivo:", error);
      }
    });

    teacherGoalsList.appendChild(itemMeta);
  });
}

/**
 * ESCUCHADOR DEL BOTÓN "ASIGNAR" CON SELECCIÓN DE MES
 */
addGoalBtn.addEventListener('click', async () => {
  if (!alumnaSeleccionadaId) return;

  const textoMeta = newGoalInput.value.trim();
  const mesSeleccionado = goalMonthSelect.value;
  if (textoMeta === "") return;

  const nuevoObjetivo = {
    text: textoMeta,
    completed: false,
    month: mesSeleccionado, // Guardamos dinámicamente a qué mes corresponde
    createdAt: new Date()
  };

  metasAlumnaSeleccionada.push(nuevoObjetivo);

  try {
    const studentRef = doc(db, "students", alumnaSeleccionadaId);
    await updateDoc(studentRef, { monthlyGoals: metasAlumnaSeleccionada });

    if (cacheAlumnas[alumnaSeleccionadaId]) {
      cacheAlumnas[alumnaSeleccionadaId].monthlyGoals = metasAlumnaSeleccionada;
    }

    newGoalInput.value = "";
    
    // Cambiamos el visor al mes donde acabas de agregar el objetivo para verificarlo
    poblarSelectorFiltroMeses();
    filterGoalMonth.value = mesSeleccionado;
    
    renderizarMetasProfesor();
  } catch (error) {
    console.error("Error al guardar el nuevo objetivo:", error);
  }
});

/**
 * 3. MOTOR DEL GRÁFICO DE RENDIMIENTO
 */
function renderChartProfesor(practices) {
  const ctx = document.getElementById('practiceChartProfesor').getContext('2d');

  if (myChart) {
    myChart.destroy();
  }

  const labels = practices.map((_, index) => `Práctica #${index + 1}`);
  const precisionData = practices.map(p => p.precision ? Number(p.precision) : null);
  const definitionData = practices.map(p => p.definition ? Number(p.definition) : null);
  const fluidityData = practices.map(p => p.fluidity ? Number(p.fluidity) : null);
  const attitudeData = practices.map(p => p.attitude ? Number(p.attitude) : null);

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Precisión', data: precisionData, borderColor: '#4caf50', backgroundColor: 'rgba(76, 175, 80, 0.1)', tension: 0.3, spanGaps: true },
        { label: 'Definición', data: definitionData, borderColor: '#2196f3', backgroundColor: 'rgba(33, 150, 243, 0.1)', tension: 0.3, spanGaps: true },
        { label: 'Fluidez', data: fluidityData, borderColor: '#ff9800', backgroundColor: 'rgba(255, 152, 0, 0.1)', tension: 0.3, spanGaps: true },
        { label: 'Actitud', data: attitudeData, borderColor: '#e91e63', backgroundColor: 'rgba(233, 30, 99, 0.1)', tension: 0.3, spanGaps: true }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 1, max: 10, grid: { color: '#2a2a2a' }, ticks: { color: '#aaa' } },
        x: { grid: { color: '#2a2a2a' }, ticks: { color: '#aaa' } }
      },
      plugins: {
        legend: { labels: { color: '#fff' } }
      }
    }
  });
}

/**
 * 4. CONTROLADOR DE GUARDADO Y ACTUALIZACIÓN EN FIRESTORE
 */
function addFeedbackEvents() {
  const buttons = document.querySelectorAll('.saveFeedbackBtn');

  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const practiceId = button.dataset.id;

      const precision = document.getElementById(`precision-${practiceId}`).value;
      const definition = document.getElementById(`definition-${practiceId}`).value;
      const fluidity = document.getElementById(`fluidity-${practiceId}`).value;
      const attitude = document.getElementById(`attitude-${practiceId}`).value;
      const comment = document.getElementById(`comment-${practiceId}`).value;
      const timestamps = document.getElementById(`timestamps-${practiceId}`).value;
      const videoFeedback = document.getElementById(`videoFeedback-${practiceId}`).value;

      try {
        button.innerText = "Guardando...";
        button.disabled = true;

        await updateDoc(doc(db, "practices", practiceId), {
          precision: precision,
          definition: definition,
          fluidity: fluidity,
          attitude: attitude,
          teacherComment: comment,
          timestamps: timestamps,
          teacherVideoFeedback: videoFeedback,
          feedbackUpdatedAt: new Date(), 
          unreadByStudent: true 
        });

        alert('Devolución guardada con éxito');
        verPracticasDeAlumna(alumnaSeleccionadaId, nombreAlumnaSeleccionada);

      } catch (error) {
        console.error(error);
        alert('Error al guardar');
        button.disabled = false;
      }
    });
  });
}

/**
 * 5. BOTÓN VOLVER AL LISTADO PRINCIPAL
 */
btnVolverAlumnas.addEventListener('click', () => {
  seccionPracticas.style.display = "none";
  seccionAlumnas.style.display = "block";
  teacherPracticeList.innerHTML = '';
  alumnaSeleccionadaId = null;
  loadStudentsDashboard();
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const teacherEmail = "javierisma.sanchez@gmail.com";

  if (user.email !== teacherEmail) {
    alert('No tenés permisos para entrar acá');
    window.location.href = 'dashboard.html';
    return;
  }

  loadStudentsDashboard();
});