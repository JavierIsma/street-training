import {
  auth,
  signInWithEmailAndPassword
} from './firebase.js';


const form = document.getElementById('loginForm');

const message = document.getElementById('message');


form.addEventListener('submit', async (e) => {

  e.preventDefault();

  const emailInput =
  document.getElementById('email');

const passwordInput =
  document.getElementById('password');

const email = emailInput.value.trim();

const password = passwordInput.value.trim();

  message.innerText = 'Ingresando...';

  if (!email && !password) {

    message.textContent =
  'Completá email y contraseña';
  
    return;
  
  }
  
  if (!email) {
  
    message.textContent =
  'Falta completar el email';
  
    return;
  
  }
  
  if (!password) {
  
    message.textContent =
  'Falta completar la contraseña';
  
    return;
  
  }

  try {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    message.innerText = 'Login correcto';

    setTimeout(() => {

      // MAIL DEL PROFESOR
const teacherEmail = "javierisma.sanchez@gmail.com";

if (email === teacherEmail) {

  window.location.href = 'teacher.html';

} else {

  window.location.href = 'dashboard.html';

}

    }, 1000);

  } catch (error) {

    console.error(error);
  
    if (
      error.code === 'auth/invalid-credential'
    ) {
  
      message.innerText =
        'Email o contraseña incorrectos';
  
    } else {
  
      message.innerText =
        'Ocurrió un error al iniciar sesión';
  
    }
  
  }

});

const password =
  document.getElementById('password');

const togglePassword =
  document.getElementById('togglePassword');

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