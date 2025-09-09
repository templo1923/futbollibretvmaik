const $ = jQuery;
const AGENDA_URLS = [
   "https://ftvhd.com/diaries.json", // Fuente de eventos principal
];

// Al cargar la página, obtiene la agenda y la actualiza cada minuto.
document.addEventListener("DOMContentLoaded", function () {
  obtenerAgenda();
  setInterval(refrescarAgenda, 60000);
});

// Maneja los clics en los eventos para mostrar y ocultar las opciones de canal.
document.addEventListener("click", function (e) {
  // Solo reacciona si se hace clic en la fila principal de un evento.
  const eventoFila = e.target.closest(".fila");
  if (!eventoFila) return;

  const evento = eventoFila.parentElement;
  if (!evento || !evento.classList.contains("evento")) return;
  
  const servidores = evento.querySelector(".servidores");
  if (!servidores) return;

  // Si el menú de este evento ya está abierto, lo cerramos y listo.
  if (servidores.classList.contains("activo")) {
    servidores.classList.remove("activo");
    return;
  }

  // Si no, primero cerramos cualquier otro menú que esté abierto.
  document.querySelectorAll(".servidores.activo").forEach(s => {
    s.classList.remove("activo");
  });

  // Y finalmente, abrimos el menú del evento en el que se hizo clic.
  servidores.classList.add("activo");
});

// Convierte la hora de la agenda a la zona horaria del usuario.
function convertToUserTimeZone(utcHour) {
  try {
    const DateTime = luxon.DateTime;
    const utcDateTime = DateTime.fromISO(utcHour, { zone: "America/Lima" });
    return utcDateTime.toLocal().toFormat("HH:mm");
  } catch (e) {
    return "N/A";
  }
}

// Formatea la fecha para el título de la agenda.
function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("es-ES", options);
}

// Función para llamar a la actualización de la agenda.
async function refrescarAgenda() {
  await obtenerAgenda();
  console.log("Agenda de eventos actualizada.");
}

// Función principal para obtener y mostrar los eventos.
async function obtenerAgenda() {
  const menuElement = document.getElementById("eventos");
  const titleAgendaElement = document.querySelector(".agenda-titulo");
  try {
    let data = [];
    // Carga los datos desde las fuentes externas.
    for (const url of AGENDA_URLS) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (Array.isArray(json.data)) {
          data = data.concat(json.data);
        }
      } catch (err) {
        console.error("Error cargando eventos desde:", url, err);
      }
    }
    
    // Genera datos estructurados para SEO (sin cambios necesarios).
    const sportsEvents = data.map(ev => {
        const attr = ev.attributes;
        const dateTime = `${attr.date_diary}T${attr.diary_hour}-05:00`;
        let embedUrl = "https://futbollibretv.pages.dev/";
        const firstEmbedIframe = attr.embeds?.data[0]?.attributes?.embed_iframe;
        if(firstEmbedIframe){try{const urlObj=new URL(firstEmbedIframe);const streamName=urlObj.searchParams.get('stream');if(streamName){embedUrl=`https://futbollibretv.pages.dev/embed/reproductor.html?stream=${streamName}`}}catch(e){}}
        const competencia = attr.country?.data?.attributes?.name || "Fútbol";
        const description = attr.diary_description.trim().replace(/\s+/g, ' ');
        return {"@type":"SportsEvent","name":description,"startDate":dateTime,"eventStatus":"https://schema.org/EventScheduled","eventAttendanceMode":"https://schema.org/OnlineEventAttendanceMode","location":{"@type":"Place","name":competencia},"url":embedUrl,"organizer":{"@type":"Organization","name":"Fútbol Libre TV","url":"https://futbollibretv.pages.dev/"},"description":`Partido de ${competencia} en vivo.`};
    });
    const ldScript=document.createElement('script');ldScript.type="application/ld+json";ldScript.text=JSON.stringify({"@context":"https://schema.org","@graph":sportsEvents},null,2);const oldScript=document.querySelector('script[type="application/ld+json"]');if(oldScript)oldScript.remove();document.head.appendChild(ldScript);

    // Limpia la lista actual y actualiza el título.
    menuElement.innerHTML = "";
    titleAgendaElement.textContent = "Agenda - " + formatDate(new Date().toISOString());
    
    // Ordena los eventos por hora.
    data.sort((a, b) => a.attributes.diary_hour.localeCompare(b.attributes.diary_hour));

    // Genera el HTML para cada evento.
    data.forEach((value) => {
        const { diary_hour, diary_description, country, embeds } = value.attributes;
        const imageUrl = country?.data?.attributes?.image?.data?.attributes?.url 
            ? "https://panel.futbollibretvs.pe" + country.data.attributes.image.data.attributes.url 
            : "https://panel.futbollibretvs.pe/uploads/sin_imagen_d36205f0e8.png";

        let html = `
            <li class="evento" style="list-style: none;">
                <div class="fila">
                    <span class="hora-ovalo">${convertToUserTimeZone(diary_hour)}</span>
                    <img src="${imageUrl}" alt="bandera" style="width: 18px; height: 18px; border-radius: 50%;">
                    <span class="nombre-evento">${diary_description}</span>
                </div>
                <div class="servidores">`;

        // Solo añade opciones de canal si existen.
        if (embeds && embeds.data.length > 0) {
            embeds.data.forEach((embed) => {
                const urlDirecto = embed.attributes.embed_iframe;
                const nombreServidor = embed.attributes.embed_name;
                try {
                    const urlObj = new URL(urlDirecto);
                    const streamName = urlObj.searchParams.get('stream');
                    if (streamName) {
                        html += `<a href="/embed/reproductor.html?stream=${streamName}" target="_blank" class="nombre-servidor">➤ ${nombreServidor}</a>`;
                    }
                } catch (e) {
                    // Ignora URLs de embed inválidas.
                }
            });
        } else {
            // Si no hay canales, muestra un mensaje.
            html += `<span class="nombre-servidor" style="color: #888; padding-left: 10px;">Próximamente...</span>`;
        }

        html += `</div></li>`;
        menuElement.innerHTML += html;
    });

  } catch (err) {
    console.error("Error fatal al cargar la agenda:", err);
    menuElement.innerHTML = `<li style="color: red; padding: 20px;">No se pudo cargar la agenda. Intenta recargar la página.</li>`;
  }
}

