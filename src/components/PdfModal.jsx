import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, X, Search, Download, Loader2, Code } from 'lucide-react';

export default function PdfModal({ client, onClose }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);
  
  const [search, setSearch] = useState('');
  const [petType, setPetType] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [priceType, setPriceType] = useState('con_iva');
  
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('img_base_url') || 'https://comercialpetpro-sandy.vercel.app');
  const [enableWpp, setEnableWpp] = useState(false);
  const [wppPhone, setWppPhone] = useState('');
  
  const [selectedRefs, setSelectedRefs] = useState(new Set());

  const loadProducts = async () => {
    setLoading(true);
    try {
      let allData = [];
      let from = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('petpro_productos')
          .select('*')
          .range(from, from + limit - 1);
          
        if (error) throw error;
        
        allData = [...allData, ...data];
        
        if (data.length < limit) {
          hasMore = false;
        } else {
          from += limit;
        }
      }
      
      setProducts(allData);
      setDbLoaded(true);
    } catch (err) {
      alert('Error cargando catálogo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBaseUrlChange = (e) => {
    setBaseUrl(e.target.value);
    localStorage.setItem('img_base_url', e.target.value);
  };

  const getImgSrc = (imgUrl) => {
    if (!imgUrl) return '';
    const imgName = imgUrl.split('/').pop();
    if (!imgName) return '';
    if (baseUrl) {
      return `${baseUrl.replace(/\/$/, '')}/imagenes/${imgName}`;
    }
    return `../comercial-pet-pro/public/imagenes/${imgName}`;
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

  const clientCanales = useMemo(() => {
    return client?.canales ? client.canales.split(',').map(c => c.trim()).filter(Boolean) : [];
  }, [client]);

  const uniqueBrands = useMemo(() => {
    const brands = new Set();
    products.forEach(p => {
      const b = String(p.marca || '').trim();
      if (b) brands.add(b);
    });
    return Array.from(brands).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const searchLower = search.toLowerCase();
    
    return products.filter(item => {
      const ref = String(item.ref || '').trim();
      if (selectedRefs.size > 0 && selectedRefs.has(ref)) return true;
      if (selectedRefs.size > 0) return false;

      const name = String(item.producto || '').toLowerCase();
      const refLower = ref.toLowerCase();
      
      if (searchLower && !name.includes(searchLower) && !refLower.includes(searchLower)) return false;
      
      if (petType === 'Cat' && !(name.includes('cat') || name.includes('gato'))) return false;
      if (petType === 'Dog' && !(name.includes('dog') || name.includes('perro'))) return false;
      
      if (selectedBrand !== 'All' && String(item.marca || '').trim() !== selectedBrand) return false;
      
      if (clientCanales.length > 0) {
        const pc = String(item.canales || '').split(',').map(c => c.trim()).filter(Boolean);
        if (pc.length > 0 && !pc.some(c => clientCanales.includes(c))) return false;
      }
      return true;
    }).sort((a, b) => {
      const aPin = selectedRefs.has(String(a.ref || '').trim()) ? 1 : 0;
      const bPin = selectedRefs.has(String(b.ref || '').trim()) ? 1 : 0;
      if (bPin !== aPin) return bPin - aPin;
      const aImg = a.imagen_url ? 1 : 0;
      const bImg = b.imagen_url ? 1 : 0;
      return bImg - aImg;
    });
  }, [products, search, petType, selectedBrand, selectedRefs, clientCanales]);

  const toggleRefSelection = (ref) => {
    const next = new Set(selectedRefs);
    if (next.has(ref)) next.delete(ref);
    else next.add(ref);
    setSelectedRefs(next);
  };

  const groupProductsByFamily = () => {
    const groupsMap = new Map();
    const groupsList = [];

    filteredProducts.forEach(item => {
      const ref = String(item.ref || '').trim();
      const fullName = String(item.producto || '').trim();
      const marca = String(item.marca || 'General').trim();
      
      const regex = /(?:x\s*)?(\d+(?:\.\d+)?\s*(?:g|kg|ml|l|oz|lb)(?:rs)?)\b/i;
      const match = fullName.match(regex);
      const weight = match ? match[1].toLowerCase() : "";

      let prefix = fullName.split('-')[0].trim(); 
      prefix = prefix.replace(/\b(sabor|adulto|cachorro|filhote|carne|pollo|frango|pescado|cordero)\b/gi, '').trim();
      
      const proteins = ['tuna', 'chicken', 'salmon', 'beef', 'pollo', 'carne', 'pescado', 'cordero', 'atun', 'seafood', 'queso', 'cheese'];
      let mainProtein = '';
      const lowerName = fullName.toLowerCase();
      for (const p of proteins) {
        const regexProtein = new RegExp(`\\b${p}\\b`);
        if (regexProtein.test(lowerName)) {
          mainProtein = p.toUpperCase();
          break;
        }
      }

      const key = `${marca.toLowerCase()}|${prefix.toLowerCase()}|${weight}|${mainProtein}`;
      
      const dcto = parseFloat(item.dcto_b2b) || 0;
      
      const originalSin = parseFloat(item.precio_b2b_sin_iva) || 0;
      const originalCon = parseFloat(item.precio_b2b_con_iva) || 0;

      const originalBase = priceType === 'con_iva' ? originalCon : originalSin;
      const originalFinalNum = originalBase + originalSin * 0.05;

      const discountFinalNum = originalFinalNum * (1 - dcto);
      const hasDiscount = dcto > 0;
      
      let finalPrice = formatCurrency(discountFinalNum);
      if (hasDiscount) {
          finalPrice = `<span style="text-decoration: line-through; color: #94a3b8; font-size: 13px; margin-right: 5px;">${formatCurrency(originalFinalNum)}</span>${formatCurrency(discountFinalNum)}`;
      }
      
      let badgeHtml = '';
      if (hasDiscount) {
          const pctNumber = Math.round(dcto * 100);
          const pctText = `<span style="font-size:14px;">${pctNumber}%</span> OFF!`;
          if (enableWpp && wppPhone) {
              const phoneNum = wppPhone.replace(/\D/g, '');
              const prodMsg = `Hola, me interesa el producto ${fullName} (REF: ${ref}) que está en promoción con ${pctNumber}% OFF`;
              const itemWppUrl = `https://api.whatsapp.com/send?phone=${phoneNum}&text=${encodeURIComponent(prodMsg)}`;
              badgeHtml = `<a href="${itemWppUrl}" target="_blank" class="promo-badge promo-badge-link" style="text-decoration:none;">${pctText} <span style="font-size:10px; margin-left:4px;">📲 Pedir</span></a>`;
          } else {
              badgeHtml = `<div class="promo-badge">${pctText}</div>`;
          }
      }
      
      const imgSrc = getImgSrc(item.imagen_url);
      
      if (!groupsMap.has(key)) {
        const baseConProteina = prefix + (mainProtein ? ` - ${mainProtein}` : '');
        const newGroup = {
          marca: marca,
          nombreBase: baseConProteina + (weight ? ` x ${weight}` : ''),
          imgSrc: imgSrc,
          precioFormat: finalPrice,
          badgeHtml: badgeHtml,
          variantes: []
        };
        groupsMap.set(key, newGroup);
        groupsList.push(newGroup);
      }
      
      let sabor = fullName.replace(prefix, '').trim();
      if(sabor.startsWith('-')) sabor = sabor.substring(1).trim();
      if(!sabor) sabor = fullName; 

      groupsMap.get(key).variantes.push({ sabor, ref, nombreCompleto: fullName });
    });

    const chunkedGroupsList = [];
    groupsList.forEach(g => {
      for (let i = 0; i < g.variantes.length; i += 5) {
        chunkedGroupsList.push({ ...g, variantes: g.variantes.slice(i, i + 5) });
      }
    });

    const sectionsMap = new Map();
    chunkedGroupsList.forEach(g => {
      if (!sectionsMap.has(g.marca)) sectionsMap.set(g.marca, []);
      sectionsMap.get(g.marca).push(g);
    });

    const sections = Array.from(sectionsMap.entries()).map(([marca, prods]) => ({
      id: `marca-${marca.replace(/[^a-zA-Z0-9]/g, '_')}`,
      titulo: marca,
      productos: prods
    }));

    sections.sort((a,b) => a.titulo.localeCompare(b.titulo));
    return sections;
  };

  const buildPdfDocument = (sections) => {
    const date = new Date().toLocaleDateString('es-CO');
    const distributor = filteredProducts.length > 0 ? (filteredProducts[0].distribuidor || 'No especificado') : 'No especificado';

    let html = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Open+Sans:wght@400;600;700&display=swap');
      
      :root {
        --color-primary: #004E4A;
        --color-secondary: #54B435;
      }
      
      .pdf-body { font-family: 'Open Sans', Helvetica, Arial, sans-serif; color: #333; padding: 20px;}
      
      /* Cover & Index Block */
      .cover-container { text-align: center; padding: 40px 20px; margin-bottom: 20px; background: #f8f9fa; border-radius: 12px; border: 2px solid var(--color-primary); page-break-inside: avoid; break-inside: avoid;}
      .cover-container h1 { font-family: 'Montserrat', sans-serif; font-weight: 900; margin: 0 0 10px 0; font-size: 38px; color: var(--color-primary); text-transform: uppercase; letter-spacing: 2px;}
      .cover-container h2 { font-family: 'Montserrat', sans-serif; font-weight: 700; margin: 0; font-size: 26px; color: #2C3E50; }
      .meta-info { font-size: 14px; color: #666; margin-top: 20px; font-weight: 600; padding-top: 20px; border-top: 1px solid #dee2e6; display: inline-block;}
      
      .index-box { background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);}
      .index-box h2 { font-family: 'Montserrat', sans-serif; margin-top: 0; font-size: 20px; border-bottom: 2px solid var(--color-secondary); padding-bottom: 8px; color: var(--color-primary); }
      .index-list { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 15px;}
      .index-list li { margin: 5px 0; width: calc(33.333% - 15px); }
      .index-link { color: #2C3E50; text-decoration: none; font-weight: bold; display: block; padding: 8px 12px; background: #f8f9fa; border-radius: 4px; transition: background 0.2s;}
      .index-link:hover { background: #e9ecef; }
      .index-link span { color: var(--color-primary); }

      /* Categories & Products */
      .category-title { font-family: 'Montserrat', sans-serif; color: white; background: var(--color-primary); padding: 12px 20px; border-radius: 6px; font-size: 22px; margin-top: 30px; margin-bottom: 20px; text-transform: uppercase;}
      .products-grid { display: block; font-size: 0; margin: -10px; }
      .product-card { width: calc(50% - 20px); margin: 10px; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; display: inline-block; vertical-align: top; box-sizing: border-box; font-size: 14px; background: #fff; page-break-inside: avoid; break-inside: avoid; }
      .product-main { display: table; width: 100%; margin-bottom: 12px; }
      .product-img-wrapper { display: table-cell; width: 90px; vertical-align: top; }
      .product-img { width: 80px; height: 80px; object-fit: contain; border: 1px solid #eee; border-radius: 6px; padding: 2px;}
      .no-img { font-size: 30px; opacity: 0.2; width: 80px; text-align:center; line-height:80px; border: 1px solid #eee; border-radius: 6px;}
      .product-details { display: table-cell; vertical-align: top; padding-left: 15px; }
      .product-details.has-discount { padding-right: 75px; }
      .product-brand { font-size: 11px; text-transform: uppercase; color: #888; font-weight: bold; margin: 0; letter-spacing: 0.5px;}
      .product-name { font-size: 15px; margin: 4px 0; font-weight: bold; line-height: 1.2; color: #2C3E50;}
      .product-price { font-size: 18px; color: var(--color-secondary); font-weight: bold; margin: 6px 0 0 0; }
      .promo-badge { position: absolute; top: 0; right: 0; background-color: #e11d48; color: white; font-size: 11px; font-weight: 900; padding: 4px 8px; border-radius: 0 8px 0 8px; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: inline-block; }
      .promo-badge-link:hover { background-color: #be123c; }
      .variants-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      .variants-table th { font-size: 11px; color: #666; text-align: left; padding-bottom: 5px; border-bottom: 1px solid #eee; text-transform: uppercase;}
      .variant-row { border-bottom: 1px solid #f1f3f5; }
      .variant-row:last-child { border-bottom: none; }
      .variant-name { font-size: 12px; padding: 6px 0; color: #2C3E50; }
      .variant-ref { font-size: 11px; color: #868e96; font-family: monospace; }
      .wpp-general-banner { text-align: center; margin: 15px 0; page-break-inside: avoid; break-inside: avoid;}
      .wpp-general-banner a { display: inline-block; background-color: var(--color-secondary); color: white; text-decoration: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      
      @media print {
        @page { margin: 15mm; size: letter portrait; }
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    </style>
    <div class="pdf-body">
      <div class="cover-container">
        <h1>CATÁLOGO B2B</h1>
        <h2>${client.negocio}</h2>
        <div class="meta-info">
          Distribuidor: <strong>${distributor}</strong> &nbsp;|&nbsp; 
          Generado: <strong>${date}</strong>
        </div>
      </div>
      <div class="index-box">
        <h2>Índice de Marcas</h2>
        <ul class="index-list">
    `;

    let wppBannerHtml = '';
    if (enableWpp && wppPhone) {
      let phoneNum = wppPhone.replace(/\D/g, '');
      const msg = `Hola ${client.negocio}, bienvenido al Canal de pedidos y comunicación de Vitalpets, ¿en qué podemos ayudarte?`;
      const wppUrl = `https://api.whatsapp.com/send?phone=${phoneNum}&text=${encodeURIComponent(msg)}`;
      wppBannerHtml = `<div class="wpp-general-banner"><a href="${wppUrl}" target="_blank">💬 Contactar a Vitalpets por WhatsApp</a></div>`;
    }

    sections.forEach(sec => {
      html += `<li><a href="#${sec.id}" class="index-link"><span>${sec.titulo}</span></a></li>`;
    });
    html += `</ul></div>`;

    sections.forEach((sec, index) => {
      html += `
      <div id="${sec.id}">
        ${wppBannerHtml}
        <div class="category-title">${sec.titulo}</div>
        <div class="products-grid">
      `;

      sec.productos.forEach(prod => {
        const imgHtml = prod.imgSrc ? `<img class="product-img" src="${prod.imgSrc}" crossorigin="anonymous">` : `<div class="no-img">📦</div>`;
        html += `
        <div class="product-card" style="position: relative;">
          ${prod.badgeHtml || ''}
          <div class="product-main">
            <div class="product-img-wrapper">${imgHtml}</div>
            <div class="product-details ${prod.badgeHtml ? 'has-discount' : ''}">
              <p class="product-brand">${prod.marca}</p>
              <h3 class="product-name">${prod.nombreBase}</h3>
              <p class="product-price">${prod.precioFormat}</p>
            </div>
          </div>
        `;
        
        if (prod.variantes.length > 1) {
          html += `
          <table class="variants-table">
            <thead>
              <tr><th>Variante / Sabor</th></tr>
            </thead>
            <tbody>
          `;
          prod.variantes.forEach(v => {
            html += `
            <tr class="variant-row">
              <td class="variant-name">
                <strong>${v.sabor}</strong><br>
                <span class="variant-ref">REF: ${v.ref}</span>
              </td>
            </tr>
            `;
          });
          html += `</tbody></table>`;
        } else {
          html += `<p class="variant-ref" style="margin-top:auto">REF: ${prod.variantes[0].ref}</p>`;
        }
        html += `</div>`; 
      });
      html += `</div>${wppBannerHtml}</div>`; 
    });
    html += `</div>`; 
    return html;
  };

  const getHtmlContent = () => {
    if (filteredProducts.length === 0) return null;
    const sections = groupProductsByFamily();
    const htmlContent = buildPdfDocument(sections);
    const filename = `Catalogo_${client.negocio.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${filename}</title>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
  };

  const handlePrintPdf = () => {
    const htmlString = getHtmlContent();
    if (!htmlString) return alert('No hay productos para exportar');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Habilita los pop-ups para generar el PDF');

    printWindow.document.write(htmlString);
    printWindow.document.write(`<script>window.onload = () => setTimeout(() => window.print(), 500);</script>`);
    printWindow.document.close();
  };

  const handleDownloadHtml = () => {
    const htmlString = getHtmlContent();
    if (!htmlString) return alert('No hay productos para exportar');

    const filename = `Catalogo_${client.negocio.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col relative animate-in zoom-in-95 overflow-hidden">
        
        <div className="bg-[#004E4A] text-white p-4 sm:p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg sm:text-2xl font-black flex items-center gap-2 font-['Montserrat']"><FileText /> Generador de Catálogo</h2>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1">Cliente: {client.negocio} | NIT: {client.cc_nit}</p>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white bg-[#003B38] hover:bg-[#002826] p-2 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="bg-[#FFF3CD] text-[#856404] px-6 py-2 text-xs font-bold text-center border-b border-[#FFEEBA]">
          ⚠️ Para imprimir o guardar como PDF correctamente en el navegador: Activa "Gráficos de fondo" y desactiva "Encabezados y pies de página" en los ajustes de impresión.
        </div>

        <div className="p-6 overflow-y-auto flex-grow bg-slate-50 flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/3 bg-white p-5 rounded-2xl border border-slate-200 h-fit space-y-4">
            <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider border-b pb-2">Parámetros de Exportación</h3>
            
            <div className="bg-[#F8F9FA] p-3 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">1. Base de Datos (Supabase)</label>
              <button onClick={loadProducts} disabled={loading} className="w-full py-2 bg-[#004E4A] text-white text-xs font-bold rounded-lg hover:bg-[#003B38] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Cargar Catálogo'}
              </button>
              {dbLoaded && <p className="text-[10px] text-emerald-600 font-bold text-center">✅ Cargado ({products.length} productos)</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Buscar / Seleccionar</label>
              <input 
                type="text" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#004E4A]" 
                placeholder="Buscar nombre o ref..." 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mascota</label>
                <select value={petType} onChange={e => setPetType(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#004E4A]">
                  <option value="All">Todos</option>
                  <option value="Dog">Perros</option>
                  <option value="Cat">Gatos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Precios a Mostrar</label>
                <select value={priceType} onChange={e => setPriceType(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#004E4A]">
                  <option value="con_iva">Con IVA</option>
                  <option value="sin_iva">Sin IVA</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Marca</label>
              <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#004E4A]">
                <option value="All">Todas las Marcas</option>
                {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">URL Base de Imágenes</label>
                <input 
                  type="text" 
                  value={baseUrl} 
                  onChange={handleBaseUrlChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#004E4A]" 
                />
              </div>
              
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                <input type="checkbox" checked={enableWpp} onChange={e => setEnableWpp(e.target.checked)} className="w-4 h-4 accent-[#54B435]" />
                Enlaces de WhatsApp
              </label>
              
              {enableWpp && (
                <input 
                  type="text" 
                  value={wppPhone} 
                  onChange={e => setWppPhone(e.target.value)} 
                  placeholder="Ej: 573001234567"
                  className="w-full px-3 py-2 bg-[#F6FDF4] border border-[#C3E8B5] text-[#1E3F13] rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#54B435]" 
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 pt-4">
              <button onClick={handlePrintPdf} disabled={!dbLoaded} className="w-full py-3 bg-[#004E4A] hover:bg-[#003B38] text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                <FileText size={18} /> Imprimir / PDF
              </button>
              
              <button onClick={handleDownloadHtml} disabled={!dbLoaded} className="w-full py-3 bg-white hover:bg-slate-50 border-2 border-[#54B435] text-[#429029] font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                <Code size={18} /> Descargar HTML
              </button>
            </div>
          </div>

          <div className="w-full lg:w-2/3 bg-white p-5 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider border-b pb-2 mb-4 flex justify-between">
              <span>Vista Previa del Catálogo</span>
              <span className="text-[#004E4A]">{filteredProducts.length} Productos</span>
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {!dbLoaded ? (
                <div className="col-span-full text-center text-slate-400 py-10 text-sm">Carga el catálogo de Supabase para generar la vista previa.</div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full text-center text-slate-400 py-10 text-sm">No se encontraron productos.</div>
              ) : (
                filteredProducts.slice(0, 50).map(item => {
                  const ref = item.ref || '';
                  const isPinned = selectedRefs.has(ref);
                  const dcto = parseFloat(item.dcto_b2b) || 0;
                  const originalSin = parseFloat(item.precio_b2b_sin_iva) || 0;
                  const originalCon = parseFloat(item.precio_b2b_con_iva) || 0;

                  const originalBase = priceType === 'con_iva' ? originalCon : originalSin;
                  const originalFinalNum = originalBase + originalSin * 0.05;

                  const discountFinalNum = originalFinalNum * (1 - dcto);
                  const hasDiscount = dcto > 0;
                  const imgSrc = getImgSrc(item.imagen_url);

                  return (
                    <div key={ref} onClick={() => toggleRefSelection(ref)} className={`bg-white border p-4 rounded-xl text-center cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${isPinned ? 'border-[#54B435] bg-[#F6FDF4] shadow-sm' : 'border-slate-200 hover:border-[#004E4A]'}`}>
                      {hasDiscount && (
                        <div className="absolute top-0 right-0 bg-[#e11d48] text-white text-[10px] font-black px-2 py-0.5 rounded-bl-lg shadow-sm z-10">
                          <span style={{ fontSize: '13px' }}>{Math.round(dcto * 100)}%</span> OFF!
                        </div>
                      )}
                      <div className={hasDiscount ? "pr-[60px]" : ""}>
                        <div className="h-20 flex items-center justify-center mb-3">
                          {imgSrc ? <img src={imgSrc} className="max-h-full max-w-full object-contain" /> : <span className="text-slate-300 text-3xl">📦</span>}
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{item.marca || 'General'}</p>
                        <h3 className="text-xs font-bold text-[#2C3E50] my-1 line-clamp-2 leading-tight">{item.producto}</h3>
                      </div>
                      <p className="text-[#54B435] font-black mt-2 text-sm">
                        {hasDiscount && <span className="line-through text-slate-400 text-[10px] mr-1">{formatCurrency(originalFinalNum)}</span>}
                        {formatCurrency(discountFinalNum)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
