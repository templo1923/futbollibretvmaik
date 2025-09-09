async function obtenerAgenda() {
  const menuElement = document.getElementById("eventos");
  const titleAgendaElement = document.querySelector(".agenda-titulo");

  try {
    // Primero, cargamos nuestra lista de canales M3U8
    const misCanalesRes = await fetch('mis_canales.json');
    const misCanales = await misCanalesRes.json();

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
                
                // === LA MAGIA OCURRE AQUÍ ===
                // Buscamos si tenemos este canal en nuestra lista M3U8
                const miCanal = misCanales.find(c => nombreServidor.toLowerCase().includes(c.nombre.toLowerCase()));

                if (miCanal) {
                    // Si lo encontramos, usamos nuestro reproductor y nuestro enlace M3U8
                    const urlCodificada = btoa(miCanal.m3u8); // Codificamos nuestro enlace
                    html += `<a href="/embed/reproductor_m3u8.html?src=${urlCodificada}" target="_blank" class="nombre-servidor">➤ ${nombreServidor} (Calidad HD)</a>`;
                } else {
                    // Opcional: si no lo tenemos, podemos mostrar el enlace original como respaldo
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
