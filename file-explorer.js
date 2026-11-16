function explorerIcon(filename) {
  return `<img class="fw-asset-icon" src="icons/${filename}" alt="">`;
}

function explorerFileIcon(item, fallback) {
  if (item.icon === 'image') {
    return '<svg class="fw-asset-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.5" y="1.5" width="11" height="13" rx="1" fill="#fff" stroke="#a0a0a0"/><circle cx="10.5" cy="5" r="1.5" fill="#eab85d"/><path d="m4 12 3-4 2 2 1-1 2 3" stroke="#74a3a6" stroke-width=".8"/></svg>';
  }
  const assets = {
    folder: 'Folder in left menu.png',
    pdf: 'PDF.png',
    word: 'Word.png',
    excel: 'excel.png',
    ppt: 'ppt.png',
  };
  return Object.hasOwn(assets, item.icon) ? explorerIcon(assets[item.icon]) : fallback;
}

function appendExplorerGroup(list, name) {
  const heading = document.createElement('div');
  heading.className = 'fw-list-group';
  heading.innerHTML = '<span class="fw-chevron fw-chevron-down"></span>';
  heading.appendChild(document.createTextNode(name));
  list.appendChild(heading);
}

const explorerSelections = new WeakMap();

function createFileDragStack(items) {
  const stack = document.createElement('div');
  stack.className = 'drag-icon-stack';
  const types = new Set();
  const imageOnly = items.every(item => /\.(jpe?g|png|gif|webp|heic|avif)$/i.test(item.name));
  const previews = items.filter(item => {
    const extension = item.name.split('.').pop().toLowerCase();
    const type = /^(jpg|jpeg|png|gif|webp|heic|avif)$/.test(extension) ? 'image' : extension;
    if (!imageOnly && types.has(type)) return false;
    types.add(type);
    return true;
  }).slice(0, 3);
  stack.classList.toggle('drag-icon-stack-mixed', previews.length > 1);
  stack.classList.toggle('drag-icon-stack-images', imageOnly);
  // Paint the primary file last so it stays in front of the other file types.
  previews.reverse().forEach((item, index) => {
    const layer = document.createElement('div');
    layer.className = 'drag-icon-item';
    layer.style.setProperty('--stack-offset', `${(previews.length - 1 - index) * (imageOnly ? 5.2 : 6.375)}px`);
    layer.setAttribute('aria-label', item.name);
    if (item.thumb) {
      const image = document.createElement('img');
      image.src = item.thumb;
      image.style.cssText = 'object-fit:cover;border-radius:4px;';
      layer.appendChild(image);
    } else {
      layer.innerHTML = item.iconHtml;
      const svg = layer.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', '64');
        svg.setAttribute('height', '64');
      }
    }
    stack.appendChild(layer);
  });
  return stack;
}

function composerFileCategory(file) {
  const known = Object.values(FOLDER_DATA).flat().find(item => item.name === file.name && item.category);
  if (known) return known.category;
  const name = file.name.toLowerCase();
  const bill = /bill|invoice|receipt|expense/.test(name);
  const report = /report|lab(?:[_ -]|$)|chem\d|result/.test(name);
  const hospital = /medical|hospital|clinic|pharmacy|apollo|lab[_ -]?report|chem\d/.test(name);
  if (hospital) return bill && !report ? 'hospital-bill' : 'hospital-report';
  if (bill) return 'bill';
  if (report) return 'report';
  return /\.(jpe?g|png|gif|webp|heic|avif)$/i.test(name) ? 'image' : 'document';
}

function inferComposerFolderName(files) {
  const categories = files.map(composerFileCategory);
  if (categories.some(category => category.startsWith('hospital-'))) {
    return categories.some(category => category === 'hospital-report' || category === 'report')
      ? 'hospital bills and reports' : 'hospital bills';
  }
  if (categories.every(category => category === 'image')) return 'Photos';
  if (categories.every(category => category === 'bill')) return 'Bills and invoices';
  return 'Organized files';
}

function explorerFileDetails(file) {
  const extension = file.name.match(/\.([^.]+)$/)?.[1].toLowerCase() || '';
  const formats = {
    pdf: ['PDF Document', 'pdf'],
    doc: ['Microsoft Word Document', 'word'], docx: ['Microsoft Word Document', 'word'],
    xls: ['Microsoft Excel Sheet', 'excel'], xlsx: ['Microsoft Excel Sheet', 'excel'],
    ppt: ['Microsoft PowerPoint', 'ppt'], pptx: ['Microsoft PowerPoint', 'ppt'],
    jpg: ['JPEG Image', 'image'], jpeg: ['JPEG Image', 'image'], png: ['PNG Image', 'image'],
    gif: ['GIF Image', 'image'], webp: ['WebP Image', 'image'], bmp: ['Bitmap Image', 'image'],
    heic: ['HEIC Image', 'image'], avif: ['AVIF Image', 'image'],
    txt: ['Text Document', 'text'], md: ['Markdown Document', 'text'],
    csv: ['CSV File', 'excel'], zip: ['ZIP Archive', 'text'],
  };
  const [type, icon] = Object.hasOwn(formats, extension) ? formats[extension]
    : [file.type || (extension ? `${extension.toUpperCase()} File` : 'File'), file.icon || 'text'];
  const modified = Number.isFinite(file.lastModified) ? new Date(file.lastModified) : null;
  const date = file.date || (modified
    ? `${modified.getMonth() + 1}/${modified.getDate()}/${modified.getFullYear()} ${modified.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : 'Not available');
  const size = typeof file.size === 'number'
    ? `${Math.ceil(file.size / 1024).toLocaleString('en-US')} KB`
    : file.size || 'Not available';
  return { date, type, size, icon };
}

function createComposerDesktopFolder(query, files, { copy = false } = {}) {
  if (!files.length) throw new Error('Attach files before creating a folder.');
  if (files.some(file => file.kind === 'folder')) throw new Error('Select files rather than folders for this action.');
  const named = query.match(/\bfolder\s+(?:(?:named|called)\s+)?(?:"([^"]+)"|'([^']+)')/i)
    || query.match(/\bfolder\s+(?:named|called)\s+(.+?)(?=,|[.;]| and (?:move|put|rename)|$)/i);
  const requestedName = named ? named[1] || named[2] : inferComposerFolderName(files);
  if (!requestedName.trim() || /[<>:"/\\|?*\u0000-\u001f]/.test(requestedName)
      || /[. ]$/.test(requestedName) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(requestedName)) {
    throw new Error('Use a valid Windows folder name without reserved characters.');
  }
  const desktop = document.getElementById('desktop-icons');
  const desktopIcons = [...desktop.querySelectorAll('.d-icon')];
  const taken = name => Object.keys(FOLDER_DATA).some(folder => folder.toLowerCase() === name.toLowerCase())
    || desktopIcons.some(icon => icon.querySelector('span:last-child').textContent.toLowerCase() === name.toLowerCase());
  let name = requestedName, suffix = 2;
  while (taken(name)) name = `${requestedName} (${suffix++})`;
  const currentFolder = document.getElementById('folder-window').dataset.folder;
  const folders = [...new Set([currentFolder, ...Object.keys(FOLDER_DATA)])]
    .filter(folder => folder && folder !== 'Home' && folder !== 'This PC');
  const rename = /\brename\b/i.test(query);
  const moves = files.map((file, index) => {
    const source = copy ? undefined : folders.find(folder => FOLDER_DATA[folder].some(item => item.name === file.name));
    const original = source && FOLDER_DATA[source].find(item => item.name === file.name);
    const extension = file.name.match(/\.[^.]+$/)?.[0] || '';
    const category = composerFileCategory(file);
    const label = !named && category.startsWith('hospital-')
      ? category === 'hospital-bill' ? 'Hospital bill' : 'Hospital report'
      : requestedName;
    const renamed = rename
      ? `${label} ${String(index + 1).padStart(2, '0')}${extension}`
      : file.name;
    const desktopIcon = copy ? undefined : desktopIcons.find(icon => icon.querySelector('span:last-child').textContent === file.name);
    return {
      source, original, index: original ? FOLDER_DATA[source].indexOf(original) : -1,
      desktopIcon,
      item: {
        ...original,
        ...explorerFileDetails({ ...file, ...original, name: renamed }),
        name: renamed, displayName: renamed, category, group: undefined, thumb: file.thumb || original?.thumb,
      },
    };
  });
  const folderIcon = document.createElement('div');
  folderIcon.className = 'd-icon';
  folderIcon.tabIndex = 0;
  folderIcon.setAttribute('role', 'button');
  folderIcon.setAttribute('aria-label', `Open ${name}`);
  folderIcon.innerHTML = '<span class="sel-tick" aria-hidden="true">&#10003;</span><div class="folder-thumb"></div><span></span>';
  folderIcon.lastElementChild.textContent = name;
  let x = 12, y = 16;
  const remainingIcons = desktopIcons.filter(icon => !moves.some(move => move.desktopIcon === icon));
  while (remainingIcons.some(icon => Math.abs(parseInt(icon.style.left) - x) < 76 && Math.abs(parseInt(icon.style.top) - y) < 90)) {
    x += 88;
    if (x + 76 > desktop.clientWidth) { x = 12; y += 100; }
  }
  folderIcon.dataset.x = x;
  folderIcon.dataset.y = y;
  folderIcon.style.left = `${x}px`;
  folderIcon.style.top = `${y}px`;
  window._bindDesktopIcon(folderIcon);
  folderIcon.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); openFolder(name); }
  });
  const folderItem = { name, date: '', type: 'Folder', size: '', icon: 'folder' };
  Object.defineProperty(FOLDER_DATA, name, { value: moves.map(move => move.item), configurable: true, enumerable: true, writable: true });
  moves.forEach(move => {
    if (move.original) FOLDER_DATA[move.source].splice(FOLDER_DATA[move.source].indexOf(move.original), 1);
    if (move.desktopIcon) move.desktopIcon.remove();
    if (move.source !== 'Desktop') {
      const desktopIndex = FOLDER_DATA.Desktop.findIndex(item => item.name === move.original?.name);
      if (move.desktopIcon && desktopIndex >= 0) {
        move.desktopItem = FOLDER_DATA.Desktop.splice(desktopIndex, 1)[0];
        move.desktopIndex = desktopIndex;
      }
    }
  });
  FOLDER_DATA.Desktop.push(folderItem);
  desktop.appendChild(folderIcon);
  if (currentFolder && document.getElementById('folder-window').classList.contains('open')) openFolder(currentFolder);
  let undone = false;
  return {
    name,
    icon: folderIcon,
    undo() {
      if (undone) return;
      const contents = FOLDER_DATA[name];
      if (!contents || contents.length !== moves.length || contents.some(item => !moves.some(move => move.item === item))
          || moves.some(move => move.source && !Object.hasOwn(FOLDER_DATA, move.source))) {
        throw new Error('The folder has changed. Its contents cannot be restored automatically.');
      }
      undone = true;
      moves.slice().sort((a, b) => a.index - b.index).forEach(move => {
        if (move.original) FOLDER_DATA[move.source].splice(move.index, 0, move.original);
        if (move.desktopItem) FOLDER_DATA.Desktop.splice(move.desktopIndex, 0, move.desktopItem);
        if (move.desktopIcon) desktop.appendChild(move.desktopIcon);
      });
      delete FOLDER_DATA[name];
      FOLDER_DATA.Desktop.splice(FOLDER_DATA.Desktop.indexOf(folderItem), 1);
      window._deselectDesktopIcon(folderIcon);
      folderIcon.remove();
      moves.forEach(move => {
        if (move.item.thumb?.startsWith('blob:') && !Object.values(FOLDER_DATA).flat().some(item => item.thumb === move.item.thumb)) {
          URL.revokeObjectURL(move.item.thumb);
        }
      });
      const activeFolder = document.getElementById('folder-window').dataset.folder;
      if (document.getElementById('folder-window').classList.contains('open')) openFolder(activeFolder === name ? 'Desktop' : activeFolder);
    },
  };
}

function createExplorerSelection(list, status) {
  explorerSelections.get(list)?.dispose();
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const selectedItems = new Set();
  const entries = [];
  let anchor = null;
  let press = null;
  let marquee = null;
  let frame = 0;
  let suppressClick = false;
  let clickTimer = 0;
  const box = document.createElement('div');
  box.className = 'fw-selection-box';
  box.hidden = true;
  document.body.appendChild(box);
  list.tabIndex = 0;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-multiselectable', 'true');

  function setSelected(entry, selected) {
    entry.element.classList.toggle('selected', selected);
    entry.element.setAttribute('aria-selected', String(selected));
    entry.checkbox.setAttribute('aria-checked', String(selected));
    if (selected) selectedItems.add(entry.item);
    else selectedItems.delete(entry.item);
  }
  function updateStatus() {
    const count = selectedItems.size;
    const visible = entries.filter(entry => !entry.element.hidden).length;
    status.textContent = count
      ? `${count} item${count === 1 ? '' : 's'} selected`
      : `${visible} item${visible === 1 ? '' : 's'}`;
  }
  function select(entry, event) {
    if (event.shiftKey && anchor && !anchor.element.hidden) {
      const visible = entries.filter(candidate => !candidate.element.hidden);
      const start = visible.indexOf(anchor);
      const end = visible.indexOf(entry);
      const range = visible.slice(Math.min(start, end), Math.max(start, end) + 1);
      entries.forEach(candidate => setSelected(candidate,
        range.includes(candidate) || ((event.ctrlKey || event.metaKey) && selectedItems.has(candidate.item))));
    } else {
      setSelected(entry, !selectedItems.has(entry.item));
      anchor = entry;
    }
    updateStatus();
  }
  function bind(element, item) {
    const checkbox = element.querySelector('.fw-row-check, .fw-thumb-check');
    const entry = { element, item, checkbox };
    entries.push(entry);
    element.tabIndex = 0;
    element.setAttribute('role', 'option');
    checkbox.textContent = '';
    checkbox.tabIndex = 0;
    checkbox.setAttribute('role', 'checkbox');
    checkbox.setAttribute('aria-label', `Select ${item.displayName || item.name}`);
    setSelected(entry, false);
    checkbox.addEventListener('mousedown', event => event.stopPropagation(), options);
    checkbox.addEventListener('click', event => {
      event.stopPropagation();
      select(entry, event);
    }, options);
    checkbox.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        select(entry, event);
      }
    }, options);
    element.addEventListener('click', event => {
      select(entry, event);
    }, options);
    element.addEventListener('keydown', event => {
      if (event.target === element && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
        select(entry, event);
      }
    }, options);
  }
  function bounds() {
    const rect = list.getBoundingClientRect();
    const viewport = list.closest('.fw-content-area').getBoundingClientRect();
    return {
      left: Math.max(rect.left + list.clientLeft, viewport.left),
      right: Math.min(rect.left + list.clientLeft + list.clientWidth, viewport.right),
      top: Math.max(rect.top + list.clientTop, viewport.top),
      bottom: Math.min(rect.top + list.clientTop + list.clientHeight, viewport.bottom),
    };
  }
  function updateMarquee() {
    if (!marquee?.active) return;
    const rect = list.getBoundingClientRect();
    const clip = bounds();
    const x = Math.max(clip.left, Math.min(marquee.x, clip.right)) - rect.left + list.scrollLeft;
    const y = Math.max(clip.top, Math.min(marquee.y, clip.bottom)) - rect.top + list.scrollTop;
    const left = Math.min(marquee.startX, x), right = Math.max(marquee.startX, x);
    const top = Math.min(marquee.startY, y), bottom = Math.max(marquee.startY, y);
    const screenLeft = Math.max(clip.left, rect.left + left - list.scrollLeft);
    const screenTop = Math.max(clip.top, rect.top + top - list.scrollTop);
    box.hidden = false;
    box.style.left = `${screenLeft}px`;
    box.style.top = `${screenTop}px`;
    box.style.width = `${Math.max(0, Math.min(clip.right, rect.left + right - list.scrollLeft) - screenLeft)}px`;
    box.style.height = `${Math.max(0, Math.min(clip.bottom, rect.top + bottom - list.scrollTop) - screenTop)}px`;
    entries.forEach(entry => {
      const row = entry.element.getBoundingClientRect();
      const rowLeft = row.left - rect.left + list.scrollLeft;
      const rowTop = row.top - rect.top + list.scrollTop;
      const hit = !entry.element.hidden && row.width > 0 && rowLeft < right && rowLeft + row.width > left &&
        rowTop < bottom && rowTop + row.height > top;
      setSelected(entry, hit || (marquee.additive && marquee.before.has(entry.item)));
    });
    updateStatus();
  }
  function autoScroll() {
    if (!marquee?.active) return;
    const clip = bounds();
    const delta = marquee.y < clip.top + 24 ? -12 : marquee.y > clip.bottom - 24 ? 12 : 0;
    if (delta) list.scrollTop += delta;
    updateMarquee();
    frame = requestAnimationFrame(autoScroll);
  }
  function finishMarquee(restore = false) {
    if (!marquee) return;
    if (restore) {
      entries.forEach(entry => setSelected(entry, marquee.before.has(entry.item)));
      updateStatus();
    }
    suppressClick = marquee.active;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { suppressClick = false; }, 0);
    marquee = null;
    cancelAnimationFrame(frame);
    box.hidden = true;
  }
  const content = list.closest('.fw-content-area');
  content.addEventListener('mousedown', event => {
    press = {
      x: event.clientX, y: event.clientY,
    };
    if (event.button !== 0 || event.target.closest('.fw-list-header, .fw-thumb-item, .fw-row-check, button, input')) return;
    if (event.target.closest('.fw-col-name') && event.target.closest('.fw-file-icon, .fw-file-name')) return;
    const clip = bounds();
    const viewport = content.getBoundingClientRect();
    if (event.clientX >= viewport.left + content.clientWidth || event.clientY >= clip.bottom ||
        event.clientY < clip.top) return;
    event.preventDefault();
    event.stopPropagation();
    list.focus({ preventScroll: true });
    const rect = list.getBoundingClientRect();
    marquee = {
      startX: Math.max(clip.left, Math.min(event.clientX, clip.right)) - rect.left + list.scrollLeft,
      startY: event.clientY - rect.top + list.scrollTop,
      pressX: event.clientX, pressY: event.clientY, x: event.clientX, y: event.clientY,
      before: new Set(selectedItems), additive: event.ctrlKey || event.metaKey || event.shiftKey, active: false,
    };
  }, { ...options, capture: true });
  window.addEventListener('mousemove', event => {
    if (!marquee) return;
    marquee.x = event.clientX;
    marquee.y = event.clientY;
    if (!marquee.active && Math.hypot(event.clientX - marquee.pressX, event.clientY - marquee.pressY) >= 4) {
      marquee.active = true;
      frame = requestAnimationFrame(autoScroll);
    }
    updateMarquee();
  }, options);
  window.addEventListener('mouseup', () => finishMarquee(), options);
  window.addEventListener('blur', () => finishMarquee(), options);
  list.addEventListener('click', event => {
    if (suppressClick || (event.detail > 0 && press &&
        Math.hypot(event.clientX - press.x, event.clientY - press.y) >= 6)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    } else if (!event.target.closest('.fw-file-row, .fw-thumb-item')) {
      entries.forEach(entry => setSelected(entry, false));
      anchor = null;
      updateStatus();
    }
  }, { ...options, capture: true });
  list.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      entries.forEach(entry => setSelected(entry, !entry.element.hidden));
      updateStatus();
    } else if (event.key === 'Escape' && marquee) {
      event.preventDefault();
      event.stopPropagation();
      finishMarquee(true);
    }
  }, options);
  const controller = {
    items: selectedItems, bind, updateStatus,
    dispose() {
      abort.abort();
      cancelAnimationFrame(frame);
      clearTimeout(clickTimer);
      box.remove();
    },
  };
  explorerSelections.set(list, controller);
  return controller;
}

(function initializeExplorer() {
  const windowEl = document.getElementById('folder-window');
  const icon = explorerIcon;
  const chevron = '<span class="fw-chevron fw-chevron-down"></span>';

  document.querySelectorAll('.tb-btn[data-app]:has(.run-dot)').forEach(button => {
    if (['explorer', 'word', 'copilot'].includes(button.dataset.app)) return;
    button.addEventListener('click', () => {
      button.setAttribute('aria-pressed', String(button.classList.toggle('window-open')));
    });
  });

  const desktop = document.getElementById('desktop-icons');
  const desktopFiles = [...desktop.querySelectorAll('.d-icon')];
  const lastFile = desktopFiles[desktopFiles.length - 1];
  if (lastFile.offsetTop + lastFile.offsetHeight > desktop.clientHeight - 8) {
    const height = desktopFiles.reduce((sum, file) => sum + file.offsetHeight, 0);
    const gap = Math.max(0, Math.min(8, (desktop.clientHeight - 24 - height) / (desktopFiles.length - 1)));
    let top = 16;
    desktopFiles.forEach(file => {
      file.style.top = `${top}px`;
      file.dataset.y = top;
      top += file.offsetHeight + gap;
    });
  }

  // Sizes and timestamps match the supplied local photo assets.
  FOLDER_DATA.Camera = [
    ['IMG_20260102-869', 'image 2065416870-2.png', 'Today', 967148],
    ['IMG_20260102-867', 'image 2065416870-1.png', 'Today', 2888442],
    ['IMG_20260102-866', 'image 2065416870.png', 'Today', 1409620],
    ['IMG_20260102-865', 'image 2065416870-3.png', 'Today', 1362892],
    ['IMG_20260102-864', 'image 2065416870-4.png', 'Today', 603505],
    ['Kashmir_04', 'unsplash_fuAkUJh5w9k.png', 'Yesterday', 435465],
    ['Kashmir_05', 'unsplash_fuAkUJh5w9k-1.png', 'Yesterday', 434868],
    ['IMG_9032323', 'unsplash_fuAkUJh5w9k-2.png', 'Yesterday', 377746],
    ['IMG_9032323_2', '1 (1).png', 'Last week', 129754],
    ['IMG_90323789', '1 (2).png', 'Last week', 50585],
    ['IMG_9032345', '1 (3).png', 'Last week', 453223],
    ['IMG_9032234', '1 (4).png', 'Last week', 298362],
    ['IMG_90326574', '1 (5).png', 'Last week', 348260],
  ].map(([displayName, filename, group, size]) => ({
    name: `${displayName}.png`, displayName, group,
    ...explorerFileDetails({
      name: `${displayName}.png`, size,
      date: `11/13/2026 ${group === 'Today' ? '11:28 AM' : group === 'Yesterday' ? '11:30 AM' : '11:31 AM'}`,
    }),
    preview: group === 'Today' ? 'document' : 'photo',
    category: group === 'Today'
      ? displayName === 'IMG_20260102-865' ? 'hospital-report' : 'hospital-bill'
      : 'image',
    thumb: `Photos in File explorer/${filename}`,
  }));

  FOLDER_DATA.Downloads = [
    { name: 'Work', date: '3/2/2026 4:30 PM', type: 'Folder', size: '34 MB', icon: 'folder', group: 'Today' },
    // Keep real extensions for attachments while displaying Figma's labels.
    ...[
      'Medical Bills 20260105', 'Chem20789327', 'Report Apollo-20260102',
      'Invoice-6700-ff1b-4f7c', 'lab-report-17503411650', 'invoices-d698049-4e46-4d10',
    ].map(displayName => ({
      name: `${displayName}.pdf`, displayName, date: '3/2/2026 12:30 PM',
      type: 'PDF Document', size: '20 MB', icon: 'pdf', group: 'Today',
      category: /report|chem/i.test(displayName) ? 'hospital-report' : 'hospital-bill',
    })),
    { name: 'Overall bills.xlsx', displayName: 'Overall bills', date: '3/2/2026 10:00 AM', type: 'Excel', size: '5 MB', icon: 'excel', group: 'Today' },
    { name: 'Contoso Project Draft.docx', displayName: 'Contoso Project Draft', date: '3/2/2026 9:23 AM', type: 'Word', size: '2 MB', icon: 'word', group: 'Today' },
    { name: 'Contoso Documents', date: '5m ago', type: 'Folder', size: '23 MB', icon: 'folder', group: 'Yesterday' },
    { name: 'Contoso', date: 'Yesterday at 3:40 PM', type: 'Folder', size: '203 MB', icon: 'folder', group: 'Yesterday' },
    { name: 'Benefits', date: 'Jan 11', type: 'Folder', size: '10 MB', icon: 'folder', group: 'Yesterday' },
    { name: 'Baby photo.jpeg', displayName: 'Baby photo', date: 'Jun 2019', type: 'JPEG', size: '3 MB', icon: 'image', group: 'Yesterday' },
    { name: '4598300042.png', displayName: '4598300042', date: 'Jan 1', type: 'PNG', size: '3 MB', icon: 'image', group: 'Yesterday' },
    { name: '4598300041.png', displayName: '4598300041', date: 'Jan 1', type: 'PNG', size: '3 MB', icon: 'image', group: 'Yesterday' },
    { name: '2020 Projections.xlsx', displayName: '2020 Projections', date: 'May 11', type: 'Excel', size: '5 MB', icon: 'excel', group: 'Yesterday' },
  ];
  FOLDER_DATA.Home = ['Downloads', 'Documents', 'Projects', 'Design Assets', 'Camera']
    .map(name => ({ name, target: name, date: '', type: 'Folder', size: '', icon: 'folder' }));
  FOLDER_DATA['This PC'] = FOLDER_DATA.Home.filter(item => item.name !== 'Camera');
  FOLDER_DATA.Desktop = [...document.querySelectorAll('.d-icon')].map(element => {
    const name = element.querySelector('span:last-child').textContent;
    const folder = !!element.querySelector('.folder-thumb');
    const background = element.querySelector('.img-file-thumb')?.style.backgroundImage;
    const thumb = background?.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
    const photo = FOLDER_DATA.Camera.find(item => item.thumb === thumb);
    return {
      name, thumb,
      ...explorerFileDetails({ name, date: photo?.date, size: photo?.size }),
      ...(folder ? { type: 'Folder', icon: 'folder', size: '' }
        : element.dataset.type === 'app' ? { type: 'Application', icon: 'app' } : {}),
    };
  });
  FOLDER_DATA.Downloads.filter(item => item.icon === 'folder').forEach(item => {
    if (!Object.hasOwn(FOLDER_DATA, item.name)) FOLDER_DATA[item.name] = [];
  });

  const tabIcon = windowEl.querySelector('.fw-tab > svg');
  tabIcon.outerHTML = icon('Download colored icon.png');
  windowEl.querySelector('.fw-tab-x').innerHTML = windowControlIcon('close');
  windowEl.querySelector('.fw-new-tab').innerHTML = icon('Add.png');
  windowEl.querySelector('.fw-new-tab').title = 'New tab';
  const maximize = windowEl.querySelector('.fw-wc-btn:not([id])');
  maximize.innerHTML = windowControlIcon('maximize');
  maximize.title = 'Maximize';
  maximize.setAttribute('aria-label', 'Maximize');
  maximize.addEventListener('click', () => {
    const maximized = windowEl.classList.toggle('fw-maximized');
    maximize.title = maximized ? 'Restore' : 'Maximize';
    maximize.setAttribute('aria-label', maximize.title);
  });
  document.getElementById('fw-btn-minimize').setAttribute('aria-label', 'Minimize');
  document.getElementById('fw-btn-close').setAttribute('aria-label', 'Close File Explorer');
  document.getElementById('fw-tab-close').setAttribute('aria-label', 'Close tab');
  document.getElementById('fw-btn-minimize').innerHTML = windowControlIcon('minimize');
  document.getElementById('fw-btn-close').innerHTML = windowControlIcon('close');
  ['Minimize', 'Maximize', 'Close'].forEach(label => {
    document.querySelectorAll(`.wv-tb-btn[title="${label}"]`).forEach(button => {
      button.innerHTML = windowControlIcon(label.toLowerCase());
      button.setAttribute('aria-label', label);
    });
  });
  document.querySelectorAll('#fp-close, #prev-close').forEach(button => {
    button.innerHTML = windowControlIcon('close');
    button.setAttribute('aria-label', 'Close');
  });

  ['back.png', 'forward.png', 'Up.png', 'Refresh.png'].forEach((filename, index) => {
    const button = windowEl.querySelectorAll('.fw-nav-btn')[index];
    button.innerHTML = icon(filename);
    button.title = ['Back', 'Forward', 'Up', 'Refresh'][index];
    button.setAttribute('aria-label', button.title);
  });
  windowEl.querySelector('.fw-breadcrumb > svg').outerHTML = icon('Desktop.png');
  const separator = windowEl.querySelector('.fw-breadcrumb-sep');
  windowEl.querySelector('.fw-breadcrumb').insertBefore(separator, document.getElementById('fw-folder-name'));

  const toolbar = windowEl.querySelector('.fw-toolbar');
  function command(label, filename, dropdown = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fw-tb-btn';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.innerHTML = `${icon(filename)}${dropdown || label === 'Details' ? `<span>${label}</span>` : ''}${dropdown ? chevron : ''}`;
    toolbar.appendChild(button);
    return button;
  }
  function divider() {
    const element = document.createElement('div');
    element.className = 'fw-tb-sep';
    toolbar.appendChild(element);
  }
  toolbar.replaceChildren();
  command('New', 'Plus new.png', true).classList.add('fw-command-new');
  divider();
  [
    ['Cut', 'windows.cut.png'], ['Copy', 'windows.copy.png'], ['Paste', 'windows.paste.png'],
    ['Rename', 'windows.rename.png'], ['Share', 'windows.modernshare.png'], ['Delete', 'windows.recycle.png'],
  ].forEach(([label, filename]) => command(label, filename));
  divider();
  command('Sort', 'windows.sortbycolumn.png', true).classList.add('fw-command-sort');
  command('View', 'windows.iconsize.tile.png', true).classList.add('fw-command-view');
  divider();
  command('More', '3 dots.png');
  command('Details', 'Details icon.png').classList.add('fw-tb-right');

  const sidebar = windowEl.querySelector('.fw-sidebar');
  const banner = document.getElementById('fw-held-banner');
  const existing = new Map([...sidebar.querySelectorAll('[id]')].map(element => [element.id, element]));
  sidebar.replaceChildren(banner);
  function shortcut(label, filename, id, pinned = false) {
    const element = existing.get(id) || document.createElement('div');
    element.className = 'fw-sb-item';
    if (id) element.id = id;
    element.innerHTML = `${icon(filename)}<span>${label}</span>${pinned ? '<span class="fw-pin" aria-hidden="true"></span>' : ''}`;
    element.tabIndex = 0;
    element.setAttribute('role', 'button');
    element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        element.click();
      }
    });
    sidebar.appendChild(element);
    return element;
  }
  function sidebarDivider() {
    const element = document.createElement('div');
    element.className = 'fw-sb-sep';
    sidebar.appendChild(element);
  }
  shortcut('Home', 'Home.png', 'fw-sb-home').addEventListener('click', () => openFolder('Home'));
  shortcut('Sunday trip', 'Folder in left menu.png', 'fw-sb-design');
  shortcut('My Files', 'Folder in left menu.png', 'fw-sb-documents');
  sidebarDivider();
  shortcut('Desktop', 'Desktop-Left menu.png', 'fw-sb-desktop', true).addEventListener('click', () => openFolder('Desktop'));
  shortcut('Downloads', 'Download colored icon.png', 'fw-sb-downloads');
  shortcut('Project Tulip', 'Folder in left menu.png', 'fw-sb-projects', true);
  sidebarDivider();
  shortcut('This PC', 'This PC.png', 'fw-sb-pc').addEventListener('click', () => openFolder('This PC'));
  shortcut('Susie M', 'Phone-Sussiee.png', 'fw-sb-phone');

  const history = [];
  let historyIndex = -1;
  let navigatingHistory = false;
  const originalOpenFolder = openFolder;
  const navButtons = windowEl.querySelectorAll('.fw-nav-btn');
  const displayNames = { Documents: 'My Files', Projects: 'Project Tulip', 'Design Assets': 'Sunday trip', Camera: 'Susie M' };
  window.openFolder = openFolder = function(name) {
    originalOpenFolder(name);
    if (windowEl.dataset.folder !== name) return;
    if (!navigatingHistory && history[historyIndex] !== name) {
      history.splice(historyIndex + 1);
      history.push(name);
      historyIndex = history.length - 1;
    }
    navButtons[0].disabled = historyIndex <= 0;
    navButtons[1].disabled = historyIndex >= history.length - 1;
    const displayName = displayNames[name] || name;
    document.getElementById('fw-tab-name').textContent = displayName;
    document.getElementById('fw-folder-name').textContent = displayName;
    windowEl.querySelector('.fw-breadcrumb > img').src = `icons/${name === 'Camera' ? 'Phone-Sussiee.png' : 'Desktop.png'}`;
    document.getElementById('fw-search-input').placeholder = `Search ${displayName}`;
    windowEl.querySelector('.fw-tab > img').src = `icons/${name === 'Downloads' ? 'Download colored icon.png' : name === 'Camera' ? 'Phone-Sussiee.png' : 'Folder in left menu.png'}`;
    const additionalSidebarIds = { Home: 'fw-sb-home', Desktop: 'fw-sb-desktop', 'This PC': 'fw-sb-pc' };
    if (additionalSidebarIds[name]) document.getElementById(additionalSidebarIds[name]).classList.add('active');
  };
  function navigateHistory(direction) {
    const next = historyIndex + direction;
    if (next < 0 || next >= history.length) return;
    historyIndex = next;
    navigatingHistory = true;
    openFolder(history[historyIndex]);
    navigatingHistory = false;
  }
  navButtons[0].addEventListener('click', () => navigateHistory(-1));
  navButtons[1].addEventListener('click', () => navigateHistory(1));
  navButtons[2].addEventListener('click', () => openFolder('This PC'));
  navButtons[3].addEventListener('click', () => {
    if (windowEl.dataset.folder) openFolder(windowEl.dataset.folder);
  });

  const header = windowEl.querySelector('.fw-list-header');
  header.innerHTML = `<span class="fw-header-check" role="checkbox" aria-label="Select all files" aria-checked="false" tabindex="0"></span>
    <span>Name <span class="fw-chevron fw-chevron-up"></span></span><span>Date Modified</span><span>Type</span><span>Size</span>`;
  const selectAll = header.firstElementChild;
  function toggleAll() {
    const rows = [...windowEl.querySelectorAll('.fw-file-row:not([hidden])')];
    const select = rows.some(row => !row.classList.contains('selected'));
    rows.filter(row => row.classList.contains('selected') !== select)
      .forEach(row => row.querySelector('.fw-row-check').click());
    selectAll.setAttribute('aria-checked', String(select));
  }
  selectAll.addEventListener('click', toggleAll);
  selectAll.addEventListener('keydown', event => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggleAll();
    }
  });
  new MutationObserver(() => {
    const rows = [...windowEl.querySelectorAll('.fw-file-row:not([hidden])')];
    const selected = rows.filter(row => row.classList.contains('selected')).length;
    selectAll.setAttribute('aria-checked', selected === 0 ? 'false' : selected === rows.length ? 'true' : 'mixed');
  }).observe(document.getElementById('fw-file-list'), { subtree: true, attributes: true, attributeFilter: ['class', 'hidden'], childList: true });

  const statusControls = document.createElement('div');
  statusControls.className = 'fw-status-controls';
  statusControls.innerHTML = `<span title="Details view">${icon('Footer icon.png')}</span><span title="Icons view">${icon('Footer icon-2.png')}</span>`;
  windowEl.querySelector('.fw-statusbar').appendChild(statusControls);

  document.getElementById('fw-search-input').addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    const list = document.getElementById('fw-file-list');
    list.querySelectorAll('.fw-file-row, .fw-thumb-item').forEach(row => {
      const name = row.querySelector('.fw-file-name, .fw-thumb-name');
      row.hidden = !name.textContent.toLowerCase().includes(query);
      if (row.hidden && row.classList.contains('selected')) {
        row.querySelector('.fw-row-check, .fw-thumb-check').click();
      }
    });
    list.querySelectorAll('.fw-list-group').forEach(group => {
      let row = group.nextElementSibling;
      let visible = false;
      while (row && !row.classList.contains('fw-list-group')) {
        visible ||= !row.hidden;
        row = row.nextElementSibling;
      }
      group.hidden = !visible;
    });
    list.querySelectorAll('.fw-thumb-section').forEach(group => {
      const row = group.nextElementSibling;
      const visible = !!row.querySelector('.fw-thumb-item:not([hidden])');
      group.hidden = !visible;
      row.hidden = !visible;
    });
    explorerSelections.get(list).updateStatus();
  });
})();
