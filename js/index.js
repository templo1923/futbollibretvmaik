const $ = jQuery;
const AGENDA_URLS = [
"https://www.pelotalibrevivo.net/eventos.json", // fuente externa
//"https://golazoplay.com/agenda.json"                // tu archivo local
];

document.addEventListener("DOMContentLoaded", function () {
  obtenerAgenda();
  setInterval(refrescarAgenda, 60000);
});

// Delegación para mostrar servidores
document.addEventListener("click", function (e) {
  const evento = e.target.closest(".evento");
  if (!evento) return;

  const servidores = evento.querySelector(".servidores");
  if (!servidores) return;

  const estaActivo = servidores.classList.contains("activo");

  // Oculta todos
  document.querySelectorAll(".servidores").forEach(s => s.classList.remove("activo"));

  // Solo activa si estaba cerrado
  if (!estaActivo) {
    servidores.classList.add("activo");
  }
});

function convertToUserTimeZone(utcHour) {
  const DateTime = luxon.DateTime;
  const utcDateTime = DateTime.fromISO(utcHour, { zone: "America/Lima" });
  const localDateTime = utcDateTime.toLocal();
  return localDateTime.toFormat("HH:mm");
}

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
    let misCanales = []; // Por defecto, la lista de tus canales está vacía

    // 1. INTENTAMOS CARGAR TU LISTA DE CANALES DE FORMA SEGURA
    // Si este paso falla, no detendrá la carga de la agenda.
    try {
      const misCanalesRes = await fetch('mis_canales.json');
      if (misCanalesRes.ok) {
        misCanales = await misCanalesRes.json();
      } else {
        console.warn("Nota: No se encontró 'mis_canales.json'. Se usarán los reproductores por defecto.");
      }
    } catch (err) {
      console.warn("Advertencia al procesar 'mis_canales.json'. Se usarán los reproductores por defecto.");
    }

    // 2. CARGAMOS LA AGENDA DE EVENTOS EXTERNA (TU LÓGICA ORIGINAL)
    let data = [];
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

    // El resto de tu código original se mantiene, con una pequeña modificación
    // ... (código de JSON-LD para SEO)
    const sportsEvents = data.map(ev => {
        const attr = ev.attributes;
        const dateTime = `${attr.date_diary}T${attr.diary_hour}-05:00`;
        const embedUrl = "https://futbollibretv.pages.dev" + (attr.embeds?.data[0]?.attributes?.embed_iframe || "");
        const competencia = attr.country?.data?.attributes?.name || "Fútbol Internacional";
        const description = attr.diary_description.trim().replace(/\s+/g, ' ');
        return {"@type":"SportsEvent","name":description,"startDate":dateTime,"eventStatus":"https://schema.org/EventScheduled","eventAttendanceMode":"https://schema.org/OnlineEventAttendanceMode","location":{"@type":"Place","name":competencia},"url":embedUrl,"organizer":{"@type":"Organization","name":"Fútbol Libre TV","url":"https://futbollibretv.pages.dev/"},"description":`Partido de ${competencia} transmitido gratis por Fútbol Libre TV`};
    });
    const ldScript=document.createElement('script');ldScript.type='application/ld+json';ldScript.text=JSON.stringify({"@context":"https://schema.org","@graph":sportsEvents},null,2);const oldScript=document.querySelector('script[type="application/ld+json"]');if(oldScript)oldScript.remove();document.head.appendChild(ldScript);

    menuElement.innerHTML = "";
    const dateCompleted = formatDate(new Date().toISOString());
    titleAgendaElement.textContent = "Agenda - " + dateCompleted;

    data.sort((a, b) => a.attributes.diary_hour.localeCompare(b.attributes.diary_hour));

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
          <div class="servidores" style="margin-top: 8px;">`;

      if (value.attributes.embeds && value.attributes.embeds.data.length > 0) {
        value.attributes.embeds.data.forEach((embed) => {
          const nombreServidor = embed.attributes.embed_name;

          // 3. AQUÍ ESTÁ LA LÓGICA DE DECISIÓN (LA ÚNICA MODIFICACIÓN REAL)
          const miCanal = misCanales.find(c => nombreServidor.toLowerCase().includes(c.nombre.toLowerCase()));

          if (miCanal) {
            // SI tenemos tu canal, usamos el reproductor M3U8
            const urlCodificada = btoa(miCanal.m3u8);
            html += `<a href="/embed/reproductor_m3u8.html?src=${urlCodificada}" target="_blank" class="nombre-servidor">➤ ${nombreServidor} (Calidad HD)</a>`;
          } else {
            // SI NO, usamos el reproductor original (como lo hacías antes)
            const urlDirecto = embed.attributes.embed_iframe;
            const urlCodificada = btoa(urlDirecto);
            html += `<a href="/embed/reproductor.html?r=${urlCodificada}" class="nombre-servidor">➤ ${nombreServidor}</a>`;
          }
        });
      } else {
          html += `<span class="nombre-servidor" style="color: #888; padding-left: 10px;">Próximamente...</span>`;
      }

      html += `</div></li>`;
      menuElement.innerHTML += html;
    });

  } catch (err) {
    console.error("Error al cargar la agenda:", err);
    menuElement.innerHTML = `<li style="color: red; padding: 20px;">No se pudo cargar la agenda. Intenta recargar la página.</li>`;
  }
}





