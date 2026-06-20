import {
  auth,
  db,
  signOut,
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc 
} from './firebase.js';

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// ELEMENTOS DEL DOM
const profileData = document.getElementById('profileData');
const logoutBtn = document.getElementById('logoutBtn');
const practiceForm = document.getElementById('practiceForm');
const practiceList = document.getElementById('practiceList');
const statsContainer = document.getElementById('statsContainer');
const avatarInput = document.getElementById('avatarInput');
const profileAvatar = document.getElementById('profileAvatar');
// CORRECCIÓN DE IDS GLOBALES
const filterStudentMonth = document.getElementById('filterStudentMonth');
const goalsPercentage = document.getElementById('goalsPercentage');
const studentGoalsList = document.getElementById('studentGoalsList');

// VARIABLES DE ESTADO GLOBAL
let currentUser = null;
let currentChart = null; 
let listaPracticasPrevias = {}; 
let contadorNotificaciones = 0; 
let camposCambiadosPorCard = {}; 
let ultimaPracticaModificadaId = null; 
let numeroUltimaPracticaModificada = ""; 
let intervaloFlecha = null; 


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


// DETECTAR ESTADO DE LA SESIÓN Y DISTRIBUIR PERFIL Y OBJETIVOS EN TIEMPO REAL
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    const teacherEmail = "javierisma.sanchez@gmail.com";
    if (user.email === teacherEmail) {
      window.location.href = 'teacher.html';
      return;
    }

    const contenedorPerfil = document.getElementById('profileData');
    // CORRECCIÓN: Usamos 'filterStudentMonth' y 'studentGoalsList' que son los que están en tu HTML actual
    const alumnaMonthFilter = document.getElementById('filterStudentMonth');
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');
    const goalsList = document.getElementById('studentGoalsList');

    if (!contenedorPerfil) return;

    // Escuchamos el documento de la alumna en tiempo real
    const docRef = doc(db, "students", user.uid);
    
    onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        
        const student = docSnap.data();
        
        // RENDERIZAR PERFIL COMPACTO Y MODERNIZADO
        const listaEstilos = student.styles ? student.styles.map(e => `<span class="style-badge">${e}</span>`).join('') : '<span class="style-badge none">Ninguno</span>';

        contenedorPerfil.innerHTML = `
          <div class="info-field-box">
            <span class="field-label">Nombre Completo</span>
            <p class="field-value">${student.name || 'No registrado'}</p>
          </div>
          <div class="info-field-box">
            <span class="field-label">Edad</span>
            <p class="field-value">${student.age || 'No registrada'} años</p>
          </div>
          <div class="info-field-box">
            <span class="field-label">Experiencia</span>
            <p class="field-value">${student.experience || 'No registrada'} años</p>
          </div>
          <div class="info-field-box full-width-field">
            <span class="field-label">Estilos de Danza</span>
            <div class="profile-styles-container">
              ${listaEstilos}
            </div>
          </div>
          <div class="info-field-box full-width-field" style="margin-top: 10px; background: rgba(139, 92, 246, 0.05); border-left: 3px solid #8b5cf6;">
            <span class="field-label" style="color: #a78bfa;">Mis metas al unirme</span>
            <p class="field-value" style="font-style: italic; font-size: 0.95rem; margin-top: 5px; color: #d5c5ff;">
              "${student.goals || 'No se registraron objectives iniciales.'}"
            </p>
          </div>
        `;

        // EXTRAER METAS GENERALES
        const metasMensuales = student.monthlyGoals || [];

        // POBLAR EL DROPDOWN DE PERÍODOS DE FORMA DINÁMICA
        if (alumnaMonthFilter) {
          const valorSeleccionadoPrevio = alumnaMonthFilter.value;
          const mesesSet = new Set();
          
          const dActual = new Date();
          const mesActualString = `${dActual.getFullYear()}-${String(dActual.getMonth() + 1).padStart(2, '0')}`;
          mesesSet.add(mesActualString);

          metasMensuales.forEach(meta => {
            if (meta.month) mesesSet.add(meta.month);
          });

          const mesesOrdenados = Array.from(mesesSet).sort().reverse();

          alumnaMonthFilter.innerHTML = '';
          mesesOrdenados.forEach(m => {
            const [year, month] = m.split('-');
            const fechaObj = new Date(year, parseInt(month) - 1, 1);
            let nombreMesLegible = fechaObj.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
            nombreMesLegible = nombreMesLegible.charAt(0).toUpperCase() + nombreMesLegible.slice(1);

            alumnaMonthFilter.innerHTML += `<option value="${m}">${nombreMesLegible}</option>`;
          });

          if (valorSeleccionadoPrevio && mesesOrdenados.includes(valorSeleccionadoPrevio)) {
            alumnaMonthFilter.value = valorSeleccionadoPrevio;
          } else {
            alumnaMonthFilter.value = mesActualString;
          }
        }

        // FUNCIÓN INTERNA PARA FILTRAR Y CALCULAR PROGRESO
        const mostrarMetasYProgreso = () => {
          if (!goalsList) return;

          const mesSeleccionado = alumnaMonthFilter ? alumnaMonthFilter.value : "";
          
          const metasFiltradas = metasMensuales
            .map((meta, index) => ({ ...meta, originalIndex: index }))
            .filter(m => (m.month || "") === mesSeleccionado);

          if (metasFiltradas.length === 0) {
            goalsList.innerHTML = `<p style="color: #888; font-style: italic; padding: 10px 0; margin: 0;">No tenés objetivos asignados por el profesor para este período aún.</p>`;
            if (progressText) progressText.innerText = "0% completado";
            if (goalsPercentage) goalsPercentage.innerText = "0%";
            if (progressBar) progressBar.style.width = "0%";
            return;
          }

          let objetivosHTML = "";
          let completados = 0;

          metasFiltradas.forEach(meta => {
            if (meta.completed) completados++;

            objetivosHTML += `
              <div style="display: flex; align-items: center; gap: 14px; background: #1a1a1a; padding: 14px; border-radius: 8px; border: 1px solid ${meta.completed ? '#222' : '#333'}; border-left: 4px solid ${meta.completed ? '#10b981' : '#f59e0b'}; transition: all 0.3s ease; margin-bottom: 10px;">
                <input 
                  type="checkbox" 
                  class="goal-checkbox" 
                  data-index="${meta.originalIndex}" 
                  ${meta.completed ? 'checked' : ''} 
                  style="width: 18px; height: 18px; accent-color: #8b5cf6; cursor: pointer;"
                >
                <span style="flex: 1; color: ${meta.completed ? '#666' : '#e0e0e0'}; ${meta.completed ? 'text-decoration: line-through;' : ''} font-size: 1rem; user-select: none;">
                  ${meta.text}
                </span>
                ${meta.completed ? '<span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">¡Logrado!</span>' : ''}
              </div>`;
          });
          
          goalsList.innerHTML = objetivosHTML;

          const porcentaje = Math.round((completados / metasFiltradas.length) * 100);
          if (progressText) progressText.innerText = `${porcentaje}% completado`;
          if (goalsPercentage) goalsPercentage.innerText = `${porcentaje}%`;
          if (progressBar) progressBar.style.width = `${porcentaje}%`;

          // PONER ESCUCHADORES DE EVENTOS EN CADA CHECKBOX NUEVO
          document.querySelectorAll('.goal-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
              const idxOriginal = parseInt(e.target.dataset.index);
              const estaChequeado = e.target.checked;

              metasMensuales[idxOriginal].completed = estaChequeado;

              try {
                const studentRef = doc(db, "students", user.uid);
                await updateDoc(studentRef, { monthlyGoals: metasMensuales });
                console.log("Estado del objetivo actualizado con éxito.");
              } catch (error) {
                console.error("Error al actualizar el estado del objetivo:", error);
                alert("No se pudo guardar el progreso. Revisa tu conexión.");
                e.target.checked = !estaChequeado;
              }
            });
          });
        };

        mostrarMetasYProgreso();

        if (alumnaMonthFilter) {
          alumnaMonthFilter.onchange = () => {
            mostrarMetasYProgreso();
          };
        }

      } else {
        console.warn("No se encontró el documento de la alumna.");
      }
    }, (error) => {
      console.error("Error al escuchar el perfil de la alumna:", error);
    });

    initPracticesListener();

  } else {
    window.location.href = 'login.html';
  }
});

// GUARDAR NUEVA PRÁCTICA (ALUMNA)
if (practiceForm) {
  practiceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const videoLink = document.getElementById('videoLink').value;
      // CORRECCIÓN: Se adaptó de 'practiceNotes' a 'notes' o 'videoLink' según tu formulario real
      const notesElement = document.getElementById('notes') || document.getElementById('practiceNotes');
      const practiceNotes = notesElement ? notesElement.value : "";

      await addDoc(collection(db, "practices"), {
        userId: currentUser.uid,
        videoLink: videoLink,
        notes: practiceNotes,
        createdAt: new Date(),
        unreadByStudent: false 
      });

      // Si usás tu pop-up estético personalizado en vez de alert nativo:
      const successModal = document.getElementById('successModal');
      if (successModal) {
        successModal.style.display = 'flex';
      } else {
        alert('Práctica guardada correctamente');
      }
      
      practiceForm.reset();
    } catch (error) {
      console.error("Error al subir la práctica:", error);
    }
  });
}

// Cierre del modal personalizado opcional si existe en tu HTML
const closeModalBtn = document.getElementById('closeModalBtn');
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    const successModal = document.getElementById('successModal');
    if (successModal) successModal.style.display = 'none';
  });
}


// ESCUCHA EN TIEMPO REAL HISTORIAL DE PRÁCTICAS
function initPracticesListener() {
  const q = query(
    collection(db, "practices"),
    where("userId", "==", currentUser.uid)
  );

  const storageKey = `historial_practicas_${currentUser.uid}`;
  try {
    const localData = localStorage.getItem(storageKey);
    if (localData) {
      listaPracticasPrevias = JSON.parse(localData);
    }
  } catch (err) {
    console.error("Error al leer localStorage:", err);
  }

  onSnapshot(q, (querySnapshot) => {
    
    let docsTemporales = [];
    querySnapshot.forEach((d) => {
      docsTemporales.push({ id: d.id, createdAt: d.data().createdAt?.seconds || 0 });
    });
    docsTemporales.sort((a, b) => a.createdAt - b.createdAt);

    querySnapshot.docChanges().forEach((change) => {
      const practiceId = change.doc.id;
      const data = change.doc.data();

      if ((change.type === "modified" || change.type === "added") && data.unreadByStudent === true) {
        const previa = listaPracticasPrevias[change.doc.id];
        
        const indiceOrdenado = docsTemporales.findIndex(d => d.id === practiceId);
        const numCardCalculado = indiceOrdenado !== -1 ? indiceOrdenado + 1 : "";

        if (previa) {
          if (!camposCambiadosPorCard[practiceId] || camposCambiadosPorCard[practiceId].length === 0) {
            camposCambiadosPorCard[practiceId] = [];
          }
          
          if (data.precision !== previa.precision && !camposCambiadosPorCard[practiceId].includes("precision")) camposCambiadosPorCard[practiceId].push("precision");
          if (data.definition !== previa.definition && !camposCambiadosPorCard[practiceId].includes("definition")) camposCambiadosPorCard[practiceId].push("definition");
          if (data.fluidity !== previa.fluidity && !camposCambiadosPorCard[practiceId].includes("fluidity")) camposCambiadosPorCard[practiceId].push("fluidity");
          if (data.attitude !== previa.attitude && !camposCambiadosPorCard[practiceId].includes("attitude")) camposCambiadosPorCard[practiceId].push("attitude");
          if (data.teacherComment !== previa.teacherComment && !camposCambiadosPorCard[practiceId].includes("comment")) camposCambiadosPorCard[practiceId].push("comment");
          if (data.timestamps !== previa.timestamps && !camposCambiadosPorCard[practiceId].includes("timestamps")) camposCambiadosPorCard[practiceId].push("timestamps");
          if (data.teacherVideoFeedback !== previa.teacherVideoFeedback && !camposCambiadosPorCard[practiceId].includes("video")) camposCambiadosPorCard[practiceId].push("video");
          
          if (camposCambiadosPorCard[practiceId].length > 0) {
            ultimaPracticaModificadaId = practiceId;
            numeroUltimaPracticaModificada = numCardCalculado;
          }
        } 
        else if (change.type === "added" && !previa) {
          camposCambiadosPorCard[practiceId] = [];
          if (data.precision !== undefined && data.precision !== "") camposCambiadosPorCard[practiceId].push("precision");
          if (data.definition !== undefined && data.definition !== "") camposCambiadosPorCard[practiceId].push("definition");
          if (data.fluidity !== undefined && data.fluidity !== "") camposCambiadosPorCard[practiceId].push("fluidity");
          if (data.attitude !== undefined && data.attitude !== "") camposCambiadosPorCard[practiceId].push("attitude");
          if (data.teacherComment !== undefined && data.teacherComment !== "") camposCambiadosPorCard[practiceId].push("comment");
          if (data.timestamps !== undefined && data.timestamps !== "") camposCambiadosPorCard[practiceId].push("timestamps");
          if (data.teacherVideoFeedback !== undefined && data.teacherVideoFeedback !== "") camposCambiadosPorCard[practiceId].push("video");
          
          if (camposCambiadosPorCard[practiceId].length > 0) {
            ultimaPracticaModificadaId = practiceId;
            numeroUltimaPracticaModificada = numCardCalculado;
          }
        }
      }
    });

    let practicesArray = [];
    let hayActualizacionCritica = false;
    let nombresPracticasModificadas = []; 

    let totalPrecision = 0;
    let totalDefinition = 0;
    let totalFluidity = 0;
    let totalAttitude = 0;
    let feedbackCount = 0;
    
    contadorNotificaciones = 0; 
    let objetoParaSincronizarStorage = { ...listaPracticasPrevias };

    querySnapshot.forEach((docItem) => {
      const data = docItem.data();
      const practiceId = docItem.id;

      practicesArray.push({
        id: practiceId,
        ...data,
        createdAtSeconds: data.createdAt ? data.createdAt.seconds : Date.now() / 1000
      });

      if (data.unreadByStudent === true) {
        contadorNotificaciones++;
      }

      objetoParaSincronizarStorage[practiceId] = {
        precision: data.precision,
        definition: data.definition,
        fluidity: data.fluidity,
        attitude: data.attitude,
        teacherComment: data.teacherComment,
        timestamps: data.timestamps,
        teacherVideoFeedback: data.teacherVideoFeedback,
        feedbackUpdatedAt: data.feedbackUpdatedAt
      };
    });

    try {
      localStorage.setItem(storageKey, JSON.stringify(objetoParaSincronizarStorage));
    } catch (err) {
      console.error("Error al guardar en localStorage:", err);
    }

    practicesArray.sort((a, b) => a.createdAtSeconds - b.createdAtSeconds);

    practicesArray.forEach((practice, index) => {
      const practiceId = practice.id;
      const numeroPractica = index + 1;

      const fechaEnvioTexto = formatearFecha(practice.createdAt) || 'Fecha no registrada';
      const fechaCorreccionTexto = formatearFecha(practice.feedbackUpdatedAt);

      if (practice.unreadByStudent === true && camposCambiadosPorCard[practiceId]?.length > 0) {
        const previa = listaPracticasPrevias[practiceId];
        if (previa && previa.feedbackUpdatedAt?.seconds !== practice.feedbackUpdatedAt?.seconds) {
          hayActualizacionCritica = true;
          if (!nombresPracticasModificadas.includes(`Práctica #${numeroPractica}`)) {
            nombresPracticasModificadas.push(`Práctica #${numeroPractica}`);
          }
        }
      }

      listaPracticasPrevias[practiceId] = practice;

      if (practice.precision) {
        totalPrecision += Number(practice.precision);
        totalDefinition += Number(practice.definition);
        totalFluidity += Number(practice.fluidity);
        totalAttitude += Number(practice.attitude);
        feedbackCount++;
      }

      const verificarCambio = (campoNombre) => {
        const arrCambios = camposCambiadosPorCard[practiceId] || [];
        const fueModificado = arrCambios.includes(campoNombre);
        
        let estiloBase = "flex: 1; min-width: 100px; background: #252525; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #333; transition: all 0.5s ease;";
        if (campoNombre === 'comment' || campoNombre === 'timestamps' || campoNombre === 'video') {
          estiloBase = "transition: all 0.5s ease; margin-bottom: 5px;"; 
        }

        return {
          style: fueModificado 
            ? (campoNombre === 'comment' || campoNombre === 'timestamps' || campoNombre === 'video'
                ? "background: rgba(245, 158, 11, 0.15); border-left: 3px solid #f59e0b; padding: 4px 8px; border-radius: 4px; margin-bottom: 5px; transition: all 0.5s ease;"
                : "flex: 1; min-width: 100px; background: rgba(245, 158, 11, 0.15); padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #f59e0b; transition: all 0.5s ease;")
            : estiloBase,
          tag: fueModificado ? ' <span class="modificado-tag" style="color: #f59e0b; font-weight: bold; font-size: 0.75rem; display: block; margin-top: 2px; transition: opacity 0.5s ease;">• Modificado</span>' : ''
        };
      };

      const cPrecision = verificarCambio("precision");
      const cDefinition = verificarCambio("definition");
      const cFluidity = verificarCambio("fluidity");
      const cAttitude = verificarCambio("attitude");
      const cComment = verificarCambio("comment");
      const cTimestamps = verificarCambio("timestamps");
      const cVideo = verificarCambio("video");

      const tieneCambiosActivos = camposCambiadosPorCard[practiceId] && camposCambiadosPorCard[practiceId].length > 0;
      
      const colorBordeCard = (practice.unreadByStudent === true || tieneCambiosActivos || ultimaPracticaModificadaId === practiceId)
        ? '#f59e0b' 
        : (practice.teacherComment || practice.precision ? '#8b5cf6' : '#333');

      const infoFechaCorreccionHTML = (practice.teacherComment || practice.precision) && fechaCorreccionTexto
        ? `<p style="color: #888; font-size: 0.85rem; margin-top: 0; margin-bottom: 15px;">📅 <strong>Corregido por Javier el:</strong> ${fechaCorreccionTexto}</p>`
        : '';

      const botonEntendidoHTML = (practice.unreadByStudent === true || tieneCambiosActivos || ultimaPracticaModificadaId === practiceId)
        ? `<button class="btn-entendido" data-id="${practiceId}" style="margin-top: 15px; background: #f59e0b; color: #111; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: background 0.2s;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Marcar como leído</button>`
        : '';

      const estructuraTarjetaHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 1.3rem;">Práctica #${numeroPractica}</h2>
        </div>
        
        <p style="color: #888; font-size: 0.85rem; margin-top: 0; margin-bottom: 15px;">📅 <strong>Enviada el:</strong> ${fechaEnvioTexto}</p>
        
        <p style="margin-bottom: 8px;"><strong>Video Alumna:</strong> <a href="${practice.videoLink}" target="_blank" style="color: #8b5cf6; font-weight: bold; text-decoration: none; border-bottom: 1px dashed #8b5cf6;">Ver práctica</a></p>
        <p style="margin-bottom: 0;"><strong>Mis Notas:</strong> ${practice.notes || 'Sin notas'}</p>
        <hr style="border-color: #2a2a2a; margin: 20px 0;">
        
        <h3 style="margin-top: 0; margin-bottom: 4px; color: #8b5cf6; font-size: 1.15rem;">Devolución del profesor</h3>
        ${infoFechaCorreccionHTML}
        
        ${
          practice.teacherComment || practice.precision
          ? `
            <div class="contenedor-scores" style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
              <div class="bloque-score" style="${cPrecision.style}"><span style="color: #aaa; font-size: 0.85rem; display: block; margin-bottom: 2px;">Precisión</span><strong style="font-size: 1.1rem; color: #fff;">${practice.precision || '-'}/10</strong>${cPrecision.tag}</div>
              <div class="bloque-score" style="${cDefinition.style}"><span style="color: #aaa; font-size: 0.85rem; display: block; margin-bottom: 2px;">Definición</span><strong style="font-size: 1.1rem; color: #fff;">${practice.definition || '-'}/10</strong>${cDefinition.tag}</div>
              <div class="bloque-score" style="${cFluidity.style}"><span style="color: #aaa; font-size: 0.85rem; display: block; margin-bottom: 2px;">Fluidez</span><strong style="font-size: 1.1rem; color: #fff;">${practice.fluidity || '-'}/10</strong>${cFluidity.tag}</div>
              <div class="bloque-score" style="${cAttitude.style}"><span style="color: #aaa; font-size: 0.85rem; display: block; margin-bottom: 2px;">Actitud</span><strong style="font-size: 1.1rem; color: #fff;">${practice.attitude || '-'}/10</strong>${cAttitude.tag}</div>
            </div>
            
            <div class="bloque-texto-feedback" style="${cComment.style}">
              <strong>Comentarios:</strong>
              <p style="background: #121212; padding: 12px; border-radius: 6px; margin-top: 6px; margin-bottom: 12px; font-style: italic; color: #e0e0e0; line-height: 1.4; border: 1px solid #222;">"${practice.teacherComment || 'Sin comentarios de texto.'}"</p>
            </div>
            
            <div class="bloque-texto-feedback" style="${cTimestamps.style}">
              <strong>Timestamps:</strong>
              <p style="font-size: 0.9rem; margin-top: 5px; margin-bottom: 15px; color: #aaa; background: #121212; padding: 8px 12px; border-radius: 6px; border: 1px solid #222;">${practice.timestamps || 'Sin timestamps'}</p>
            </div>

          ${practice.teacherVideoFeedback ? (() => {
  // Limpiamos el enlace para asegurarnos de que abra el visor oficial sin errores
  const cleanUrl = practice.teacherVideoFeedback
    .replace('/preview', '/view')
    .split('?')[0]; // Eliminamos parámetros viejos si existen

  return `
    <div class="bloque-texto-feedback" style="margin-top: 15px; ${cVideo.style}">
      <strong>Video Devolución:</strong>
      <div class="contenedor-link-video">
        <p class="desc-video-info">Para ver la corrección con controles completos y pantalla completa en tu celular, tocá el botón de abajo:</p>
        <a href="${cleanUrl}" target="_blank" class="btn-video-drive">
          🎬 Ver Video Devolución
        </a>
      </div>
    </div>
  `;
})() : ''}
              
              ${botonEntendidoHTML}
            `
            : `<p style="color: #888; font-style: italic; margin-top: 10px;">Todavía no hay devolución del profesor.</p>`
          }
        `;

      let tarjetaExistente = document.getElementById(`card-${practiceId}`);

      if (tarjetaExistente) {
        tarjetaExistente.style.borderLeft = `5px solid ${colorBordeCard}`;
        tarjetaExistente.innerHTML = estructuraTarjetaHTML;
        tarjetaExistente.setAttribute('data-category', (practice.category || 'tecnica').toLowerCase());
      } else {
        const nuevaTarjeta = document.createElement('div');
        nuevaTarjeta.id = `card-${practiceId}`;
        nuevaTarjeta.className = 'practice-item';
        
        nuevaTarjeta.setAttribute('data-category', (practice.category || 'tecnica').toLowerCase());
        
        nuevaTarjeta.style.cssText = `border-left: 5px solid ${colorBordeCard}; padding: 20px; margin-bottom: 20px; background: #1a1a1a; border-radius: 8px; transition: border-color 0.5s ease;`;
        nuevaTarjeta.innerHTML = estructuraTarjetaHTML;
        if (practiceList) practiceList.appendChild(nuevaTarjeta);
      }
    });

    // MANEJADOR EXCLUSIVO MANUAL PARA EL BOTÓN "MARCAR COMO LEÍDO"
    if (practiceList) {
      const botonesEntendido = practiceList.querySelectorAll('.btn-entendido');
      botonesEntendido.forEach(btn => {
        btn.onclick = async (e) => {
          const targetId = e.currentTarget.dataset.id;
          
          camposCambiadosPorCard[targetId] = [];

          if (ultimaPracticaModificadaId === targetId) {
            ultimaPracticaModificadaId = null;
            numeroUltimaPracticaModificada = "";
          }

          try {
            await updateDoc(doc(db, "practices", targetId), {
              unreadByStudent: false
            });
          } catch(err) {
            console.error("Error al actualizar lectura en Firestore:", err);
          }

          const practicaActual = listaPracticasPrevias[targetId];
          if (practicaActual) {
            try {
              const localData = localStorage.getItem(storageKey);
              if (localData) {
                let objetoStorage = JSON.parse(localData);
                objetoStorage[targetId] = {
                  precision: practicaActual.precision,
                  definition: practicaActual.definition,
                  fluidity: practicaActual.fluidity,
                  attitude: practicaActual.attitude,
                  teacherComment: practicaActual.teacherComment,
                  timestamps: practicaActual.timestamps,
                  teacherVideoFeedback: practicaActual.teacherVideoFeedback,
                  feedbackUpdatedAt: practicaActual.feedbackUpdatedAt
                };
                localStorage.setItem(storageKey, JSON.stringify(objetoStorage));
              }
            } catch(err) {
              console.error("Error actualizando storage:", err);
            }
          }

          e.currentTarget.remove();

          const tarjeta = document.getElementById(`card-${targetId}`);
          if (tarjeta) {
            tarjeta.style.borderLeft = "5px solid #8b5cf6"; 
            tarjeta.querySelectorAll('.modificado-tag').forEach(span => span.remove());
            tarjeta.querySelectorAll('.bloque-score').forEach(div => {
              div.style.background = "#252525";
              div.style.borderColor = "#333";
            });
            tarjeta.querySelectorAll('.bloque-texto-feedback').forEach(div => {
              div.style.background = "transparent";
              div.style.borderLeft = "none";
              div.style.padding = "0px";
            });
          }

          const otraPendiente = practicesArray.find(p => p.id !== targetId && p.unreadByStudent === true);
          if (otraPendiente) {
            ultimaPracticaModificadaId = otraPendiente.id;
            const idxOrdenado = practicesArray.findIndex(p => p.id === otraPendiente.id);
            numeroUltimaPracticaModificada = idxOrdenado !== -1 ? idxOrdenado + 1 : "";
          } else {
            ultimaPracticaModificadaId = null;
            numeroUltimaPracticaModificada = "";
          }

          actualizarBotonFlotanteEstatico();
        };
      });
    }

    actualizarGlobitoMenu(); 
    
    if (hayActualizacionCritica && nombresPracticasModificadas.length > 0) {
      const listaDeCardsTexto = nombresPracticasModificadas.join(', ');
      mostrarNotificacionAlumna(`¡Actualización en tiempo real! ⚡ Javier modificó: ${listaDeCardsTexto}. Revisá las etiquetas naranjas.`);
    }

    const seccionPracticas = document.getElementById('practicesSection');
    if (seccionPracticas && seccionPracticas.classList.contains('active-section')) {
      actualizarBotonFlotanteEstatico();
    }

    renderChart(practicesArray);
    
    if (feedbackCount > 0) {
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div style="display: flex; gap: 15px; flex-wrap: wrap; width:100%;">
            <div style="flex: 1; min-width: 150px; background: #161616; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #222;">
              <span style="color: #aaa; font-size: 0.85rem; display: block; margin-bottom: 5px;">Precisión promedio</span>
              <strong style="font-size: 1.4rem; color: #8b5cf6;">${(totalPrecision / feedbackCount).toFixed(1)}</strong>
            </div>
            <div style="flex: 1; min-width: 150px; background: #161616; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #222;">
              <span style="color: #aaa; font-size: 0.85rem; display: block; margin-bottom: 5px;">Definición promedio</span>
              <strong style="font-size: 1.4rem; color: #3b82f6;">${(totalDefinition / feedbackCount).toFixed(1)}</strong>
            </div>
            <div style="flex: 1; min-width: 150px; background: #161616; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #222;">
              <span style="color: #aaa; font-size: 0.85rem; display: block; margin-bottom: 5px;">Fluidez promedio</span>
              <strong style="font-size: 1.4rem; color: #10b981;">${(totalFluidity / feedbackCount).toFixed(1)}</strong>
            </div>
            <div style="flex: 1; min-width: 150px; background: #161616; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #222;">
              <span style="color: #aaa; font-size: 0.85rem; display: block; margin-bottom: 5px;">Actitud promedio</span>
              <strong style="font-size: 1.4rem; color: #f59e0b;">${(totalAttitude / feedbackCount).toFixed(1)}</strong>
            </div>
          </div>
        `;
      }
    } else {
      if (statsContainer) {
        statsContainer.innerHTML = `<p style="color: #888; font-style: italic;">Todavía no hay suficientes correcciones.</p>`;
      }
    }
    
    // GENERACIÓN DINÁMICA DE BADGES POR NÚMERO DE PRÁCTICA
    const filtroContenedor = document.getElementById('filterCategoryBadges');
    if (filtroContenedor) {
      const badgeActivoPrevio = filtroContenedor.querySelector('.filter-badge.active');
      const seleccionPrevia = badgeActivoPrevio ? badgeActivoPrevio.getAttribute('data-target-practice') : 'todos';

      filtroContenedor.innerHTML = '';

      const btnTodas = document.createElement('span');
      btnTodas.className = `filter-badge ${seleccionPrevia === 'todos' ? 'active' : ''}`;
      btnTodas.setAttribute('data-target-practice', 'todos');
      btnTodas.innerText = 'Todas las prácticas';
      filtroContenedor.appendChild(btnTodas);

      practicesArray.forEach((practice, index) => {
        const numeroPractica = index + 1;
        const btnNumero = document.createElement('span');
        
        btnNumero.className = `filter-badge ${seleccionPrevia === String(numeroPractica) ? 'active' : ''}`;
        btnNumero.setAttribute('data-target-practice', numeroPractica);
        btnNumero.innerText = `#${numeroPractica}`;
        filtroContenedor.appendChild(btnNumero);
      });
    }
  }); // Fin del onSnapshot

  // ESCUCHADOR DE CLICS PARA FILTRAR POR NÚMERO DE PRÁCTICA
  const filtroContenedorClick = document.getElementById('filterCategoryBadges');
  if (filtroContenedorClick) {
    filtroContenedorClick.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-badge')) {
        const badges = filtroContenedorClick.querySelectorAll('.filter-badge');
        
        badges.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const objetivoSeleccionado = e.target.getAttribute('data-target-practice');
        const tarjetasPracticas = document.querySelectorAll('.practice-item');
        
        tarjetasPracticas.forEach(tarjeta => {
          if (objetivoSeleccionado === 'todos') {
            tarjeta.style.display = 'block';
          } else {
            const tituloH2 = tarjeta.querySelector('h2');
            if (tituloH2 && tituloH2.innerText.includes(`Práctica #${objetivoSeleccionado}`)) {
              tarjeta.style.display = 'block';
            } else {
              tarjeta.style.display = 'none';
            }
          }
        });
      }
    });
  }
} // Fin de la función initPracticesListener

function actualizarGlobitoMenu() {
  const botones = document.querySelectorAll('.menu-btn');
  let btnPracticas = null;

  botones.forEach(btn => {
    if (btn.textContent.includes('Mis prácticas')) {
      btnPracticas = btn;
    }
  });
  
  if (btnPracticas) {
    let badge = btnPracticas.querySelector('.menu-badge');
    
    if (contadorNotificaciones > 0) {
      btnPracticas.style.position = 'relative';
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'menu-badge';
        btnPracticas.appendChild(badge);
      }
      badge.innerText = contadorNotificaciones;
    } else {
      if (badge) badge.remove();
    }
  }
}


function actualizarBotonFlotanteEstatico() {
  const seccionPracticas = document.getElementById('practicesSection');
  if (!seccionPracticas) return;

  let btnFlotante = document.getElementById('scroll-anchor-btn');
  
  const tieneNotificacionActiva = ultimaPracticaModificadaId !== null;
  const colorEstilo = tieneNotificacionActiva ? '#f59e0b' : '#8b5cf6';
  const animacionPulsar = tieneNotificacionActiva ? 'pulseGlow 2s infinite' : 'none';

  if (!btnFlotante) {
    btnFlotante = document.createElement('button');
    btnFlotante.id = 'scroll-anchor-btn';
    
    if (!document.getElementById('fab-animation-styles')) {
      const styleSheet = document.createElement("style");
      styleSheet.id = 'fab-animation-styles';
      styleSheet.innerText = `
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.6), 0 6px 16px rgba(0,0,0,0.6); }
          70% { box-shadow: 0 0 0 15px rgba(245, 158, 11, 0), 0 6px 16px rgba(0,0,0,0.6); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0), 0 6px 16px rgba(0,0,0,0.6); }
        }
      `;
      document.head.appendChild(styleSheet);
    }
    
    seccionPracticas.appendChild(btnFlotante);
  }

  const colorFondoFAB = tieneNotificacionActiva ? colorEstilo : '#1a1a1a';
  const colorIconoFAB = tieneNotificacionActiva ? '#111111' : colorEstilo;

  btnFlotante.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: ${colorFondoFAB};
    color: ${colorIconoFAB};
    border: 2px solid ${colorEstilo};
    width: 56px;
    height: 56px;
    border-radius: 50%;
    font-size: 1.4rem;
    cursor: pointer;
    z-index: 9998;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
    ${animacionPulsar}
    transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    opacity: 1;
    transform: scale(1);
  `;

  const badgeHTML = tieneNotificacionActiva 
    ? `<span id="fab-mini-badge" style="position: absolute; top: -4px; right: -4px; background: #8b5cf6; color: white; font-size: 0.72rem; font-weight: bold; min-width: 18px; height: 18px; border-radius: 10px; display: flex; align-items: center; justify-content: center; padding: 0 4px; border: 1px solid #1a1a1a; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">${numeroUltimaPracticaModificada ? '#' + numeroUltimaPracticaModificada : "!"}</span>`
    : '';

  btnFlotante.innerHTML = `
    <svg id="fab-chevron" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.3s ease; color: ${colorIconoFAB}; transform: rotate(0deg);">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
    ${badgeHTML}
  `;

  btnFlotante.onmouseenter = () => { 
    btnFlotante.style.backgroundColor = colorEstilo; 
    const svg = document.getElementById('fab-chevron');
    if (svg) svg.style.color = '#111111';
  };
  btnFlotante.onmouseleave = () => { 
    btnFlotante.style.backgroundColor = colorFondoFAB; 
    const svg = document.getElementById('fab-chevron');
    if (svg) svg.style.color = colorIconoFAB;
  };

  btnFlotante.onclick = () => {
    let destinoY = 0;
    let esRedireccionTarjeta = false;

    if (ultimaPracticaModificadaId !== null) {
      const elementoTarjeta = document.getElementById(`card-${ultimaPracticaModificadaId}`);
      if (elementoTarjeta) {
        const copiaRect = elementoTarjeta.getBoundingClientRect();
        const scrollActualY = window.pageYOffset || document.documentElement.scrollTop;
        
        destinoY = copiaRect.top + scrollActualY - (window.innerHeight / 2) + (copiaRect.height / 2);
        esRedireccionTarjeta = true;

        elementoTarjeta.style.transform = 'scale(1.02)';
        setTimeout(() => elementoTarjeta.style.transform = 'scale(1)', 600);
      }
    }

    if (!esRedireccionTarjeta) {
      const svgChevron = document.getElementById('fab-chevron');
      const direccionActual = svgChevron ? svgChevron.dataset.direccion : "down";

      if (direccionActual === "up") {
        destinoY = 0;
      } else {
        destinoY = document.documentElement.scrollHeight || document.body.scrollHeight;
      }
    }

    const posicionInicial = window.pageYOffset || document.documentElement.scrollTop;
    const distancia = destinoY - posicionInicial;
    const duracion = 900; 
    let tiempoInicio = null;

    const funcionSmooth = (t, b, c, d) => {
      t /= d; t--; return c * (t * t * t + 1) + b;
    };

    const animacionScroll = (tiempoActual) => {
      if (tiempoInicio === null) tiempoInicio = tiempoActual;
      const tiempoTranscurrido = tiempoActual - tiempoInicio;
      const nuevaPosicion = funcionSmooth(tiempoTranscurrido, posicionInicial, distancia, duracion);
      
      window.scrollTo(0, nuevaPosicion);

      if (tiempoTranscurrido < duracion) {
        requestAnimationFrame(animacionScroll);
      } else {
        window.scrollTo(0, destinoY);
      }
    };

    requestAnimationFrame(animacionScroll);
  };

  if (intervaloFlecha) clearInterval(intervaloFlecha);
  
  intervaloFlecha = setInterval(() => {
    const svgChevron = document.getElementById('fab-chevron');
    if (!svgChevron) return;

    if (ultimaPracticaModificadaId !== null) {
      const elTarjeta = document.getElementById(`card-${ultimaPracticaModificadaId}`);
      if (elTarjeta) {
        const rect = elTarjeta.getBoundingClientRect();
        if (rect.top + rect.height / 2 < window.innerHeight / 2) {
          svgChevron.style.transform = 'rotate(180deg)';
          svgChevron.dataset.direccion = "up";
        } else {
          svgChevron.style.transform = 'rotate(0deg)';
          svgChevron.dataset.direccion = "down";
        }
      }
    } else {
      const limiteScroll = 400; 
      if (window.pageYOffset > limiteScroll) {
        svgChevron.style.transform = 'rotate(180deg)'; 
        svgChevron.dataset.direccion = "up";          
      } else {
        svgChevron.style.transform = 'rotate(0deg)';   
        svgChevron.dataset.direccion = "down";         
      }
    }
  }, 200);
}

function ocultarBotonFlotanteDeSeccion() {
  if (intervaloFlecha) {
    clearInterval(intervaloFlecha);
    intervaloFlecha = null;
  }
  const btnFlotante = document.getElementById('scroll-anchor-btn');
  if (btnFlotante) btnFlotante.remove();
}


function mostrarNotificacionAlumna(mensaje) {
  let alerta = document.getElementById('alerta-flotante');
  if (!alerta) {
    alerta = document.createElement('div');
    alerta.id = 'alerta-flotante';
    document.body.appendChild(alerta);
  }
  
  alerta.style.position = "fixed";
  alerta.style.top = "20px";
  alerta.style.right = "20px";
  alerta.style.background = "#8b5cf6"; 
  alerta.style.color = "white";
  alerta.style.padding = "16px 24px";
  alerta.style.borderRadius = "8px";
  alerta.style.boxShadow = "0 10px 20px rgba(0,0,0,0.4)";
  alerta.style.zIndex = "9999";
  alerta.style.fontWeight = "500";
  alerta.style.borderLeft = "6px solid #6d28d9";
  alerta.style.transition = "all 0.4s ease";
  alerta.style.maxWidth = "350px";
  
  alerta.innerText = mensaje;
  alerta.style.opacity = "1";
  alerta.style.transform = "translateY(0)";

  setTimeout(() => {
    alerta.style.opacity = "0";
    alerta.style.transform = "translateY(-20px)";
  }, 7000);
}


// CORRECCIÓN GRÁFICO EVOLUCIÓN: Sincronizado para buscar 'practiceChart' o 'progressChart' según el HTML
// REPARACIÓN DEL GRÁFICO DE EVOLUCIÓN (SOPORTE PARA AMBOS IDS DE CANVAS)
function renderChart(practices) {
  // CORRECCIÓN CRUCIAL: Busca tanto 'progressChart' como 'practiceChart' para que no dependa del HTML
  const ctx = document.getElementById('progressChart') || document.getElementById('practiceChart');
  if (!ctx) {
    console.warn("No se encontró el elemento canvas del gráfico en el DOM.");
    return;
  }

  if (currentChart) {
    currentChart.destroy();
  }

  // Filtrar o asegurarse de que solo se grafiquen prácticas que tengan puntajes válidos
  const labels = practices.map((practice, index) => `Prác. #${index + 1}`);

  const precisionData = practices.map(p => p.precision !== undefined && p.precision !== "" ? Number(p.precision) : null);
  const definitionData = practices.map(p => p.definition !== undefined && p.definition !== "" ? Number(p.definition) : null);
  const fluidityData = practices.map(p => p.fluidity !== undefined && p.fluidity !== "" ? Number(p.fluidity) : null);
  const attitudeData = practices.map(p => p.attitude !== undefined && p.attitude !== "" ? Number(p.attitude) : null);

  currentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { 
          label: 'Precisión', 
          data: precisionData, 
          borderColor: '#10b981', // Verde como el profesor
          backgroundColor: 'transparent', 
          tension: 0.4,
          spanGaps: true
        },
        { 
          label: 'Definición', 
          data: definitionData, 
          borderColor: '#3b82f6', // Azul como el profesor
          backgroundColor: 'transparent', 
          tension: 0.4,
          spanGaps: true
        },
        { 
          label: 'Fluidez', 
          data: fluidityData, 
          borderColor: '#f59e0b', // Naranja/Amarillo como el profesor
          backgroundColor: 'transparent', 
          tension: 0.4,
          spanGaps: true
        },
        { 
          label: 'Actitud', 
          data: attitudeData, 
          borderColor: '#db2777', // Fucsia/Magenta como el profesor
          backgroundColor: 'transparent', 
          tension: 0.4,
          spanGaps: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { 
          labels: { color: 'white', font: { family: 'Poppins' } } 
        } 
      },
      scales: {
        y: { 
          min: 1, // Escala de 1 a 10 exacta como la del profesor
          max: 10, 
          ticks: { color: 'white', stepSize: 1 }, 
          grid: { color: '#2c2c2c' } 
        },
        x: { 
          ticks: { color: 'white' }, 
          grid: { color: '#2c2c2c' } 
        }
      }
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = 'login.html';
    } catch (error) {
      console.error(error);
    }
  });
}


// CONTROLADOR DE TABS DE SECCIONES (SIDEBAR)
const menuButtons = document.querySelectorAll('.menu-btn');
const sections = document.querySelectorAll('.dashboard-section');
const sidebarElement = document.getElementById('dashboardSidebar');
const hamburgerBtn = document.getElementById('mobile-hamburger-btn');

menuButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    let target = button.dataset.section;
    if (!target) {
      if (button.textContent.includes('Perfil')) target = 'profileSection';
      if (button.textContent.includes('Subir práctica')) target = 'uploadSection';
      if (button.textContent.includes('Mis prácticas')) target = 'practicesSection';
      if (button.textContent.includes('Objetivos')) target = 'goalsSection';
      if (button.textContent.includes('Evolución')) target = 'statsSection';
    }

    sections.forEach((section) => section.classList.remove('active-section'));
    menuButtons.forEach((btn) => btn.classList.remove('active'));

    const targetElement = document.getElementById(target);
    if (targetElement) targetElement.classList.add('active-section');
    button.classList.add('active');

    if (sidebarElement) {
      sidebarElement.classList.remove('sidebar-open');
    }

    if (button.textContent.includes('Mis prácticas')) {
      const badge = button.querySelector('.menu-badge');
      if (badge) badge.remove();
      actualizarBotonFlotanteEstatico();
    } else {
      ocultarBotonFlotanteDeSeccion();
    }
  });
});

if (hamburgerBtn && sidebarElement) {
  hamburgerBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    sidebarElement.classList.toggle('sidebar-open');
  });

  document.addEventListener('click', (e) => {
    if (!sidebarElement.contains(e.target) && e.target !== hamburgerBtn) {
      sidebarElement.classList.remove('sidebar-open');
    }
  });
}