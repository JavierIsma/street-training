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
    getDoc,
    updateDoc
  } from './firebase.js';
  
  
  const teacherPracticeList = document.getElementById('teacherPracticeList');
  
  const logoutBtn = document.getElementById('logoutBtn');
  
  
  // Cargar todas las prácticas
  async function loadAllPractices() {
  
    teacherPracticeList.innerHTML = '';
  
    const querySnapshot = await getDocs(
      collection(db, "practices")
    );
  
    for (const practiceDoc of querySnapshot.docs) {
  
      const practice = practiceDoc.data();
  
      // Buscar alumna
      const studentRef = doc(db, "students", practice.userId);
  
      const studentSnap = await getDoc(studentRef);
  
      const student = studentSnap.data();
  
      teacherPracticeList.innerHTML += `
  
        <div class="practice-item">
  
          <h3>${student.name}</h3>
  
          <p>
            <strong>Video:</strong>
  
            <a href="${practice.videoLink}" target="_blank">
              Ver práctica
            </a>
          </p>
  
          <p>
            <strong>Notas alumna:</strong>
            ${practice.notes}
          </p>
  
          <hr>
  
          <label>Precisión</label>
          <input type="number" min="1" max="10"
            id="precision-${practiceDoc.id}"
          >
  
          <label>Definición</label>
          <input type="number" min="1" max="10"
            id="definition-${practiceDoc.id}"
          >
  
          <label>Fluidez</label>
          <input type="number" min="1" max="10"
            id="fluidity-${practiceDoc.id}"
          >
  
          <label>Actitud</label>
          <input type="number" min="1" max="10"
            id="attitude-${practiceDoc.id}"
          >
  
          <textarea
            id="comment-${practiceDoc.id}"
            placeholder="Devolución"
          ></textarea>

          <textarea
            id="timestamps-${practiceDoc.id}"
            placeholder="Timestamps del video"
          ></textarea>

          <input
           type="text"
           id="videoFeedback-${practiceDoc.id}"
           placeholder="Link video devolución Drive"
         >
  
          <button
            class="btn saveFeedbackBtn"
            data-id="${practiceDoc.id}"
          >
            Guardar devolución
          </button>
  
        </div>
  
      `;
    }
  
    addFeedbackEvents();
  
  }
  
  
  // Guardar feedback
  function addFeedbackEvents() {
  
    const buttons = document.querySelectorAll('.saveFeedbackBtn');
  
    buttons.forEach((button) => {
  
      button.addEventListener('click', async () => {
  
        const practiceId = button.dataset.id;
  
        const precision =
          document.getElementById(`precision-${practiceId}`).value;
  
        const definition =
          document.getElementById(`definition-${practiceId}`).value;
  
        const fluidity =
          document.getElementById(`fluidity-${practiceId}`).value;
  
        const attitude =
          document.getElementById(`attitude-${practiceId}`).value;
  
        const comment =
          document.getElementById(`comment-${practiceId}`).value;
          
        const timestamps =
         document.getElementById(`timestamps-${practiceId}`).value;
  
         const videoFeedback =
         document.getElementById(`videoFeedback-${practiceId}`).value;
  
        try {
  
          await updateDoc(doc(db, "practices", practiceId), {

            precision: precision,
          
            definition: definition,
          
            fluidity: fluidity,
          
            attitude: attitude,
          
            teacherComment: teacherComment,
          
            timestamps: timestamps,
          
            teacherVideoFeedback: videoFeedback,
          
            feedbackCreatedAt: new Date()
          
          });
  
          alert('Devolución guardada');
  
        } catch (error) {
  
          console.error(error);
  
        }
  
      });
  
    });
  
  }
  
  
  // Logout
  logoutBtn.addEventListener('click', async () => {
  
    await signOut(auth);
  
    window.location.href = 'login.html';
  
  });
  
  
  onAuthStateChanged(auth, async (user) => {

    if (!user) {
  
      window.location.href = 'login.html';
  
      return;
    }
  
    // TU MAIL PROFESOR
    const teacherEmail = "javierisma.sanchez@gmail.com";
  
    if (user.email !== teacherEmail) {
  
      alert('No tenés permisos para entrar acá');
  
      window.location.href = 'dashboard.html';
  
      return;
    }
  
    // Si es profesor
    loadAllPractices();
  
  });;