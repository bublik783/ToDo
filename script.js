'use strict';

const LISTS_KEY = 'todoListsV11';
const CATEGORY_KEY = 'todoCategoriesV11';
const SETTINGS_KEY = 'todoSettingsV16';
const API_URL = 'https://randomuser.me/api/?nat=us';
const defaultCategories = ['Учёба', 'Работа', 'Дом', 'Личное'];

let lists = JSON.parse(localStorage.getItem(LISTS_KEY)) || [];
let categories = JSON.parse(localStorage.getItem(CATEGORY_KEY)) || defaultCategories;
let activeCategory = 'Все';
let toastTimer = null;
let userProfile = { name: 'Rauf', email: 'Локальный профиль', photo: null };
let activeView = window.location.pathname.endsWith('calendar.html') ? 'calendar' : 'lists';
let appSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { soonDays: 1, soonType: 'days', deadlineFormat: 'full' };
if (!appSettings.deadlineFormat) appSettings.deadlineFormat = 'full';

const elements = {
    board: document.getElementById('board'),
    calendarView: document.getElementById('calendarView'),
    viewButtons: document.querySelectorAll('[data-view-link]'),
    emptyState: document.getElementById('emptyState'),
    listTemplate: document.getElementById('listTemplate'),
    taskTemplate: document.getElementById('taskTemplate'),
    listModal: document.getElementById('listModal'),
    listForm: document.getElementById('listForm'),
    listId: document.getElementById('listId'),
    listTitle: document.getElementById('listTitle'),
    listCategory: document.getElementById('listCategory'),
    submitListBtn: document.getElementById('submitListBtn'),
    listTitleError: document.getElementById('listTitleError'),
    listCategoryError: document.getElementById('listCategoryError'),
    taskModal: document.getElementById('taskModal'),
    taskForm: document.getElementById('taskForm'),
    taskId: document.getElementById('taskId'),
    taskListId: document.getElementById('taskListId'),
    taskTitle: document.getElementById('taskTitle'),
    taskTag: document.getElementById('taskTag'),
    taskDescription: document.getElementById('taskDescription'),
    taskDeadline: document.getElementById('taskDeadline'),
    submitTaskBtn: document.getElementById('submitTaskBtn'),
    titleError: document.getElementById('titleError'),
    deadlineError: document.getElementById('deadlineError'),
    descriptionCounter: document.getElementById('descriptionCounter'),
    searchInput: document.getElementById('searchInput'),
    statusFilter: document.getElementById('statusFilter'),
    sortFilter: document.getElementById('sortFilter'),
    userCard: document.getElementById('userCard'),
    apiError: document.getElementById('apiError'),
    menuBtn: document.getElementById('menuBtn'),
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    currentCategoryTitle: document.getElementById('currentCategoryTitle'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    toast: document.getElementById('toast'),
    categoryNav: document.getElementById('categoryNav'),
    categoryForm: document.getElementById('categoryForm'),
    newCategoryInput: document.getElementById('newCategoryInput'),
    categoryError: document.getElementById('categoryError'),
    toggleFiltersBtn: document.getElementById('toggleFiltersBtn'),
    filtersPanel: document.getElementById('filtersPanel'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    settingsProfilePhoto: document.getElementById('settingsProfilePhoto'),
    settingsProfileName: document.getElementById('settingsProfileName'),
    settingsProfileEmail: document.getElementById('settingsProfileEmail'),
    openListModal: document.getElementById('openListModal'),
    applyFiltersBtn: document.getElementById('applyFiltersBtn'),
    profileHint: document.getElementById('profileHint'),
    soonDaysInput: document.getElementById('soonDaysInput'),
    deadlineFormatButtons: document.querySelectorAll('[data-deadline-format]')
};

let appliedFilters = { search: '', status: 'Все', sortMode: 'default' };

function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function getFutureDateTime(days) {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
}

function normalizeTag(value) {
    return value
        .trim()
        .replace(/^#+/, '')
        .replace(/\s+/g, '-')
        .replace(/[^А-Яа-яЁёA-Za-z0-9_-]/g, '')
        .toLowerCase();
}

function truncateText(text, maxLength = 17) {
    const value = String(text || '').trim();
    return value.length > maxLength ? value.slice(0, maxLength) + '...' : value;
}

function countActiveTasks(tasks) {
    return tasks.filter(task => !task.done).length;
}

function saveLists() { localStorage.setItem(LISTS_KEY, JSON.stringify(lists)); }
function saveCategories() { localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories)); }
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings)); }

function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add('is-visible');
    toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 2200);
}

function renderCategories() {
    elements.categoryNav.innerHTML = '';
    elements.categoryNav.appendChild(createCategoryRow('Все', true));
    categories.forEach(category => elements.categoryNav.appendChild(createCategoryRow(category, false)));
    renderListCategoryOptions();
    renderFilterCategoryOptions();
}

function renderFilterCategoryOptions() {
    if (!elements.categoryFilter) return;
    const current = elements.categoryFilter.value || appliedFilters.category || 'Все';
    elements.categoryFilter.innerHTML = '<option value="Все">Все категории</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        elements.categoryFilter.appendChild(option);
    });
    elements.categoryFilter.value = categories.includes(current) ? current : 'Все';
}


function createCategoryRow(category, isSystem) {
    const row = document.createElement('div');
    row.className = 'category-row';

    const button = document.createElement('button');
    button.className = 'category-btn';
    button.type = 'button';
    button.dataset.category = category;
    button.textContent = category === 'Все' ? 'Все списки' : category;
    button.classList.toggle('active', activeCategory === category);
    button.addEventListener('click', () => selectCategory(category));

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-category';
    deleteButton.type = 'button';
    deleteButton.innerHTML = '<img src="assets/trash.png" alt="">';
    deleteButton.disabled = isSystem;
    deleteButton.title = `Удалить категорию ${category}`;
    deleteButton.addEventListener('click', event => {
        event.stopPropagation();
        deleteCategory(category);
    });

    row.append(button, deleteButton);
    return row;
}

function renderListCategoryOptions() {
    elements.listCategory.innerHTML = '<option value="">Выберите категорию</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        elements.listCategory.appendChild(option);
    });
}

function selectCategory(category) {
    activeCategory = category;
    elements.currentCategoryTitle.textContent = category === 'Все' ? 'Все списки' : category;
    document.querySelectorAll('.category-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.category === category);
    });
    toggleSidebar(true);
    if (activeView === 'calendar') {
        renderCalendar();
    } else {
        renderBoard();
    }
}

function addCategory(event) {
    event.preventDefault();
    const value = elements.newCategoryInput.value.trim();
    elements.categoryError.textContent = '';
    if (!value) {
        elements.categoryError.textContent = 'Введите название категории.';
        return;
    }
    const exists = categories.some(category => category.toLowerCase() === value.toLowerCase());
    if (exists || value.toLowerCase() === 'все') {
        elements.categoryError.textContent = 'Такая категория уже есть.';
        return;
    }
    categories.push(value);
    saveCategories();
    elements.newCategoryInput.value = '';
    renderCategories();
    showToast('Категория добавлена');
}

function deleteCategory(category) {
    const hasLists = lists.some(list => list.category === category);
    const message = hasLists
        ? `Удалить категорию «${category}»? Все списки и задачи из этой категории тоже удалятся.`
        : `Удалить категорию «${category}»?`;
    if (!confirm(message)) return;
    categories = categories.filter(item => item !== category);
    lists = lists.filter(list => list.category !== category);
    if (activeCategory === category) activeCategory = 'Все';
    saveCategories();
    saveLists();
    renderCategories();
    selectCategory(activeCategory);
    showToast('Категория удалена');
}

function openListModal(list = null) {
    elements.listModal.classList.add('is-open');
    elements.listModal.setAttribute('aria-hidden', 'false');
    if (list) {
        document.getElementById('listModalTitle').textContent = 'Редактировать список';
        elements.listId.value = list.id;
        elements.listTitle.value = list.title;
        elements.listCategory.value = list.category;
    } else {
        document.getElementById('listModalTitle').textContent = 'Новый список';
        elements.listForm.reset();
        elements.listId.value = '';
        elements.listCategory.value = activeCategory !== 'Все' ? activeCategory : '';
    }
    validateListForm();
    elements.listTitle.focus();
}

function closeListModal() {
    elements.listModal.classList.remove('is-open');
    elements.listModal.setAttribute('aria-hidden', 'true');
}

function validateListForm() {
    let valid = true;
    elements.listTitle.classList.remove('invalid');
    elements.listCategory.classList.remove('invalid');
    elements.listTitleError.textContent = '';
    elements.listCategoryError.textContent = '';
    if (!elements.listTitle.value.trim()) {
        elements.listTitle.classList.add('invalid');
        elements.listTitleError.textContent = 'Введите название списка.';
        valid = false;
    }
    if (!elements.listCategory.value) {
        elements.listCategory.classList.add('invalid');
        elements.listCategoryError.textContent = 'Выберите категорию.';
        valid = false;
    }
    elements.submitListBtn.disabled = !valid;
    return valid;
}

function createOrUpdateList(event) {
    event.preventDefault();
    if (!validateListForm()) return;
    const data = { title: elements.listTitle.value.trim(), category: elements.listCategory.value };
    if (elements.listId.value) {
        lists = lists.map(list => list.id === elements.listId.value ? { ...list, ...data } : list);
        showToast('Список обновлён');
    } else {
        lists.unshift({ id: uid(), ...data, tasks: [], createdAt: Date.now() });
        showToast('Список создан');
    }
    saveLists();
    closeListModal();
    renderBoard();
}

function deleteList(id) {
    const list = lists.find(item => item.id === id);
    if (!list) return;
    if (!confirm(`Удалить список «${list.title}»? Все задачи внутри него тоже удалятся.`)) return;
    lists = lists.filter(item => item.id !== id);
    saveLists();
    renderBoard();
    showToast('Список удалён');
}

function openTaskModal(listId, task = null) {
    elements.taskModal.classList.add('is-open');
    elements.taskModal.setAttribute('aria-hidden', 'false');
    elements.taskListId.value = listId;
    if (task) {
        document.getElementById('taskModalTitle').textContent = 'Редактировать задачу';
        elements.taskId.value = task.id;
        elements.taskTitle.value = task.title;
        if (elements.taskTag) elements.taskTag.value = task.tag || '';
        elements.taskDescription.value = task.description;
        elements.taskDeadline.value = task.deadline;
    } else {
        document.getElementById('taskModalTitle').textContent = 'Новая задача';
        elements.taskForm.reset();
        elements.taskId.value = '';
        elements.taskListId.value = listId;
        if (elements.taskTag) elements.taskTag.value = '';
        elements.taskDeadline.value = getFutureDateTime(1);
    }
    elements.descriptionCounter.textContent = elements.taskDescription.value.length;
    validateTaskForm();
    elements.taskTitle.focus();
}

function closeTaskModal() {
    elements.taskModal.classList.remove('is-open');
    elements.taskModal.setAttribute('aria-hidden', 'true');
}

function getDeadlineStatus(task) {
    if (task.done) return 'done';
    const diff = new Date(task.deadline) - new Date();
    if (diff < 0) return 'expired';
    const soonLimit = Math.max(1, Number(appSettings.soonDays) || 1) * 24 * 60 * 60 * 1000;
    if (diff <= soonLimit) return 'soon';
    return 'normal';
}

function getDeadlineText(task) {
    const status = getDeadlineStatus(task);
    if (status === 'done') return 'Выполнено';
    if (status === 'expired') return 'Просрочено';
    if (status === 'soon') return 'Скоро';
    return 'В срок';
}

function formatDate(dateString) {
    const date = new Date(dateString);

    if (appSettings.deadlineFormat === 'short') {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short'
        });
    }

    return date.toLocaleString('ru-RU', {
        day:'2-digit',
        month:'2-digit',
        year:'numeric',
        hour:'2-digit',
        minute:'2-digit'
    });
}

function getListNearestDeadline(list) {
    if (!list.tasks || list.tasks.length === 0) return Infinity;

    const deadlines = list.tasks
        .filter(task => task.deadline)
        .map(task => new Date(task.deadline).getTime())
        .filter(time => Number.isFinite(time));

    return deadlines.length ? Math.min(...deadlines) : Infinity;
}

function getVisibleLists() {
    const search = appliedFilters.search.toLowerCase().trim();
    const status = appliedFilters.status;
    const sortMode = appliedFilters.sortMode;

    const filteredLists = lists
        .filter(list => activeCategory === 'Все' || list.category === activeCategory)
        .map(list => {
            const listMatchesSearch = [list.title, list.category].join(' ').toLowerCase().includes(search);

            let tasks = list.tasks.filter(task => {
                const taskMatchesSearch = [task.title, task.description, task.tag].join(' ').toLowerCase().includes(search);
                const taskStatus = getDeadlineStatus(task);
                const matchesStatus = status === 'Все' ||
                    (status === 'active' && !task.done) ||
                    (status === 'done' && task.done) ||
                    (status === 'expired' && taskStatus === 'expired');

                return (listMatchesSearch || taskMatchesSearch || !search) && matchesStatus;
            });

            tasks = sortTasks(tasks, sortMode);

            const hasActiveFilters = Boolean(search) || status !== 'Все';
            const sortIsEnabled = sortMode !== 'default';
            const shouldHideEmptyBySort = sortIsEnabled && tasks.length === 0;

            const shouldShow = hasActiveFilters
                ? tasks.length > 0 || (listMatchesSearch && status === 'Все' && !shouldHideEmptyBySort)
                : !shouldHideEmptyBySort;

            return { ...list, tasks, shouldShow };
        })
        .filter(list => list.shouldShow);

    return sortLists(filteredLists, sortMode);
}

function sortLists(sourceLists, mode = 'default') {
    const copy = [...sourceLists];

    if (mode === 'title') {
        return copy.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    }

    if (mode === 'created') {
        return copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    if (mode === 'deadline') {
        return copy.sort((a, b) => getListNearestDeadline(a) - getListNearestDeadline(b));
    }

    return copy;
}

function sortTasks(tasks, mode = 'default') {
    const copy = [...tasks];

    if (mode === 'title') {
        return copy.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    }

    if (mode === 'deadline') {
        return copy.sort((a, b) => {
            const first = new Date(a.deadline).getTime();
            const second = new Date(b.deadline).getTime();
            return (Number.isFinite(first) ? first : Infinity) - (Number.isFinite(second) ? second : Infinity);
        });
    }

    if (mode === 'created') {
        return copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    return copy;
}


function closeAllListMenus(exceptMenu = null) {
    document.querySelectorAll('.list-menu.is-open').forEach(menu => {
        if (menu !== exceptMenu) menu.classList.remove('is-open');
    });
    document.querySelectorAll('.list-menu-btn[aria-expanded="true"]').forEach(button => {
        if (!exceptMenu || !button.parentElement.contains(exceptMenu)) button.setAttribute('aria-expanded', 'false');
    });
}

function closeAllTaskMenus(exceptMenu = null) {
    document.querySelectorAll('.task-menu.is-open').forEach(menu => {
        if (menu !== exceptMenu) menu.classList.remove('is-open');
    });
    document.querySelectorAll('.task-menu-btn[aria-expanded="true"]').forEach(button => {
        if (!exceptMenu || !button.parentElement.contains(exceptMenu)) button.setAttribute('aria-expanded', 'false');
    });
}

function sortSingleList(listId, mode = 'deadline') {
    lists = lists.map(list => {
        if (list.id !== listId) return list;
        return { ...list, tasks: sortTasks(list.tasks, mode) };
    });
    saveLists();
    renderBoard();
    const messages = { deadline: 'Список отсортирован по сроку', alpha: 'Список отсортирован по алфавиту', reset: 'Сортировка списка сброшена' };
    showToast(messages[mode] || 'Список отсортирован');
}

function getAllVisibleTasks() {
    return getVisibleLists().flatMap(list => {
        return list.tasks.map(task => ({
            ...task,
            listId: list.id,
            listTitle: list.title,
            listCategory: list.category
        }));
    });
}

function getCalendarTasks() {
    const mode = appliedFilters.sortMode || 'default';
    const sortMode = mode === 'default' ? 'deadline' : mode;
    return sortTasks(getAllVisibleTasks(), sortMode);
}

function groupTasksByDate(tasks) {
    return tasks.reduce((groups, task) => {
        const key = task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : 'Без даты';
        if (!groups[key]) groups[key] = [];
        groups[key].push(task);
        return groups;
    }, {});
}

function formatCalendarDate(dateKey) {
    if (dateKey === 'Без даты') return dateKey;

    const today = new Date();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const todayKey = today.toISOString().slice(0, 10);
    const tomorrowKey = tomorrow.toISOString().slice(0, 10);

    if (dateKey === todayKey) return 'Сегодня';
    if (dateKey === tomorrowKey) return 'Завтра';

    return new Date(dateKey).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function closeAllCalendarTaskMenus(exceptMenu = null) {
    document.querySelectorAll('.calendar-task-menu.is-open').forEach(menu => {
        if (menu !== exceptMenu) menu.classList.remove('is-open');
    });

    document.querySelectorAll('.calendar-task-menu-btn[aria-expanded="true"]').forEach(button => {
        if (!exceptMenu || !button.parentElement.contains(exceptMenu)) {
            button.setAttribute('aria-expanded', 'false');
        }
    });
}

function renderCalendar() {
    if (!elements.calendarView) return;

    const tasks = getCalendarTasks();
    const grouped = groupTasksByDate(tasks);
    const dateKeys = Object.keys(grouped).sort((a, b) => {
        if (a === 'Без даты') return 1;
        if (b === 'Без даты') return -1;
        return new Date(a) - new Date(b);
    });

    elements.calendarView.innerHTML = '';

    if (dateKeys.length === 0) {
        elements.calendarView.innerHTML = `
            <div class="calendar-empty">
                <h3>В календаре пока нет задач</h3>
                <p>Создайте задачу с дедлайном или измените фильтр.</p>
            </div>
        `;
        return;
    }

    const track = document.createElement('div');
    track.className = 'calendar-track';

    dateKeys.forEach(dateKey => {
        const day = document.createElement('article');
        day.className = 'calendar-day-card';
        day.innerHTML = `
            <div class="calendar-day-card__head">
                <div>
                    <h3>${formatCalendarDate(dateKey)}</h3>
                    <p>${countActiveTasks(grouped[dateKey])} активн.</p>
                </div>
            </div>
            <div class="calendar-day-card__tasks"></div>
        `;

        const taskBox = day.querySelector('.calendar-day-card__tasks');

        grouped[dateKey].forEach(task => {
            const item = document.createElement('article');
            item.className = `calendar-task-card ${getDeadlineStatus(task)} ${task.done ? 'done' : ''}`;
            item.innerHTML = `
                <label class="calendar-check" title="Отметить выполненной">
                    <input type="checkbox" ${task.done ? 'checked' : ''}>
                    <span></span>
                </label>
                <div class="calendar-task-card__content">
                    <div class="calendar-task-card__title">
                        <strong>${truncateText(task.title)}</strong>
                        ${task.tag ? `<span class="task-tag-badge">#${task.tag}</span>` : ''}
                    </div>
                    <p>${task.description ? truncateText(task.description) : 'Без описания'}</p>
                    <small>${task.listCategory} • ${task.listTitle} • ${formatDate(task.deadline)}</small>
                </div>
                <div class="calendar-task-actions">
                    <button class="icon-btn calendar-task-menu-btn" title="Действия с задачей" aria-expanded="false">
                        <img src="assets/dots.png" alt="">
                    </button>
                    <div class="calendar-task-menu">
                        <button type="button" class="calendar-edit-task">Редактировать</button>
                        <button type="button" class="calendar-delete-task danger-action">Удалить задачу</button>
                    </div>
                </div>
            `;

            const checkbox = item.querySelector('input');
            const menuBtn = item.querySelector('.calendar-task-menu-btn');
            const menu = item.querySelector('.calendar-task-menu');

            checkbox.addEventListener('change', () => {
                toggleDone(task.listId, task.id);
            });

            menuBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                closeAllCalendarTaskMenus(menu);
                const isOpen = menu.classList.toggle('is-open');
                menuBtn.setAttribute('aria-expanded', String(isOpen));
            });

            item.querySelector('.calendar-edit-task').addEventListener('click', () => {
                closeAllCalendarTaskMenus();
                openTaskModal(task.listId, lists.find(list => list.id === task.listId)?.tasks.find(item => item.id === task.id));
            });

            item.querySelector('.calendar-delete-task').addEventListener('click', () => {
                closeAllCalendarTaskMenus();
                deleteTask(task.listId, task.id);
            });

            taskBox.appendChild(item);
        });

        track.appendChild(day);
    });

    elements.calendarView.appendChild(track);
}

function setView(view) {
    activeView = view;

    elements.viewButtons.forEach(button => {
        button.classList.toggle('is-active', button.dataset.viewLink === view);
    });

    if (activeView === 'calendar') {
        renderCalendar();
    }
}

function renderBoard() {
    if (!elements.board) return;

    const visibleLists = getVisibleLists();
    elements.board.innerHTML = '';

    if (elements.emptyState) {
        elements.emptyState.classList.toggle('is-visible', visibleLists.length === 0);
    }

    visibleLists.forEach(list => {
        const node = elements.listTemplate.content.cloneNode(true);
        const column = node.querySelector('.list-column');

        node.querySelector('.list-title').innerHTML = `${truncateText(list.title)} <span class="task-count">${countActiveTasks(list.tasks)}</span>`;
        node.querySelector('.list-category').textContent = list.category;

        const menuBtn = node.querySelector('.list-menu-btn');
        const menu = node.querySelector('.list-menu');

        menuBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            closeAllListMenus(menu);
            const isOpen = menu.classList.toggle('is-open');
            menuBtn.setAttribute('aria-expanded', String(isOpen));
        });

        node.querySelector('.edit-list').addEventListener('click', () => {
            closeAllListMenus();
            openListModal(lists.find(item => item.id === list.id));
        });

        node.querySelector('.delete-list').addEventListener('click', () => {
            closeAllListMenus();
            deleteList(list.id);
        });

        const taskBox = node.querySelector('.list-tasks');
        const sortedTasks = list.tasks;

        if (sortedTasks.length === 0) {
            const emptyButton = document.createElement('button');
            emptyButton.type = 'button';
            emptyButton.className = 'empty-task-add';
            emptyButton.textContent = '+ Добавить задачу';
            emptyButton.addEventListener('click', () => openTaskModal(list.id));
            taskBox.appendChild(emptyButton);
        } else {
            sortedTasks.forEach(task => taskBox.appendChild(createTaskNode(list.id, task)));

            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.className = 'add-task-inline';
            addButton.textContent = '+ Добавить задачу';
            addButton.addEventListener('click', () => openTaskModal(list.id));
            taskBox.appendChild(addButton);
        }

        elements.board.appendChild(column);
    });
}

function createTaskNode(listId, task) {
    const node = elements.taskTemplate.content.cloneNode(true);
    const card = node.querySelector('.task-card');
    const status = getDeadlineStatus(task);
    card.classList.add(status);
    if (task.done) card.classList.add('done');
    node.querySelector('h4').textContent = truncateText(task.title);
    const tagBadge = node.querySelector('.task-tag-badge');
    if (tagBadge && task.tag) {
        tagBadge.textContent = `#${task.tag}`;
        tagBadge.hidden = false;
    } else if (tagBadge) {
        tagBadge.hidden = true;
    }
    node.querySelector('.task-description').textContent = task.description ? truncateText(task.description) : 'Без описания';
    node.querySelector('.task-done').checked = task.done;
    node.querySelector('.task-meta').innerHTML = `
        <span class="badge">${formatDate(task.deadline)}</span>
    `;
    const menuBtn = node.querySelector('.task-menu-btn');
    const menu = node.querySelector('.task-menu');
    menuBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        closeAllTaskMenus(menu);
        const isOpen = menu.classList.toggle('is-open');
        menuBtn.setAttribute('aria-expanded', String(isOpen));
    });
    node.querySelector('.task-done').addEventListener('change', () => toggleDone(listId, task.id));
    node.querySelector('.edit-task').addEventListener('click', () => { closeAllTaskMenus(); openTaskModal(listId, task); });
    node.querySelector('.delete-task').addEventListener('click', () => { closeAllTaskMenus(); deleteTask(listId, task.id); });
    return node;
}

function validateTaskForm() {
    let valid = true;
    clearTaskErrors();
    if (!elements.taskTitle.value.trim()) {
        showError(elements.taskTitle, elements.titleError, 'Введите название задачи.');
        valid = false;
    }
    const isEditing = Boolean(elements.taskId.value);
    if (!elements.taskDeadline.value) {
        showError(elements.taskDeadline, elements.deadlineError, 'Укажите дедлайн.');
        valid = false;
    } else if (!isEditing && new Date(elements.taskDeadline.value) < new Date()) {
        showError(elements.taskDeadline, elements.deadlineError, 'Дедлайн не может быть раньше текущего момента.');
        valid = false;
    }
    elements.submitTaskBtn.disabled = !valid;
    return valid;
}

function clearTaskErrors() {
    [elements.taskTitle, elements.taskDeadline].forEach(field => field.classList.remove('invalid'));
    [elements.titleError, elements.deadlineError].forEach(error => error.textContent = '');
}

function showError(field, errorElement, message) {
    field.classList.add('invalid');
    errorElement.textContent = message;
}

function createOrUpdateTask(event) {
    event.preventDefault();
    if (!validateTaskForm()) return;
    const listId = elements.taskListId.value;
    const data = {
        title: elements.taskTitle.value.trim(),
        tag: elements.taskTag ? normalizeTag(elements.taskTag.value) : '',
        description: elements.taskDescription.value.trim(),
        deadline: elements.taskDeadline.value
    };
    lists = lists.map(list => {
        if (list.id !== listId) return list;
        if (elements.taskId.value) {
            return { ...list, tasks: list.tasks.map(task => task.id === elements.taskId.value ? { ...task, ...data } : task) };
        }
        return { ...list, tasks: [{ id: uid(), ...data, done: false, createdAt: Date.now() }, ...list.tasks] };
    });
    saveLists();
    closeTaskModal();
    renderBoard();
    showToast(elements.taskId.value ? 'Задача обновлена' : 'Задача добавлена');
}

function toggleDone(listId, taskId) {
    lists = lists.map(list => list.id === listId ? {
        ...list,
        tasks: list.tasks.map(task => task.id === taskId ? { ...task, done: !task.done } : task)
    } : list);

    saveLists();

    if (activeView === 'calendar') {
        renderCalendar();
    } else {
        renderBoard();
    }
}

function deleteTask(listId, taskId) {
    if (!confirm('Удалить задачу?')) return;

    lists = lists.map(list => list.id === listId ? {
        ...list,
        tasks: list.tasks.filter(task => task.id !== taskId)
    } : list);

    saveLists();

    if (activeView === 'calendar') {
        renderCalendar();
    } else {
        renderBoard();
    }

    showToast('Задача удалена');
}

function applyFilters() {
    appliedFilters = {
        search: elements.searchInput.value,
        status: elements.statusFilter.value,
        sortMode: elements.sortFilter.value
    };

    if (activeView === 'calendar') {
        renderCalendar();
    } else {
        renderBoard();
    }

    elements.filtersPanel.classList.remove('is-open');
    elements.toggleFiltersBtn.setAttribute('aria-expanded', 'false');
}

function clearFilters() {
    activeCategory = 'Все';
    elements.searchInput.value = '';
    elements.statusFilter.value = 'Все';
    elements.sortFilter.value = 'default';
    appliedFilters = { search: '', status: 'Все', sortMode: 'default' };
    elements.currentCategoryTitle.textContent = 'Все списки';
    renderCategories();

    if (activeView === 'calendar') {
        renderCalendar();
    } else {
        renderBoard();
    }
}

function renderProfile() {
    if (userProfile.photo) {
        elements.userCard.innerHTML = `<img src="${userProfile.photo}" alt="Аватар пользователя">`;
        elements.settingsProfilePhoto.innerHTML = `<img src="${userProfile.photo}" alt="Аватар пользователя">`;
    } else {
        elements.userCard.innerHTML = '<div class="avatar">R</div>';
        elements.settingsProfilePhoto.innerHTML = '<div class="avatar">R</div>';
    }
    elements.settingsProfileName.textContent = userProfile.name;
    elements.settingsProfileEmail.textContent = userProfile.email;
}

function initDeadlineSettings() {
    if (!elements.soonDaysInput) return;
    elements.soonDaysInput.value = appSettings.soonDays;
}

function updateDeadlineSettings() {
    if (!elements.soonDaysInput) return;
    const value = Number(elements.soonDaysInput.value);
    if (!Number.isFinite(value) || value < 1) {
        elements.soonDaysInput.value = appSettings.soonDays;
        showToast('Жёлтый срок должен быть не меньше 1 дня');
        return;
    }
    appSettings.soonDays = Math.min(30, Math.floor(value));
    elements.soonDaysInput.value = appSettings.soonDays;
    saveSettings();
    renderBoard();
    showToast('Настройки сроков сохранены');
}

function applyDeadlineFormat(format) {
    appSettings.deadlineFormat = format;
    saveSettings();

    elements.deadlineFormatButtons.forEach(button => {
        button.classList.toggle('is-active', button.dataset.deadlineFormat === format);
    });

    renderBoard();
}

function initDeadlineFormat() {
    if (!elements.deadlineFormatButtons) return;

    elements.deadlineFormatButtons.forEach(button => {
        button.classList.toggle('is-active', button.dataset.deadlineFormat === appSettings.deadlineFormat);
        button.addEventListener('click', () => applyDeadlineFormat(button.dataset.deadlineFormat));
    });
}

function applyTheme(theme) {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    localStorage.setItem('todoTheme', theme);
    document.querySelectorAll('[data-theme]').forEach(button => button.classList.toggle('is-active', button.dataset.theme === theme));
}

function initTheme() { applyTheme(localStorage.getItem('todoTheme') || 'light'); }
function openSettings() { elements.settingsModal.classList.add('is-open'); elements.settingsModal.setAttribute('aria-hidden', 'false'); }
function closeSettings() { elements.settingsModal.classList.remove('is-open'); elements.settingsModal.setAttribute('aria-hidden', 'true'); }

async function loadUserProfile() {
    elements.apiError.textContent = '';
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Ошибка загрузки профиля');
        const data = await response.json();
        const user = data.results[0];
        userProfile = { name: `${user.name.first} ${user.name.last}`, email: user.email, photo: user.picture.medium };
    } catch (error) {
        userProfile = { name: 'Rauf', email: 'Локальный профиль', photo: null };
        elements.apiError.textContent = 'API недоступен, показан запасной профиль.';
    }
    renderProfile();
}

function toggleSidebar(forceClose = false) {
    const shouldOpen = forceClose ? false : !elements.sidebar.classList.contains('is-open');
    elements.sidebar.classList.toggle('is-open', shouldOpen);
    elements.sidebarBackdrop.classList.toggle('is-visible', shouldOpen);
}

function toggleFilters() {
    const isOpen = elements.filtersPanel.classList.toggle('is-open');
    elements.toggleFiltersBtn.setAttribute('aria-expanded', String(isOpen));
}

function initViewMode() {
    elements.viewButtons.forEach(button => {
        button.classList.toggle('is-active', button.dataset.viewLink === activeView);
    });
}

function bindEvents() {
    if (elements.openListModal) elements.openListModal.addEventListener('click', () => openListModal());
    elements.listForm.addEventListener('submit', createOrUpdateList);
    elements.listTitle.addEventListener('input', validateListForm);
    elements.listCategory.addEventListener('change', validateListForm);
    document.querySelectorAll('[data-close-list-modal]').forEach(button => button.addEventListener('click', closeListModal));

    elements.taskForm.addEventListener('submit', createOrUpdateTask);
    [elements.taskTitle, elements.taskDeadline].forEach(field => {
        field.addEventListener('blur', validateTaskForm);
        field.addEventListener('input', validateTaskForm);
    });
    if (elements.taskTag) {
        elements.taskTag.addEventListener('input', () => {
            elements.taskTag.value = normalizeTag(elements.taskTag.value);
        });
    }
    elements.taskDescription.addEventListener('input', () => elements.descriptionCounter.textContent = elements.taskDescription.value.length);
    document.querySelectorAll('[data-close-task-modal]').forEach(button => button.addEventListener('click', closeTaskModal));

    elements.clearFiltersBtn.addEventListener('click', clearFilters);
    elements.menuBtn.addEventListener('click', () => toggleSidebar());
    elements.sidebarBackdrop.addEventListener('click', () => toggleSidebar(true));
    elements.categoryForm.addEventListener('submit', addCategory);
    elements.toggleFiltersBtn.addEventListener('click', toggleFilters);
    elements.openSettingsBtn.addEventListener('click', openSettings);
    elements.userCard.addEventListener('click', (event) => {
        event.stopPropagation();
        elements.profileHint.classList.toggle('is-visible');
    });
    document.querySelectorAll('[data-close-settings]').forEach(button => button.addEventListener('click', closeSettings));
    document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => applyTheme(button.dataset.theme)));
    if (elements.soonDaysInput) elements.soonDaysInput.addEventListener('change', updateDeadlineSettings);

    elements.searchInput.addEventListener('input', () => {
        appliedFilters.search = elements.searchInput.value;
        if (activeView === 'calendar') {
            renderCalendar();
        } else {
            renderBoard();
        }
    });
    elements.applyFiltersBtn.addEventListener('click', applyFilters);
    document.addEventListener('click', () => { closeAllListMenus(); closeAllTaskMenus(); closeAllCalendarTaskMenus(); elements.profileHint.classList.remove('is-visible'); });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeListModal(); closeTaskModal(); closeSettings(); toggleSidebar(true);
            elements.filtersPanel.classList.remove('is-open');
            elements.toggleFiltersBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

initTheme();
initViewMode();
initDeadlineFormat();
initDeadlineSettings();
renderCategories();
loadUserProfile();
bindEvents();

if (activeView === 'calendar') {
    renderCalendar();
} else {
    renderBoard();
}
