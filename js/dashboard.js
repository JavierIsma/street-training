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
  getDocs
} from './firebase.js';

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// ELEMENTOS
const profileData =
  document.getElementById('profileData');

const logoutBtn =
  document.getElementById('logoutBtn');

const practiceForm =
  document.getElementById('practiceForm');

const practiceList =
  document.getElementById('practiceList');

const statsContainer =
  document.getElementById('statsContainer');


let currentUser = null;

const avatarInput =
  document.getElementById('avatarInput');

const profileAvatar =
  document.getElementById('profileAvatar');


// DETECTAR USUARIO
onAuthStateChanged(auth, async (user) => {

  if (user) {

    currentUser = user;

    try {

      // PERFIL
      const docRef =
        doc(db, "students", user.uid);

      const docSnap =
        await getDoc(docRef);

      if (docSnap.exists()) {

        const student =
          docSnap.data();

        profileData.innerHTML = `

          <p><strong>Nombre:</strong> ${student.name}</p>

          <p><strong>Edad:</strong> ${student.age}</p>

          <p><strong>Sexo:</strong> ${student.gender}</p>

          <p><strong>Experiencia:</strong> ${student.experience}</p>

          <p><strong>Estilos:</strong> ${student.styles.join(', ')}</p>

          <p><strong>Email:</strong> ${student.email}</p>

        `;

      }

      // CARGAR PRÁCTICAS
      await loadPractices();

    } catch (error) {

      console.error(error);

    }

  } else {

    window.location.href = 'login.html';

  }

});


// GUARDAR PRÁCTICA
practiceForm.addEventListener('submit', async (e) => {

  e.preventDefault();

  try {

    const videoLink =
      document.getElementById('videoLink').value;

    const practiceNotes =
      document.getElementById('practiceNotes').value;

    await addDoc(collection(db, "practices"), {

      userId: currentUser.uid,

      videoLink: videoLink,

      notes: practiceNotes,

      createdAt: new Date()

    });

    alert('Práctica guardada correctamente');

    practiceForm.reset();

    await loadPractices();

  } catch (error) {

    console.error(error);

  }

});


// CARGAR PRÁCTICAS
async function loadPractices() {

  practiceList.innerHTML = '';

  const q = query(
    collection(db, "practices"),
    where("userId", "==", currentUser.uid)
  );

  const querySnapshot =
    await getDocs(q);

  const practicesArray = [];

  // STATS
  let totalPrecision = 0;
  let totalDefinition = 0;
  let totalFluidity = 0;
  let totalAttitude = 0;

  let feedbackCount = 0;


  querySnapshot.forEach((docItem) => {

    const practice =
      docItem.data();

    practicesArray.push(practice);


    // PROMEDIOS
    if (practice.precision) {

      totalPrecision +=
        Number(practice.precision);

      totalDefinition +=
        Number(practice.definition);

      totalFluidity +=
        Number(practice.fluidity);

      totalAttitude +=
        Number(practice.attitude);

      feedbackCount++;

    }


    // HTML PRÁCTICAS
    practiceList.innerHTML += `

      <div class="practice-item">

        <p>
          <strong>Video:</strong>

          <a href="${practice.videoLink}" target="_blank">
            Ver práctica
          </a>
        </p>

        <p>
          <strong>Notas:</strong>
          ${practice.notes}
        </p>

        <hr>

        <h3>Devolución profesor</h3>

        ${
          practice.teacherComment
          ? `

            <p>
              <strong>Precisión:</strong>
              ${practice.precision || '-'}
            </p>

            <p>
              <strong>Definición:</strong>
              ${practice.definition || '-'}
            </p>

            <p>
              <strong>Fluidez:</strong>
              ${practice.fluidity || '-'}
            </p>

            <p>
              <strong>Actitud:</strong>
              ${practice.attitude || '-'}
            </p>

            <p>
              <strong>Comentario:</strong>
              ${practice.teacherComment}
            </p>

            <p>
              <strong>Timestamps:</strong>
              <br>
              ${practice.timestamps || 'Sin timestamps'}
            </p>

            ${
              practice.teacherVideoFeedback
              ? `

                <div class="video-feedback">

                  <h4>Devolución en video</h4>

                  <iframe
                    width="100%"
                    height="315"
                    src="${
                      practice.teacherVideoFeedback
                        .replace('/view?usp=sharing', '/preview')
                    }"
                    allow="autoplay; fullscreen"
                    allowfullscreen
                  ></iframe>

                </div>

              `
              : ''
            }

          `
          : `

            <p>
              Todavía no hay devolución del profesor.
            </p>

          `
        }

      </div>

    `;

  });


  // RENDER CHART
  renderChart(practicesArray);


  // MOSTRAR STATS
  if (feedbackCount > 0) {

    statsContainer.innerHTML = `

      <p>
        <strong>Precisión promedio:</strong>
        ${(totalPrecision / feedbackCount).toFixed(1)}
      </p>

      <p>
        <strong>Definición promedio:</strong>
        ${(totalDefinition / feedbackCount).toFixed(1)}
      </p>

      <p>
        <strong>Fluidez promedio:</strong>
        ${(totalFluidity / feedbackCount).toFixed(1)}
      </p>

      <p>
        <strong>Actitud promedio:</strong>
        ${(totalAttitude / feedbackCount).toFixed(1)}
      </p>

    `;

  } else {

    statsContainer.innerHTML = `

      <p>
        Todavía no hay suficientes correcciones.
      </p>

    `;

  }

}


// LOGOUT
logoutBtn.addEventListener('click', async () => {

  try {

    await signOut(auth);

    window.location.href = 'login.html';

  } catch (error) {

    console.error(error);

  }

});


// GRÁFICO
function renderChart(practices) {

  const ctx =
    document.getElementById('progressChart');

  if (!ctx) return;

  const labels = practices.map((practice) => {

    if (!practice.feedbackCreatedAt)
      return 'Sin feedback';
  
    const date =
      practice.feedbackCreatedAt.toDate();
  
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short'
    });
  
  });

  const precisionData =
    practices.map(p => p.precision || 0);

  const definitionData =
    practices.map(p => p.definition || 0);

  const fluidityData =
    practices.map(p => p.fluidity || 0);

  const attitudeData =
    practices.map(p => p.attitude || 0);

  new Chart(ctx, {

    type: 'line',

    data: {

      labels: labels,

      datasets: [

        {
          label: 'Precisión',
          data: precisionData,
          borderColor: '#8b5cf6',
          backgroundColor: '#8b5cf6',
          tension: 0.4
        },

        {
          label: 'Definición',
          data: definitionData,
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6',
          tension: 0.4
        },

        {
          label: 'Fluidez',
          data: fluidityData,
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          tension: 0.4
        },

        {
          label: 'Actitud',
          data: attitudeData,
          borderColor: '#f59e0b',
          backgroundColor: '#f59e0b',
          tension: 0.4
        }

      ]

    },

    options: {

      responsive: true,

      plugins: {

        legend: {

          labels: {
            color: 'white'
          }

        }

      },

      scales: {

        y: {

          min: 0,
          max: 10,

          ticks: {
            color: 'white'
          },

          grid: {
            color: '#2c2c2c'
          }

        },

        x: {

          ticks: {
            color: 'white'
          },

          grid: {
            color: '#2c2c2c'
          }

        }

      }

    }

  });

}

avatarInput.addEventListener('change', (e) => {

  const file = e.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {

    profileAvatar.src = reader.result;

  };

  reader.readAsDataURL(file);

});

const menuButtons =
  document.querySelectorAll('.menu-btn');

const sections =
  document.querySelectorAll('.dashboard-section');


menuButtons.forEach((button) => {

  button.addEventListener('click', () => {

    const target =
      button.dataset.section;

    sections.forEach((section) => {

      section.classList.remove('active-section');

    });

    menuButtons.forEach((btn) => {

      btn.classList.remove('active');

    });

    document
      .getElementById(target)
      .classList.add('active-section');

    button.classList.add('active');

  });

});