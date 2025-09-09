const $ = jQuery;
const AGENDA_URLS = [
   "https://ftvhd.com/diaries.json", // Fuente externa
];

document.addEventListener("DOMContentLoaded", function () {
  obtenerAgenda();
  setInterval(refrescarAgenda, 60000); // Actualiza cada minuto
});

// Delegación para mostrar/ocultar los servidores de un evento
document.addEventListener("click", function (e) {
  const evento = e.target.closest(".evento");
  if (!evento) return;

  const servidores = evento.querySelector(".servidores");
  if (!servidores) return;

  const estaActivo = servidores.classList.contains("activo");

  // Oculta todos los demás menús de servidores
  document.querySelectorAll(".servidores.activo").forEach(s => {
    if (s !== servidores) {
        s.classList.remove("activo");
    }
  });

  // Muestra u oculta el menú actual
  servidores.classList.toggle("activo");
});

// Convierte la hora UTC (de la fuente) a la zona horaria del usuario
function convertToUserTimeZone(utcHour) {
  const DateTime = luxon.DateTime;
  // Asumimos que la hora de la fuente es de Perú (UTC-5)
  const utcDateTime = DateTime.fromISO(utcHour, { zone: "America/Lima" });
  const localDateTime = utcDateTime.toLocal();
  return localDateTime.toFormat("HH:mm");
}

// Formatea la fecha a un formato legible
function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("es-ES", options);
}

async function refrescarAgenda() {
  await obtenerAgenda();
  console.log("Agenda actualizada");
}

async function obtenerAgenda() {
  const menuElement = document.getElementById("eventos");
  const titleAgendaElement = document.querySelector(".agenda-titulo");

  try {
    let data = [];
    // Carga los eventos desde las URLs definidas
    for (const url of AGENDA_URLS) {
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (Array.isArray(json.data)) {
          data = data.concat(json.data);
        }
      } catch (err) {
        console.error("Error cargando eventos desde:", url, err);
      }
    }

    // Generar datos estructurados JSON-LD para SEO
    // (Esta sección no se modifica)
    const sportsEvents = data.map(ev => {
        const attr = ev.attributes;
        const dateTime = `${attr.date_diary}T${attr.diary_hour}-05:00`;
        // Usamos la nueva URL del reproductor para el SEO
        const embedUrl = `https://futbollibretv.pages.dev/embed/reproductor.html?stream=${attr.embeds?.data[0]?.attributes?.embed_iframe.split('stream=')[1] || ''}`;
        const competencia = attr.country?.data?.attributes?.name || "Fútbol Internacional";
        const description = attr.diary_description.trim().replace(/\s+/g, ' ');
        return {"@type":"SportsEvent","name":description,"startDate":dateTime,"eventStatus":"https://schema.org/EventScheduled","eventAttendanceMode":"https://schema.org/OnlineEventAttendanceMode","location":{"@type":"Place","name":competencia},"url":embedUrl,"organizer":{"@type":"Organization","name":"Fútbol Libre TV","url":"https://futbollibretv.pages.dev/"},"description":`Partido de ${competencia} transmitido gratis por Fútbol Libre TV`};
    });
    const ldScript = document.createElement('script');
    ldScript.type = 'application/ld+json';
    ldScript.text = JSON.stringify({"@context":"https://schema.org","@graph":sportsEvents},null,2);
    const oldScript = document.querySelector('script[type="application/ld+json"]');
    if (oldScript) oldScript.remove();
    document.head.appendChild(ldScript);

    menuElement.innerHTML = "";
    const dateCompleted = formatDate(new Date().toISOString());
    titleAgendaElement.textContent = "Agenda - " + dateCompleted;

    // Ordena los eventos por hora
    data.sort((a, b) => a.attributes.diary_hour.localeCompare(b.attributes.diary_hour));

    // Genera el HTML para cada evento
    data.forEach((value) => {
        let imageUrl = "https://panel.futbollibretvs.pe/uploads/sin_imagen_d36205f0e8.png";
        const imgPath = value.attributes.country?.data?.attributes?.image?.data?.attributes?.url || null;
        if (imgPath) {
            imageUrl = "https://panel.futbollibretvs.pe" + imgPath;
        }

        const hora = convertToUserTimeZone(value.attributes.diary_hour);
        const nombre = value.attributes.diary_description;

        let html = `
            <li class="evento" style="list-style: none;">
                <div class="fila">
                    <span class="hora-ovalo">${hora}</span>
                    <img src="${imageUrl}" alt="bandera" style="width: 18px; height: 18px; border-radius: 50%;">
                    <span class="nombre-evento">${nombre}</span>
                </div>
                <div class="servidores">`;

        // Genera los enlaces para cada opción de stream
        value.attributes.embeds.data.forEach((embed) => {
            const urlDirecto = embed.attributes.embed_iframe;
            const nombreServidor = embed.attributes.embed_name;
            
            // ==========================================================
            //       AJUSTE CLAVE: EXTRAEMOS EL NOMBRE DEL STREAM
            // ==========================================================
            try {
                // Buscamos el parámetro 'stream' en la URL, ej: "https://.../?stream=disney3"
                const urlObj = new URL(urlDirecto);
                const streamName = urlObj.searchParams.get('stream');

                if (streamName) {
                    // Creamos el nuevo enlace que apunta a nuestro reproductor inteligente
                    html += `<a href="/embed/reproductor.html?stream=${streamName}" target="_blank" class="nombre-servidor">➤ ${nombreServidor}</a>`;
                }
            } catch (e) {
                console.warn("URL de embed inválida:", urlDirecto);
            }
        });

        html += `</div></li>`;
        menuElement.innerHTML += html;
    });

  } catch (err) {
    console.error("Error al cargar la agenda:", err);
  }
}
