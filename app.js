document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const itemTypeSelect = document.getElementById('item-type');
    const typeUnitEls = document.querySelectorAll('.type-unit');
    const typeAreaEls = document.querySelectorAll('.type-area');
    const addItemBtn = document.getElementById('add-item-btn');
    const itemsTbody = document.getElementById('items-tbody');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');

    let items = [];

    // Formatear moneda y números
    const formatMoney = (amount) => {
        return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
        }
        return dateString;
    };

    // Sincronizar datos generales
    const syncData = () => {
        document.getElementById('disp-client-name').textContent = document.getElementById('client-name').value.toUpperCase();
        document.getElementById('disp-client-id').textContent = document.getElementById('client-id').value;
        document.getElementById('disp-quote-num').textContent = document.getElementById('quote-number').value;
        document.getElementById('disp-date').textContent = formatDate(document.getElementById('quote-date').value);
        document.getElementById('disp-valid').textContent = formatDate(document.getElementById('quote-valid').value);
    };

    ['client-name', 'client-id', 'quote-number', 'quote-date', 'quote-valid'].forEach(id => {
        document.getElementById(id).addEventListener('input', syncData);
    });

    // Establecer fecha de hoy por defecto
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('quote-date').value = today;
    
    // Fecha válido hasta (7 días por defecto)
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 7);
    document.getElementById('quote-valid').value = validDate.toISOString().split('T')[0];
    syncData();

    // Alternar campos según tipo de cotización
    itemTypeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'unit') {
            typeUnitEls.forEach(el => el.classList.remove('hidden'));
            typeAreaEls.forEach(el => el.classList.add('hidden'));
        } else {
            typeUnitEls.forEach(el => el.classList.add('hidden'));
            typeAreaEls.forEach(el => el.classList.remove('hidden'));
        }
    });

    // Añadir Ítem
    addItemBtn.addEventListener('click', () => {
        const type = itemTypeSelect.value;
        const code = document.getElementById('item-code').value;
        let desc = document.getElementById('item-desc').value;
        
        let qty = 0;
        let price = 0;
        let subtotal = 0;

        if (type === 'unit') {
            qty = parseFloat(document.getElementById('item-qty').value) || 0;
            price = parseFloat(document.getElementById('item-price').value) || 0;
            subtotal = qty * price;
        } else {
            const length = parseFloat(document.getElementById('item-length').value) || 0;
            const width = parseFloat(document.getElementById('item-width').value) || 0;
            price = parseFloat(document.getElementById('item-price-m2').value) || 0;
            
            qty = length * width; // Area in m2
            subtotal = qty * price;
            
            // Añadir dimensiones a la descripción
            if(length > 0 && width > 0) {
                desc += `\n(Medidas: ${length}m x ${width}m)`;
            }
        }

        if (!desc.trim()) {
            alert('La descripción no puede estar vacía');
            return;
        }

        const item = {
            id: Date.now(),
            code,
            desc: desc.replace(/\n/g, '<br>'),
            qty,
            price,
            subtotal
        };

        items.push(item);
        renderTable();
        clearItemForm();
    });

    // Renderizar la tabla de ítems
    const renderTable = () => {
        itemsTbody.innerHTML = '';
        let totalSub = 0;

        items.forEach((item, index) => {
            totalSub += item.subtotal;
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td class="center">${item.code}</td>
                <td>
                    ${item.desc}
                    <button class="delete-btn no-print" onclick="deleteItem(${item.id})">Eliminar</button>
                </td>
                <td class="center">${item.qty % 1 !== 0 ? item.qty.toFixed(2) : item.qty}</td>
                <td class="right">${formatMoney(item.price)}</td>
                <td class="right">${formatMoney(item.subtotal)}</td>
                <td class="center">18%</td>
                <td class="right">${index === items.length - 1 ? formatMoney(totalSub * 1.18) : ''}</td> 
            `;
            // En el PDF la última columna parece mostrar el total general, o estar vacía hasta el final.
            // Lo dejaremos vacío y el total general va en la tabla de abajo.
            tr.children[6].innerHTML = ''; // Vaciar la última columna para seguir el formato exacto

            itemsTbody.appendChild(tr);
        });

        // Completar con filas vacías para mantener el diseño (min 10 filas)
        const emptyRows = Math.max(0, 15 - items.length);
        for(let i=0; i<emptyRows; i++) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            `;
            itemsTbody.appendChild(tr);
        }

        // Calcular totales
        const igv = totalSub * 0.18;
        const total = totalSub + igv;

        document.getElementById('disp-subtotal').textContent = formatMoney(totalSub);
        document.getElementById('disp-igv').textContent = formatMoney(igv);
        document.getElementById('disp-total').textContent = formatMoney(total);
    };

    // Exponer deleteItem al scope global para el onClick
    window.deleteItem = (id) => {
        items = items.filter(item => item.id !== id);
        renderTable();
    };

    const clearItemForm = () => {
        document.getElementById('item-code').value = '';
        document.getElementById('item-desc').value = '';
        document.getElementById('item-qty').value = '1';
        document.getElementById('item-price').value = '0.00';
        document.getElementById('item-length').value = '0';
        document.getElementById('item-width').value = '0';
        document.getElementById('item-price-m2').value = '0.00';
    };

    // Inicializar tabla vacía
    renderTable();

    // Generar PDF
    downloadPdfBtn.addEventListener('click', () => {
        const element = document.getElementById('pdf-content');
        const opt = {
            margin:       0,
            filename:     `Cotizacion_${document.getElementById('quote-number').value}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'px', format: [794, 1123], orientation: 'portrait' }
        };

        // Ocultar botones de eliminar temporalmente
        const deleteBtns = document.querySelectorAll('.delete-btn');
        deleteBtns.forEach(btn => btn.style.display = 'none');

        // Generar
        window.html2canvas(element, opt.html2canvas).then(canvas => {
            const imgData = canvas.toDataURL('image/jpeg', opt.image.quality);
            const pdf = new window.jspdf.jsPDF(opt.jsPDF);
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(opt.filename);

            // Restaurar botones
            deleteBtns.forEach(btn => btn.style.display = 'inline-block');
        });
    });
});
