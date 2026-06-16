import { 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { 
  auth, 
  db 
} from './firebase.js'; // Ajustá la ruta si tu archivo firebase.js está en otra carpeta

import { 
  doc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Referencias a los elementos del DOM de tu login.html
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const messageElement = document.getElementById('message');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

/**
 * 1. MOSTRAR / OCULTAR CONTRASEÑA (Función del Ojito 👁️)
 */
if (togglePassword && passwordInput) {
  togglePassword.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    togglePassword.textContent = isPassword ? '🙈' : '👁️';
  });
}

/**
 * 2. PROCESO DE INICIAR SESIÓN (Submit del Formulario)
 */
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    messageElement.style.color = "#ff9800";
    messageElement.textContent = "Ingresando...";

    try {
      // Intentamos loguear en Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Si sos el profesor (Javier), directo al panel de profesor sin mirar Firestore
      const teacherEmail = "javierisma.sanchez@gmail.com";
      if (user.email === teacherEmail) {
        window.location.href = 'teacher.html';
        return;
      }

      // Si no es el profesor, verificamos su existencia en la colección 'students'
      const studentDoc = await getDoc(doc(db, "students", user.uid));
      
      if (studentDoc.exists()) {
        window.location.href = 'dashboard.html'; // Panel de la alumna
      } else {
        messageElement.style.color = "#ef4444";
        messageElement.textContent = "Error: No se encontraron datos de alumna vinculados a esta cuenta.";
      }

    } catch (error) {
      console.error("Error en login:", error);
      messageElement.style.color = "#ef4444";
      
      // Mapeo amigable de errores de login
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          messageElement.textContent = "Correo o contraseña incorrectos.";
          break;
        case 'auth/invalid-email':
          messageElement.textContent = "El formato del correo electrónico no es válido.";
          break;
        default:
          messageElement.textContent = "Hubo un error al intentar ingresar. Reintentá.";
          break;
      }
    }
  });
}

/**
 * 3. MOTOR DE RECUPERACIÓN DE CONTRASEÑA (Criterio de doble flujo estético)
 */
if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener('click', async (e) => {
    e.preventDefault(); 

    let email = emailInput.value.trim();

    // CRITERIO 1: Si NO colocó el mail en el login, abrimos el modal propio con el input interno
    if (!email) {
      mostrarModalRecuperacionConInput();
      return; 
    }

    // CRITERIO 2: Si SÍ colocó el mail, ejecutamos directo el envío con el mensaje detallado
    enviarCorreoRecuperacionFirebase(email);
  });
}

/**
 * FUNCIÓN AUXILIAR: Envía el correo mediante Firebase y despliega el modal con tu redacción preferida
 */
async function enviarCorreoRecuperacionFirebase(email) {
  try {
    auth.languageCode = 'es'; // Configura correos de Firebase en español
    await sendPasswordResetEmail(auth, email);
    
    // El cartel de éxito estético y bien redactado
    mostrarModalPersonalizado(
      "¡Correo enviado! 🚀", 
      `Se envió un enlace seguro a:<br><strong style="color: #4caf50; word-break: break-all;">${email}</strong><br><br>Revisá la bandeja de entrada (o la carpeta de Correo No Deseado / SPAM) para configurar tu nueva contraseña.`
    );
    
    if (messageElement) {
      messageElement.style.color = "#4caf50";
      messageElement.textContent = "Enlace de recuperación enviado al correo.";
    }
  } catch (error) {
    console.error("Error en restablecimiento de contraseña:", error);
    switch (error.code) {
      case 'auth/invalid-email':
        mostrarModalPersonalizado("Error de formato", "El formato del correo electrónico ingresado no es válido.");
        break;
      case 'auth/user-not-found':
        mostrarModalPersonalizado("Usuario no encontrado", "No existe ninguna cuenta registrada con ese correo electrónico.");
        break;
      default:
        mostrarModalPersonalizado("Ups, hubo un problema", "No se pudo enviar el correo de recuperación. Por favor, verifica el mail e intentalo de nuevo.");
        break;
    }
  }
}

/**
 * FUNCIÓN AUXILIAR: Crea el pop-up estético de "Restablecer contraseña" cuando el campo principal estaba vacío
 */
function mostrarModalRecuperacionConInput() {
  const modalOverlay = document.createElement('div');
  modalOverlay.style.position = 'fixed';
  modalOverlay.style.top = '0';
  modalOverlay.style.left = '0';
  modalOverlay.style.width = '100vw';
  modalOverlay.style.height = '100vh';
  modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
  modalOverlay.style.backdropFilter = 'blur(4px)';
  modalOverlay.style.display = 'flex';
  modalOverlay.style.justifyContent = 'center';
  modalOverlay.style.alignItems = 'center';
  modalOverlay.style.zIndex = '9999';
  modalOverlay.style.opacity = '0';
  modalOverlay.style.transition = 'opacity 0.3s ease';

  const modalBox = document.createElement('div');
  modalBox.style.background = '#1a1a1a';
  modalBox.style.border = '1px solid #333';
  modalBox.style.padding = '25px';
  modalBox.style.borderRadius = '12px';
  modalBox.style.maxWidth = '420px';
  modalBox.style.width = '90%';
  modalBox.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.5)';
  modalBox.style.transform = 'scale(0.8)';
  modalBox.style.transition = 'transform 0.3s ease';
  modalBox.style.fontFamily = "'Poppins', sans-serif";

  modalBox.innerHTML = `
    <h3 style="color: #8b5cf6; margin-top: 0; font-size: 1.4rem; margin-bottom: 12px; font-weight: 600; text-align: center;">Restablecer contraseña</h3>
    <p style="color: #aaa; font-size: 0.9rem; line-height: 1.5; margin-bottom: 15px; text-align: center;">
      Ingresá tu correo electrónico de registro para enviarte el enlace de recuperación.
    </p>
    <input type="email" id="modalInputEmail" placeholder="ejemplo@correo.com" style="width: 100%; background: #111; border: 1px solid #333; color: white; padding: 12px; border-radius: 12px; margin-bottom: 15px; font-size: 0.95rem; outline: none;">
    
    <button id="modalSubmitBtn" class="btn" style="width: 100%; background: #8b5cf6; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 1rem; transition: background 0.2s; margin-bottom: 8px;">
      Enviar Enlace
    </button>
    <button id="modalCancelBtn" style="width: 100%; background: #272727; color: #aaa; border: none; padding: 10px; border-radius: 12px; cursor: pointer; font-size: 0.9rem;">
      Cancelar
    </button>
  `;

  modalOverlay.appendChild(modalBox);
  document.body.appendChild(modalOverlay);

  setTimeout(() => {
    modalOverlay.style.opacity = '1';
    modalBox.style.transform = 'scale(1)';
  }, 10);

  const cerrar = () => {
    modalOverlay.style.opacity = '0';
    modalBox.style.transform = 'scale(0.8)';
    setTimeout(() => modalOverlay.remove(), 300);
  };

  modalOverlay.querySelector('#modalSubmitBtn').addEventListener('click', () => {
    const emailIngresado = document.getElementById('modalInputEmail').value.trim();
    if (!emailIngresado) {
      return;
    }
    cerrar();
    enviarCorreoRecuperacionFirebase(emailIngresado);
  });

  modalOverlay.querySelector('#modalCancelBtn').addEventListener('click', cerrar);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) cerrar(); });
}

/**
 * FUNCIÓN AUXILIAR GENERAL: Levanta pop-ups informativos (Éxitos / Errores) con la estética de la app
 */
function mostrarModalPersonalizado(titulo, mensaje) {
  const modalOverlay = document.createElement('div');
  modalOverlay.style.position = 'fixed';
  modalOverlay.style.top = '0';
  modalOverlay.style.left = '0';
  modalOverlay.style.width = '100vw';
  modalOverlay.style.height = '100vh';
  modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
  modalOverlay.style.backdropFilter = 'blur(4px)';
  modalOverlay.style.display = 'flex';
  modalOverlay.style.justifyContent = 'center';
  modalOverlay.style.alignItems = 'center';
  modalOverlay.style.zIndex = '9999';
  modalOverlay.style.opacity = '0';
  modalOverlay.style.transition = 'opacity 0.3s ease';

  const modalBox = document.createElement('div');
  modalBox.style.background = '#1a1a1a';
  modalBox.style.border = '1px solid #333';
  modalBox.style.padding = '25px';
  modalBox.style.borderRadius = '12px';
  modalBox.style.maxWidth = '420px';
  modalBox.style.width = '90%';
  modalBox.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.5)';
  modalBox.style.transform = 'scale(0.8)';
  modalBox.style.transition = 'transform 0.3s ease';
  modalBox.style.textAlign = 'center';
  modalBox.style.fontFamily = "'Poppins', sans-serif";

  modalBox.innerHTML = `
    <h3 style="color: #8b5cf6; margin-top: 0; font-size: 1.4rem; margin-bottom: 12px; font-weight: 600;">${titulo}</h3>
    <p style="color: #e0e0e0; font-size: 0.95rem; line-height: 1.5; margin-bottom: 20px;">${mensaje}</p>
    <button id="modalAcceptBtn" class="btn" style="width: 100%; background: #8b5cf6; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 1rem; transition: background 0.2s;">
      Aceptar
    </button>
  `;

  modalOverlay.appendChild(modalBox);
  document.body.appendChild(modalOverlay);

  setTimeout(() => {
    modalOverlay.style.opacity = '1';
    modalBox.style.transform = 'scale(1)';
  }, 10);

  const cerrarModal = () => {
    modalOverlay.style.opacity = '0';
    modalBox.style.transform = 'scale(0.8)';
    setTimeout(() => modalOverlay.remove(), 300);
  };

  modalOverlay.querySelector('#modalAcceptBtn').addEventListener('click', cerrarModal);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) cerrarModal(); });
}

/**
 * 4. CONTROLADOR DE RUTA PARA USUARIOS YA LOGUEADOS
 */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const teacherEmail = "javierisma.sanchez@gmail.com";
    if (user.email === teacherEmail) {
      window.location.href = 'teacher.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  }
});