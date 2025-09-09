async function obtenerAgenda() {
  const menuElement = document.getElementById("eventos");
  const titleAgendaElement = document.querySelector(".agenda-titulo");

  try {
    let misCanales = []; // Empezamos con una lista vacía por defecto

    // INTENTAMOS cargar tu lista de canales M3U8, pero sin que detenga el resto del código
    try {
      const misCanalesRes = await fetch('mis_canales.json');
      if (misCanalesRes.ok) { // Nos aseguramos de que el archivo se encontró
        misCanales = await misCanalesRes.json();
      } else {
        console.warn("Advertencia: El archivo 'mis_canales.json' no se encontró. Se usarán los enlaces por defecto.");
      }
    } catch (err) {
      console.error("Error al cargar 'mis_canales.json'. Se usarán los enlaces por defecto.", err);
    }

    // AHORA, continuamos cargando la agenda de eventos como siempre
    let data = [];
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

    menuElement.innerHTML = "";
    titleAgendaElement.textContent = "Agenda - " + formatDate(new Date().toISOString());
    
    data.sort((a, b) => a.attributes.diary_hour.localeCompare(b.attributes.diary_hour));

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

        if (embeds && embeds.data.length > 0) {
            embeds.data.forEach((embed) => {
                const nombreServidor = embed.attributes.embed_name;
                
                // Buscamos si tenemos este canal en nuestra lista M3U8
                const miCanal = misCanales.find(c => nombreServidor.toLowerCase().includes(c.nombre.toLowerCase()));

                if (miCanal) {
                    // Si lo encontramos, usamos nuestro reproductor y nuestro enlace M3U8
                    const urlCodificada = btoa(miCanal.m3u8);
                    html += `<a href="/embed/reproductor_m3u8.html?src=${urlCodificada}" target="_blank" class="nombre-servidor">➤ ${nombreServidor} (Calidad HD)</a>`;
                } else {
                    // Si no lo tenemos, usamos el enlace original como respaldo
                    const urlDirecto = embed.attributes.embed_iframe;
                    const urlCodificada = btoa(urlDirecto);
                    html += `<a href="/embed/reproductor.html?r=${urlCodificada}" target="_blank" class="nombre-servidor">➤ ${nombreServidor}</a>`;
                }
            });
        } else {
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
