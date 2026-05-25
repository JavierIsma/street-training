import {
    auth,
    db,
    createUserWithEmailAndPassword,
    setDoc,
    doc
  } from './firebase.js';
  
  const message = document.getElementById('message');
  const form = document.getElementById('registerForm');
  const password =
  document.getElementById('password');

const togglePassword =
  document.getElementById('togglePassword');
  
  form.addEventListener('submit', async (e) => {
  
    e.preventDefault();
    message.innerText = 'Creando usuario...';
  
    const email = document.getElementById('email').value;
  
    const password = document.getElementById('password').value;
  
    const styles = [];
  
    document.querySelectorAll('input[type="checkbox"]:checked')
      .forEach((checkbox) => {
        styles.push(checkbox.value);
      });
  
    try {
  
      // Crear usuario
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
  
      const user = userCredential.user;
  
      // Guardar perfil en Firestore
      await setDoc(doc(db, "students", user.uid), {
  
        name: document.getElementById('name').value,
  
        age: document.getElementById('age').value,
  
        gender: document.getElementById('gender').value,
  
        experience: document.getElementById('experience').value,
  
        styles: styles,
  
        email: email
  
      });
  
      message.innerText = 'Usuario registrado correctamente';
  
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
  
    } catch (error) {

      console.error(error);
    
      if (error.code === 'auth/email-already-in-use') {
    
        alert('Ese email ya está registrado');
    
      } else if (error.code === 'auth/weak-password') {
    
        alert('La contraseña debe tener al menos 6 caracteres');
    
      } else if (
        error.code === 'auth/invalid-credential'
      ) {
    
        alert('Email o contraseña incorrectos');
    
      } else {
    
        alert('Ocurrió un error');
    
      }
    
    }
  
  });

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