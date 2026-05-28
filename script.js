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
let appSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { soonDays: 1, soonType: 'days' };

const elements = {
    board: document.getElementById('board'),
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
    taskDescription: document.getElementById('taskDescription'),
    taskDeadline: document.getElementById('taskDeadline'),
    submitTaskBtn: document.getElementById('submitTaskBtn'),
    titleError: document.getElementById('titleError'),
    deadlineError: document.getElementById('deadlineError'),
    descriptionCounter: document.getElementById('descriptionCounter'),
    searchInput: document.getElementById('searchInput'),
    statusFilter: document.getElementById('statusFilter'),
    categoryFilter: document.getElementById('categoryFilter'),
    titleSortToggle: document.getElementById('titleSortToggle'),
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
    soonDaysInput: document.getElementById('soonDaysInput')
};

let appliedFilters = { search: '', status: 'Все', category: 'Все', sortByTitle: false };

function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function getFutureDateTime(days) {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
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
    elements.listCategory.innerHTML = '';
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
    renderBoard();
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
        elements.listCategory.value = activeCategory !== 'Все' ? activeCategory : categories[0];
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
        elements.taskDescription.value = task.description;
        elements.taskDeadline.value = task.deadline;
    } else {
        document.getElementById('taskModalTitle').textContent = 'Новая задача';
        elements.taskForm.reset();
        elements.taskId.value = '';
        elements.taskListId.value = listId;
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
    return new Date(dateString).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function getVisibleLists() {
    const search = appliedFilters.search.toLowerCase().trim();
    const status = appliedFilters.status;
    const filterCategory = appliedFilters.category;

    const filteredLists = lists
        .filter(list => activeCategory === 'Все' || list.category === activeCategory)
        .filter(list => filterCategory === 'Все' || list.category === filterCategory)
        .map(list => {
            const listMatchesSearch = [list.title, list.category].join(' ').toLowerCase().includes(search);

            const tasks = list.tasks.filter(task => {
                const taskMatchesSearch = [task.title, task.description].join(' ').toLowerCase().includes(search);
                const taskStatus = getDeadlineStatus(task);
                const matchesStatus = status === 'Все' ||
                    (status === 'active' && !task.done) ||
                    (status === 'done' && task.done) ||
                    (status === 'expired' && taskStatus === 'expired');

                return (listMatchesSearch || taskMatchesSearch || !search) && matchesStatus;
            });

            const hasActiveFilters = Boolean(search) || status !== 'Все';
            const shouldShow = hasActiveFilters
                ? tasks.length > 0 || (listMatchesSearch && status === 'Все')
                : true;

            return { ...list, tasks, shouldShow };
        })
        .filter(list => list.shouldShow);

    return sortLists(filteredLists);
}

function sortLists(sourceLists) {
    return [...sourceLists].sort((a, b) => {
        if (appliedFilters.sortByTitle) {
            return a.title.localeCompare(b.title, 'ru');
        }
        return 0;
    });
}

function sortTasks(tasks, mode = 'deadline') {
    const copy = [...tasks];
    if (mode === 'alpha') {
        return copy.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    }
    if (mode === 'reset') {
        return copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return copy.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
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

function renderBoard() {
    const visibleLists = getVisibleLists();
    elements.board.innerHTML = '';
    elements.emptyState.classList.toggle('is-visible', visibleLists.length === 0);

    visibleLists.forEach(list => {
        const node = elements.listTemplate.content.cloneNode(true);
        const column = node.querySelector('.list-column');
        node.querySelector('.list-title').innerHTML = `${list.title} <span class="task-count">${list.tasks.length}</span>`;
        node.querySelector('.list-category').textContent = list.category;
        const menuBtn = node.querySelector('.list-menu-btn');
        const menu = node.querySelector('.list-menu');
        menuBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            closeAllListMenus(menu);
            const isOpen = menu.classList.toggle('is-open');
            menuBtn.setAttribute('aria-expanded', String(isOpen));
        });
        node.querySelector('.edit-list').addEventListener('click', () => { closeAllListMenus(); openListModal(lists.find(item => item.id === list.id)); });
        node.querySelector('.delete-list').addEventListener('click', () => { closeAllListMenus(); deleteList(list.id); });
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
    node.querySelector('h4').textContent = task.title;
    node.querySelector('.task-description').textContent = task.description || 'Без описания';
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
    lists = lists.map(list => list.id === listId ? { ...list, tasks: list.tasks.map(task => task.id === taskId ? { ...task, done: !task.done } : task) } : list);
    saveLists();
    renderBoard();
}

function deleteTask(listId, taskId) {
    if (!confirm('Удалить задачу?')) return;
    lists = lists.map(list => list.id === listId ? { ...list, tasks: list.tasks.filter(task => task.id !== taskId) } : list);
    saveLists();
    renderBoard();
    showToast('Задача удалена');
}

function applyFilters() {
    appliedFilters = {
        search: elements.searchInput.value,
        status: elements.statusFilter.value,
        category: elements.categoryFilter.value,
        sortByTitle: elements.titleSortToggle.checked
    };
    renderBoard();
    elements.filtersPanel.classList.remove('is-open');
    elements.toggleFiltersBtn.setAttribute('aria-expanded', 'false');
}

function clearFilters() {
    activeCategory = 'Все';
    elements.searchInput.value = '';
    elements.statusFilter.value = 'Все';
    elements.categoryFilter.value = 'Все';
    elements.titleSortToggle.checked = false;
    appliedFilters = { search: '', status: 'Все', category: 'Все', sortByTitle: false };
    elements.currentCategoryTitle.textContent = 'Все списки';
    renderCategories();
    renderBoard();
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

function bindEvents() {
    elements.openListModal.addEventListener('click', () => openListModal());
    elements.listForm.addEventListener('submit', createOrUpdateList);
    elements.listTitle.addEventListener('input', validateListForm);
    elements.listCategory.addEventListener('change', validateListForm);
    document.querySelectorAll('[data-close-list-modal]').forEach(button => button.addEventListener('click', closeListModal));

    elements.taskForm.addEventListener('submit', createOrUpdateTask);
    [elements.taskTitle, elements.taskDeadline].forEach(field => {
        field.addEventListener('blur', validateTaskForm);
        field.addEventListener('input', validateTaskForm);
    });
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

    elements.searchInput.addEventListener('input', () => { appliedFilters.search = elements.searchInput.value; renderBoard(); });
    elements.applyFiltersBtn.addEventListener('click', applyFilters);
    document.addEventListener('click', () => { closeAllListMenus(); closeAllTaskMenus(); elements.profileHint.classList.remove('is-visible'); });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeListModal(); closeTaskModal(); closeSettings(); toggleSidebar(true);
            elements.filtersPanel.classList.remove('is-open');
            elements.toggleFiltersBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

initTheme();
initDeadlineSettings();
renderCategories();
loadUserProfile();
bindEvents();
renderBoard();


elements.soonTypeSelect.value = appSettings.soonType || 'days';

elements.soonTypeSelect.addEventListener('change', () => {
    appSettings.soonType = elements.soonTypeSelect.value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
});
