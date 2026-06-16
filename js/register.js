import {
  auth,
  db,
  createUserWithEmailAndPassword,
  setDoc,
  doc
} from './firebase.js';

const message = document.getElementById('message');
const form = document.getElementById('registerForm');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');
const togglePassword = document.getElementById('togglePassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword'); // <-- Nuevo selector

form.addEventListener('submit', async (e) => {

  e.preventDefault();
  message.innerText = 'Creando usuario...';

  const email = document.getElementById('email').value;
  const passwordValue = password.value;
  const confirmPasswordValue = confirmPassword.value;

  // Validar que coincidan las contraseñas
  if (passwordValue !== confirmPasswordValue) {
    message.innerText = '';
    alert('Las contraseñas no coinciden. Por favor, verificalas.');
    confirmPassword.focus();
    return;
  }

  const styles = [];
  document.querySelectorAll('input[type="checkbox"]:checked')
    .forEach((checkbox) => {
      styles.push(checkbox.value);
    });

  try {
    // 1. Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      passwordValue
    );

    const user = userCredential.user;

    // 2. Guardar perfil en Firestore con el campo 'goals' limpio
    await setDoc(doc(db, "students", user.uid), {
      name: document.getElementById('name').value,
      age: document.getElementById('age').value,
      gender: document.getElementById('gender').value,
      experience: document.getElementById('experience').value,
      goals: document.getElementById('goals').value, 
      styles: styles,
      email: email
    });

    message.innerText = 'Usuario registrado correctamente';

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);

  } catch (error) {
    console.error(error);
    message.innerText = '';
  
    if (error.code === 'auth/email-already-in-use') {
      alert('Ese email ya está registrado');
    } else if (error.code === 'auth/weak-password') {
      alert('La contraseña debe tener al menos 6 caracteres');
    } else if (error.code === 'auth/invalid-credential') {
      alert('Email o contraseña incorrectos');
    } else {
      alert('Ocurrió un error');
    }
  }

});

// Lógica del primer ojo visor (Contraseña)
if (togglePassword) {
  togglePassword.addEventListener('click', () => {
    if (password.type === 'password') {
      password.type = 'text';
      togglePassword.textContent = '🙈';
    } else {
      password.type = 'password';
      togglePassword.textContent = '👁️';
    }
  });
}

// Lógica del segundo ojo visor (Repetir Contraseña)
if (toggleConfirmPassword) {
  toggleConfirmPassword.addEventListener('click', () => {
    if (confirmPassword.type === 'password') {
      confirmPassword.type = 'text';
      toggleConfirmPassword.textContent = '🙈';
    } else {
      confirmPassword.type = 'password';
      toggleConfirmPassword.textContent = '👁️';
    }
  });
}