function composerIcon(filename) {
  return `<img class="composer-asset-icon" src="icons/${filename}" alt="">`;
}

function windowControlIcon(type) {
  const assets = { minimize: 'ChromeMinimize.png', maximize: 'ChromeMaximize.png', close: 'ChromeClose.png' };
  if (!Object.hasOwn(assets, type)) throw new Error(`Unknown window control: ${type}`);
  return `<img class="window-control-icon window-control-icon-${type}" src="icons/${assets[type]}" alt="" draggable="false">`;
}

function composerFileIcon(name, fallback, kind = 'file', thumb = '') {
  if (kind === 'folder') return composerIcon('explorer.png');
  const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (/^(jpe?g|png|gif|webp|heic|avif)$/.test(extension)) {
    const item = Object.values(FOLDER_DATA).flat().find(file => file.name === name && file.thumb);
    const desktop = [...document.querySelectorAll('.d-icon')]
      .find(icon => icon.querySelector('span:last-child').textContent === name);
    const background = desktop?.querySelector('.img-file-thumb')?.style.backgroundImage;
    const source = thumb || item?.thumb || background?.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
    if (source) {
      const image = document.createElement('img');
      image.className = 'composer-image-preview';
      image.src = source;
      image.alt = name;
      return image.outerHTML;
    }
  }
  const icons = {
    pdf: 'PDF.png',
    doc: 'Word.png',
    docx: 'Word.png',
    xls: 'excel.png',
    xlsx: 'excel.png',
    csv: 'excel.png',
    ppt: 'ppt.png',
    pptx: 'ppt.png',
  };
  return Object.hasOwn(icons, extension) ? composerIcon(icons[extension]) : fallback;
}

function prioritizeComposerFiles(names) {
  if (names.length === 0) return;
  const chips = document.getElementById('composer-chips');
  const byName = new Map([...chips.querySelectorAll('.file-chip')]
    .map(chip => [chip.querySelector('.file-chip-name').textContent, chip]));
  const latest = document.createDocumentFragment();
  new Set(names).forEach(name => {
    const chip = byName.get(name);
    if (chip) latest.appendChild(chip);
  });
  chips.prepend(latest);
  closeOverflowMenu();
}

function renderComposerFileSuggestions(container) {
  if (document.getElementById('search-composer').dataset.composerState === 'loading') return;
  resetComposerActionState();
  const suggestions = [
    { img: 'icons/Chat.png', title: 'Merge all files in one PDF', sub: 'Action \u00b7 Share Agent' },
    { img: 'icons/Chat.png', title: 'Create a summary sheet of all expenses', sub: 'New chat \u00b7 Copilot' },
    { img: 'icons/explorer.png', title: 'Move to folder', sub: 'File explorer' },
    { img: 'icons/outlook.png', title: 'Share using Outlook', sub: 'App' },
  ];

  function runSuggestion(title) {
    if (title === 'Merge all files in one PDF' || title === 'Share using Outlook') {
      document.getElementById('composer-input').value = title === 'Share using Outlook'
        ? 'Merge these files and send to Daisy on Outlook' : title;
      runComposerFileAction();
      return;
    }
    const files = [...document.querySelectorAll('#composer-chips .file-chip-name')]
      .map(name => name.textContent).filter(Boolean);
    document.getElementById('search-composer').classList.remove('open');
    window._openCopilot?.(title, files);
  }

  container.replaceChildren();
  suggestions.forEach((suggestion, index) => {
    const row = document.createElement('div');
    row.className = 'suggestion-row';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', suggestion.title);
    row.innerHTML = `
      <div class="suggestion-icon"><img class="composer-asset-icon" src="${suggestion.img}" alt=""></div>
      <div class="suggestion-text">
        <div class="suggestion-title">${suggestion.title}</div>
        <div class="suggestion-sub">${suggestion.sub}</div>
      </div>`;
    row.addEventListener('click', () => runSuggestion(suggestion.title));
    row.addEventListener('keydown', event => {
      if (event.target !== row || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      runSuggestion(suggestion.title);
    });

    if (index === 0) {
      const actions = document.createElement('div');
      actions.className = 'composer-suggestion-actions';
      actions.innerHTML = `
        <button type="button" aria-label="Edit merge prompt" title="Edit prompt">${composerControlIcon('more')}</button>
        <button type="button" aria-label="Run merge suggestion" title="Run suggestion">
          ${composerControlIcon('enter')}
        </button>`;
      actions.firstElementChild.addEventListener('click', event => {
        event.stopPropagation();
        const input = document.getElementById('composer-input');
        input.value = suggestion.title;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      });
      row.appendChild(actions);
    }
    container.appendChild(row);
  });

  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'composer-see-more';
  more.textContent = 'See more search results';
  more.addEventListener('click', () => {
    const input = document.getElementById('composer-input');
    runSuggestion(input.value.trim() || 'Show more actions for these files');
  });
  container.appendChild(more);
  container.classList.add('visible');
}

function composerControlIcon(type) {
  const assets = {
    more: ['3 dots.png', 12.5, 2.5],
    enter: ['Run.png', 14, 12],
    action: ['Snamrt action.png', 20, 20],
    undo: ['undo.png', 13, 16],
    open: ['Open.png', 14, 14],
  };
  if (Object.hasOwn(assets, type)) {
    const [filename, width, height] = assets[type];
    return `<span class="composer-control-icon" aria-hidden="true"><img class="composer-control-image" src="icons/${filename}" style="width:${width}px;height:${height}px" alt=""></span>`;
  }
  const paths = {
    success: '<circle cx="10" cy="10" r="8"/><path d="m6 10 3 3 5-6"/>',
    send: '<path d="m2 2 16 8-16 8 3-8-3-8Z"/><path d="M5 10h13"/>',
  };
  return `<svg class="composer-control-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type]}</svg>`;
}

function trimComposerChips() {
  const chips = document.getElementById('composer-chips');
  chips.querySelector('.file-chip-more')?.remove();
  const all = [...chips.querySelectorAll('.file-chip')];
  all.forEach(chip => {
    chip.classList.toggle('file-chip-image', !!chip.querySelector('.composer-image-preview'));
    chip.title = chip.querySelector('.file-chip-name').textContent;
    chip.querySelector('.file-chip-remove').setAttribute('aria-label', `Remove ${chip.title}`);
    chip.style.display = '';
  });
  let images = 0, files = 0, used = 0;
  const available = (chips.clientWidth || 484) - 16;
  const hidden = [];
  all.forEach((chip, index) => {
    const image = chip.classList.contains('file-chip-image');
    const width = chip.offsetWidth || (image ? 32 : 136);
    const needed = width + (used ? 8 : 0);
    const reserve = index < all.length - 1 || hidden.length ? 39 : 0;
    if ((image ? images < 6 : files < 2) && used + needed + reserve <= available) {
      used += needed;
      if (image) images++; else files++;
    } else {
      chip.style.display = 'none';
      hidden.push(chip);
    }
  });
  if (hidden.length) {
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'file-chip-more';
    badge.textContent = `+${hidden.length}`;
    badge.setAttribute('aria-label', `Show ${hidden.length} more attachments`);
    badge.addEventListener('click', event => {
      event.stopPropagation();
      toggleOverflowMenu(badge, hidden);
    });
    chips.appendChild(badge);
  }
}

let composerActionToken = 0;
let composerMergePlan = null;

function resetComposerActionState() {
  composerActionToken++;
  composerMergePlan = null;
  const composer = document.getElementById('search-composer');
  delete composer.dataset.composerState;
  delete composer.dataset.mergeFlow;
  const input = document.getElementById('composer-input');
  input.disabled = false;
  input.placeholder = 'Ask Copilot anything';
  document.getElementById('composer-run')?.remove();
  document.getElementById('composer-merge-controls')?.remove();
}

function renderComposerZeroState() {
  resetComposerActionState();
  closeOverflowMenu();
  const notice = document.getElementById('composer-skip-notice');
  if (notice) {
    notice.classList.remove('visible', 'error', 'info');
    clearTimeout(notice._hideTimer);
  }
  const composer = document.getElementById('search-composer');
  composer.dataset.composerState = 'zero';
  const input = document.getElementById('composer-input');
  input.value = '';
  input.style.height = '';
  const container = document.getElementById('composer-suggestions');
  const suggestions = [
    { title: 'What are the NFL scores from this week?', sub: 'Chat suggestion \u00b7 Copilot', icon: composerIcon('Chat2.png') },
    { title: 'Outside Vacations', sub: 'Recently opened \u00b7 PowerPoint', icon: composerIcon('PowerPoint.png') },
    { title: 'Labor day weekend 2026 date and info', sub: 'Recent conversation \u00b7 Copilot', icon: composerIcon('Chat History.png') },
    { title: 'Learn how to get the most out of Ask Copilot', sub: 'Suggestion \u00b7 Copilot', icon: composerIcon('Lightbulb.png') },
  ];
  container.replaceChildren();
  suggestions.forEach(suggestion => {
    const row = document.createElement('div');
    row.className = 'suggestion-row';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.innerHTML = `<div class="suggestion-icon">${suggestion.icon}</div>
      <div class="suggestion-text"><div class="suggestion-title">${suggestion.title}</div><div class="suggestion-sub">${suggestion.sub}</div></div>`;
    const run = () => {
      closeComposer();
      if (suggestion.title === 'Outside Vacations') {
        const button = document.querySelector('.tb-btn[data-app="powerpoint"]');
        button.click();
        showPopup(button);
      } else {
        window._openCopilot(suggestion.title, []);
      }
    };
    row.addEventListener('click', run);
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        run();
      }
    });
    container.appendChild(row);
  });
  container.classList.add('visible');
  document.getElementById('composer-chips').classList.remove('visible');
  document.getElementById('composer-divider').classList.remove('visible');
}

function resetCompletedComposer() {
  if (document.getElementById('search-composer').dataset.composerState !== 'complete') return;
  if (document.querySelector('#composer-chips .file-chip')) {
    renderComposerFileSuggestions(document.getElementById('composer-suggestions'));
  } else {
    renderComposerZeroState();
  }
}

function isComposerFileAction(query) {
  return /\b(?:rename|move)\b/i.test(query)
    || (/(?:creat|make|move|organis|organiz|new folder)/i.test(query) && /folder|desktop/i.test(query));
}

function isComposerMergeAction(query) {
  if (isComposerFileAction(query) && /^(?:please\s+)?(?:create|make|rename|move|organise|organize)\b/i.test(query)) return false;
  return /\b(?:merge|combine|join)\b/i.test(query)
    || (/\b(?:send|share|email)\b/i.test(query) && /\b(?:daisy|outlook)\b/i.test(query));
}

function cancelComposerMerge() {
  const query = composerMergePlan?.query || '';
  resetComposerActionState();
  const input = document.getElementById('composer-input');
  input.value = query;
  autoResizeTextarea(input);
  if (query) renderComposerQuery(query);
  else renderComposerFileSuggestions(document.getElementById('composer-suggestions'));
  input.focus();
}

function setComposerMergeControls(buttons) {
  document.getElementById('composer-run')?.remove();
  document.getElementById('composer-merge-controls')?.remove();
  const controls = document.createElement('div');
  controls.id = 'composer-merge-controls';
  buttons.forEach(({ text, run, primary = false, type = 'button', form, icon }) => {
    const button = document.createElement('button');
    button.type = type;
    if (icon) button.innerHTML = composerControlIcon(icon);
    button.appendChild(document.createTextNode(text));
    button.className = primary ? 'composer-merge-primary' : '';
    if (form) button.setAttribute('form', form);
    if (run) button.addEventListener('click', run);
    controls.appendChild(button);
  });
  document.querySelector('#search-composer .composer-footer').appendChild(controls);
}

function renderComposerMergeStatus(title, subtitle, loading = false) {
  const container = document.getElementById('composer-suggestions');
  container.classList.add('visible');
  container.innerHTML = `<div class="suggestion-row composer-action-status" role="status" aria-live="polite">
    <div class="suggestion-icon">${loading ? '<span class="composer-action-spinner"></span>' : composerControlIcon('success')}</div>
    <div class="suggestion-text"><div class="suggestion-title"></div><div class="suggestion-sub"></div></div></div>`;
  container.querySelector('.suggestion-title').textContent = title;
  container.querySelector('.suggestion-sub').textContent = subtitle;
}

function renderComposerOutlookDraft() {
  const plan = composerMergePlan;
  if (!plan) return;
  const composer = document.getElementById('search-composer');
  composer.dataset.composerState = 'share-draft';
  const container = document.getElementById('composer-suggestions');
  container.innerHTML = `
    <header class="composer-share-header">
      <button type="button" class="composer-share-back" aria-label="Back to merge prompt">&#8592;</button>
      ${composerControlIcon('action')}
      <div><div class="composer-share-title"></div><div class="composer-share-subtitle">Action &middot; Share Agent</div></div>
    </header>
    <form id="composer-outlook-draft" class="composer-outlook-draft">
      <div class="composer-outlook-heading">${composerIcon('outlook.png')}<span>Share using Outlook</span></div>
      <div class="composer-mail-field composer-recipient-field">
        <label for="composer-mail-recipient">To:</label>
        <div class="composer-recipient-line">
          <div class="composer-recipient-pill">
            <img class="composer-recipient-avatar" src="Assets for UC/Daisy mcguire.png" alt="">
            <input id="composer-mail-recipient" name="recipient" aria-label="To" required value="Daisy Macguire">
            <button type="button" class="composer-remove-recipient" aria-label="Remove recipient">&times;</button>
          </div>
          <button type="button" class="composer-mail-cc" aria-expanded="false">Cc</button>
          <button type="button" class="composer-mail-bcc" aria-expanded="false">Bcc</button>
        </div>
      </div>
      <label class="composer-mail-field composer-extra-recipient" hidden><span>Cc:</span><input name="cc" aria-label="Cc"></label>
      <label class="composer-mail-field composer-extra-recipient" hidden><span>Bcc:</span><input name="bcc" aria-label="Bcc"></label>
      <label class="composer-mail-field"><span>Subject:</span><input name="subject" aria-label="Subject" required value="Medical reports"></label>
      <div class="composer-merged-file">${composerIcon('PDF.png')}<div><strong></strong><span>25MB</span></div></div>
      <textarea name="message" aria-label="Email message" required></textarea>
    </form>`;
  container.querySelector('.composer-share-title').textContent = plan.title;
  container.querySelector('.composer-merged-file strong').textContent = plan.filename.replace(/\.pdf$/i, '');
  const form = container.querySelector('form');
  form.setAttribute('aria-description', 'Prototype only. No file contents are merged and no real email is sent.');
  const draft = plan.draft || {
    recipient: 'Daisy Macguire', subject: 'Medical reports', cc: '', bcc: '',
    message: "Hello\nI\u2019ve attached the bills for your reference. Let me know if you need any other details.\n\nRegards\nSusiee M",
  };
  Object.entries(draft).forEach(([name, value]) => { form.elements.namedItem(name).value = value; });
  const recipientInput = form.elements.namedItem('recipient');
  function updateRecipient() {
    container.querySelector('.composer-recipient-avatar').hidden = recipientInput.value !== 'Daisy Macguire';
  }
  updateRecipient();
  recipientInput.addEventListener('input', updateRecipient);
  container.querySelector('.composer-remove-recipient').addEventListener('click', () => {
    recipientInput.value = '';
    updateRecipient();
    recipientInput.focus();
  });
  ['cc', 'bcc'].forEach(name => {
    const button = container.querySelector(`.composer-mail-${name}`);
    const field = form.elements.namedItem(name);
    const toggle = () => {
      field.closest('label').hidden = !field.closest('label').hidden;
      button.setAttribute('aria-expanded', String(!field.closest('label').hidden));
      if (!field.closest('label').hidden) field.focus();
    };
    button.addEventListener('click', toggle);
    if (field.value) toggle();
  });
  container.querySelector('.composer-share-back').addEventListener('click', cancelComposerMerge);
  const input = document.getElementById('composer-input');
  input.disabled = false;
  input.value = '';
  input.style.height = '';
  input.placeholder = 'Questions or changes to this plan?';
  setComposerMergeControls([
    { text: 'Cancel', run: cancelComposerMerge },
    { text: 'Send', primary: true, type: 'submit', form: 'composer-outlook-draft', icon: 'send' },
  ]);
  container.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || composerMergePlan !== plan) return;
    const recipient = form.elements.namedItem('recipient').value.trim();
    const subject = form.elements.namedItem('subject').value.trim();
    const message = form.elements.namedItem('message').value.trim();
    for (const [name, value] of Object.entries({ recipient, subject, message })) {
      const field = form.elements.namedItem(name);
      field.setCustomValidity(value ? '' : 'Please fill out this field.');
      if (!field.reportValidity()) return;
    }
    plan.draft = Object.fromEntries(new FormData(form));
    const token = ++composerActionToken;
    composer.dataset.composerState = 'share-sending';
    input.disabled = true;
    input.value = '';
    input.placeholder = 'One moment...';
    const displayRecipient = recipient === 'Daisy Macguire' ? 'Daisy Mcguire' : recipient;
    renderComposerMergeStatus(`Sending file to ${displayRecipient} on Outlook`, 'Connecting to Share Agent...', true);
    document.getElementById('composer-merge-controls')?.remove();
    setTimeout(() => {
      if (token !== composerActionToken || composerMergePlan !== plan) return;
      let saved;
      try {
        saved = createComposerDesktopFolder('create a folder named "Medical reports and bills"', [{
          name: plan.filename, kind: 'file', size: '25 MB', type: 'PDF Document', icon: 'pdf',
        }], { copy: true });
      } catch (error) {
        console.error('Share Agent could not save the merged PDF preview:', error);
        composer.dataset.composerState = 'error';
        input.disabled = false;
        input.placeholder = 'Edit your action and try again';
        renderComposerMergeStatus('Unable to complete sharing', error.message);
        document.querySelector('.composer-action-status .suggestion-icon').textContent = '!';
        setComposerMergeControls([{ text: 'Back to draft', run: renderComposerOutlookDraft }]);
        return;
      }
      composer.dataset.composerState = 'share-complete';
      plan.chips.forEach(chip => chip.remove());
      trimComposerChips();
      document.getElementById('composer-chips').classList.remove('visible');
      document.getElementById('composer-divider').classList.remove('visible');
      input.disabled = false;
      input.placeholder = 'Start a new chat or action';
      renderComposerMergeStatus(`File shared successfully with ${displayRecipient} on Outlook`, 'Files merged and shared');
      const controls = document.createElement('div');
      controls.className = 'composer-suggestion-actions composer-share-result-actions';
      controls.innerHTML = `<button type="button" aria-label="Undo sharing">${composerControlIcon('undo')}</button>
        <span class="composer-share-action-divider"></span>
        <button type="button" aria-label="Open saved folder">${composerControlIcon('open')}</button>`;
      controls.firstElementChild.addEventListener('click', () => {
        try {
          saved.undo();
          container.querySelector('.suggestion-title').textContent = 'File sharing undone';
          container.querySelector('.suggestion-sub').textContent = 'Saved copy removed. Original files unchanged';
          controls.remove();
        } catch (error) {
          console.error('Share Agent could not undo sharing:', error);
          container.querySelector('.suggestion-sub').textContent = error.message;
        }
      });
      controls.lastElementChild.addEventListener('click', () => openFolder(saved.name));
      container.firstElementChild.appendChild(controls);
    }, 1800);
  });
  container.querySelector('form').addEventListener('input', event => event.target.setCustomValidity?.(''));
}

function runComposerMergeAction(query, chips) {
  resetComposerActionState();
  const composer = document.getElementById('search-composer');
  const input = document.getElementById('composer-input');
  if (chips.some(chip => chip.dataset.kind === 'folder')) {
    composer.dataset.composerState = 'error';
    renderComposerMergeStatus('Select files to merge', 'Folders cannot be merged. Remove the folder attachment and try again.');
    document.querySelector('.composer-action-status .suggestion-icon').textContent = '!';
    return true;
  }
  composer.dataset.mergeFlow = 'true';
  const plan = {
    query, chips,
    title: 'Merge these files into one PDF and share it with Daisy on Outlook',
    filename: 'Merged_Medical reports and bills.pdf',
  };
  composerMergePlan = plan;
  const token = ++composerActionToken;
  composer.dataset.composerState = 'loading';
  closeOverflowMenu();
  input.value = '';
  input.disabled = true;
  input.placeholder = 'One moment...';
  renderComposerMergeStatus(plan.title, 'Connecting to Share Agent...', true);
  setComposerMergeControls([{ text: 'Cancel', run: cancelComposerMerge }]);
  setTimeout(() => {
    if (token !== composerActionToken) return;
    renderComposerMergeStatus(plan.title, `Merging ${chips.length} file${chips.length === 1 ? '' : 's'} into one PDF...`, true);
  }, 700);
  setTimeout(() => {
    if (token !== composerActionToken) return;
    if (/\b(?:send|share|email|daisy|outlook)\b/i.test(query)) {
      renderComposerOutlookDraft();
    } else {
      composer.dataset.composerState = 'merge-complete';
      input.disabled = false;
      input.placeholder = 'Send this to Daisy on Outlook';
      renderComposerMergeStatus('Your merged PDF is ready', `${plan.filename} (prototype preview)`);
      setComposerMergeControls([
        { text: 'Back', run: cancelComposerMerge },
        { text: 'Share using Outlook', primary: true, run: renderComposerOutlookDraft },
      ]);
    }
  }, 1800);
  return true;
}

function renderComposerQuery(query) {
  resetComposerActionState();
  closeOverflowMenu();
  const composer = document.getElementById('search-composer');
  const container = document.getElementById('composer-suggestions');
  const hasFiles = !!document.querySelector('#composer-chips .file-chip');
  const mergeAction = hasFiles && isComposerMergeAction(query);
  const action = hasFiles && (mergeAction || isComposerFileAction(query));
  composer.dataset.composerState = action ? 'query' : 'chat-query';
  container.replaceChildren();
  container.classList.add('visible');
  function addRow(subtitle, primary, title = query) {
    const row = document.createElement('div');
    row.className = `suggestion-row${primary ? ' composer-query-primary' : ''}`;
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.innerHTML = `<div class="suggestion-icon">${primary && action ? composerControlIcon('action') : composerIcon(title === 'Move to a folder' ? 'explorer.png' : 'Chat.png')}</div>
      <div class="suggestion-text"><div class="suggestion-title"></div><div class="suggestion-sub"></div></div>`;
    row.querySelector('.suggestion-title').textContent = title;
    row.querySelector('.suggestion-sub').textContent = subtitle;
    const run = () => {
      if (primary && action) runComposerFileAction();
      else {
        const files = [...document.querySelectorAll('#composer-chips .file-chip-name')].map(el => el.textContent);
        composer.classList.remove('open');
        document.getElementById('composer-input').value = '';
        window._openCopilot(title, files);
      }
    };
    row.addEventListener('click', run);
    row.addEventListener('keydown', event => {
      if (event.target === row && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        run();
      }
    });
    if (primary) {
      const controls = document.createElement('div');
      controls.className = 'composer-suggestion-actions';
      controls.innerHTML = `<button type="button" aria-label="Edit action">${composerControlIcon('more')}</button>
        <button type="button" aria-label="Run action">${composerControlIcon('enter')}</button>`;
      controls.firstElementChild.addEventListener('click', event => {
        event.stopPropagation();
        document.getElementById('composer-input').focus();
      });
      row.appendChild(controls);
    }
    container.appendChild(row);
  }
  addRow(action ? `Action \u00b7 ${mergeAction ? 'Share Agent' : 'Files Agent'}` : 'New chat \u00b7 Copilot', true);
  if (action) addRow('New chat \u00b7 Copilot', false);
  else if (hasFiles) {
    addRow('Copilot \u00b7 Add to conversation', false, 'Summarise these files');
    addRow('File Explorer', false, 'Move to a folder');
  }
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'composer-see-more';
  more.textContent = 'See more search results';
  more.addEventListener('click', () => container.querySelectorAll('.suggestion-row')[action ? 1 : 0].click());
  container.appendChild(more);
  let run = document.getElementById('composer-run');
  if (!run) {
    run = document.createElement('button');
    run.id = 'composer-run';
    run.type = 'button';
    run.innerHTML = `${composerControlIcon('enter')}<span>Run</span>`;
    run.addEventListener('click', () => container.firstElementChild.click());
    composer.querySelector('.composer-footer').appendChild(run);
  }
}

function runComposerFileAction() {
  const composer = document.getElementById('search-composer');
  if (['loading', 'share-sending'].includes(composer.dataset.composerState)) return true;
  const input = document.getElementById('composer-input');
  if (composer.dataset.composerState === 'share-draft') {
    if (input.value.trim()) {
      const message = document.querySelector('#composer-outlook-draft [name="message"]');
      message.value = input.value.trim();
      message.setCustomValidity('');
      input.value = '';
      autoResizeTextarea(input);
      message.focus();
    } else document.getElementById('composer-outlook-draft').requestSubmit();
    return true;
  }
  if (composer.dataset.composerState === 'merge-complete' && /\b(?:send|share|daisy|outlook)\b/i.test(input.value)) {
    renderComposerOutlookDraft();
    return true;
  }
  const query = input.value.trim();
  const chips = [...document.querySelectorAll('#composer-chips .file-chip')];
  if (chips.length && isComposerMergeAction(query)) return runComposerMergeAction(query, chips);
  if (!chips.length || !isComposerFileAction(query)) return false;
  resetComposerActionState();
  const files = chips.map(chip => ({
    name: chip.querySelector('.file-chip-name').textContent,
    kind: chip.dataset.kind,
    thumb: chip.querySelector('.composer-image-preview')?.getAttribute('src'),
    ...(chip.dataset.fileSize !== undefined ? {
      size: Number(chip.dataset.fileSize),
      lastModified: Number(chip.dataset.lastModified),
    } : {}),
  }));
  const token = ++composerActionToken;
  const container = document.getElementById('composer-suggestions');
  closeOverflowMenu();
  document.getElementById('composer-run')?.remove();
  composer.dataset.composerState = 'loading';
  container.innerHTML = `<div class="suggestion-row composer-action-status" role="status" aria-live="polite">
    <div class="suggestion-icon"><span class="composer-action-spinner"></span></div>
    <div class="suggestion-text"><div class="suggestion-title"></div><div class="suggestion-sub">Connecting to Files Agent...</div></div></div>`;
  container.querySelector('.suggestion-title').textContent = query;
  input.value = '';
  input.style.height = '';
  input.placeholder = 'One moment...';
  input.disabled = true;
  setTimeout(() => {
    if (token !== composerActionToken) return;
    try {
      const result = createComposerDesktopFolder(query, files);
      chips.forEach(chip => chip.remove());
      trimComposerChips();
      const remaining = document.getElementById('composer-chips');
      remaining.classList.toggle('visible', !!remaining.querySelector('.file-chip'));
      document.getElementById('composer-divider').classList.toggle('visible', !!remaining.querySelector('.file-chip'));
      composer.dataset.composerState = 'complete';
      container.querySelector('.suggestion-icon').innerHTML = composerControlIcon('success');
      container.querySelector('.suggestion-sub').textContent = 'Folder created, and files moved';
      const controls = document.createElement('div');
      controls.className = 'composer-suggestion-actions';
      controls.innerHTML = `<button type="button" aria-label="Undo folder creation">${composerControlIcon('undo')}</button>
        <button type="button" aria-label="Open created folder">${composerControlIcon('open')}</button>`;
      controls.firstElementChild.addEventListener('click', () => {
        try {
          result.undo();
          container.querySelector('.suggestion-sub').textContent = 'Undone. Original files restored';
          controls.remove();
        } catch (error) {
          console.error('Files Agent could not undo folder creation:', error);
          container.querySelector('.suggestion-sub').textContent = error.message;
        }
      });
      controls.lastElementChild.addEventListener('click', () => openFolder(result.name));
      container.firstElementChild.appendChild(controls);
      input.disabled = false;
      input.placeholder = 'Start a new chat or action';
      if (document.getElementById('folder-window').classList.contains('open')) {
        document.getElementById('fw-btn-minimize').click();
      }
      if (document.getElementById('word-viewer').classList.contains('open')) {
        document.getElementById('tb-word-btn').click();
      }
      if (document.getElementById('copilot-overlay')?.classList.contains('open')) {
        document.getElementById('cop-minimize').click();
      }
      composer.classList.remove('v1-preview');
      document.getElementById('preview-popup').classList.remove('visible');
      window._selectDesktopIcon(result.icon);
      composer.classList.add('open');
      input.focus();
    } catch (error) {
      console.error('Files Agent could not create the desktop folder:', error);
      composer.dataset.composerState = 'error';
      container.querySelector('.suggestion-icon').textContent = '!';
      container.querySelector('.suggestion-sub').textContent = error.message;
      input.disabled = false;
      input.placeholder = 'Edit your action and try again';
      input.value = query;
      autoResizeTextarea(input);
      input.focus();
    }
  }, 1600);
  return true;
}

function initializeComposer() {
  const composer = document.getElementById('search-composer');
  const input = document.getElementById('composer-input');
  const chips = document.getElementById('composer-chips');
  renderComposerZeroState();
  input.addEventListener('input', () => {
    if (composer.dataset.composerState === 'share-draft') return;
    if (composer.dataset.composerState === 'merge-complete') return;
    const query = input.value.trim();
    if (query) renderComposerQuery(query);
    else if (!query && chips.querySelector('.file-chip')) renderComposerFileSuggestions(document.getElementById('composer-suggestions'));
    else if (document.getElementById('search-composer').dataset.composerState) {
      renderComposerZeroState();
    }
  });
  new MutationObserver(records => {
    records.forEach(record => record.removedNodes.forEach(chip => {
      if (!(chip instanceof Element) || chips.contains(chip)) return;
      const source = chip.querySelector('.composer-image-preview')?.getAttribute('src');
      if (source?.startsWith('blob:') && !Object.values(FOLDER_DATA).flat().some(file => file.thumb === source)) URL.revokeObjectURL(source);
    }));
    const changedFiles = records.some(record => [...record.addedNodes, ...record.removedNodes]
      .some(node => node instanceof Element && node.classList.contains('file-chip')));
    if (!changedFiles) return;
    const state = document.getElementById('search-composer').dataset.composerState;
    if (composerMergePlan && state !== 'share-complete') {
      cancelComposerMerge();
      return;
    }
    if (state === 'loading' || state === 'complete' || state === 'share-complete') return;
    if (!chips.querySelector('.file-chip')) {
      renderComposerZeroState();
    } else if (input.value.trim()) renderComposerQuery(input.value.trim());
  }).observe(chips, { childList: true });
  new MutationObserver(records => {
    const opened = composer.classList.contains('open')
      && records.some(record => !(record.oldValue || '').split(/\s+/).includes('open'));
    if (opened && !chips.querySelector('.file-chip') && !input.value.trim()
      && !['loading', 'complete', 'share-sending', 'share-complete'].includes(composer.dataset.composerState)) {
      renderComposerZeroState();
    }
  }).observe(composer, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  new ResizeObserver(() => trimComposerChips()).observe(document.querySelector('.composer-chat-area'));
}
